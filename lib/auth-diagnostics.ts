import { timingSafeEqual } from "node:crypto";

import { sql } from "@/lib/db";
import { getFirstEnv } from "@/lib/env";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isDiagnosticsAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const expectedToken = process.env.AUTH_DIAGNOSTICS_TOKEN?.trim();

  if (!expectedToken) {
    return false;
  }

  const providedToken = request.headers.get("x-auth-diagnostics-token")?.trim();

  if (!providedToken) {
    return false;
  }

  return safeEqual(expectedToken, providedToken);
}

export async function getAuthDiagnostics() {
  const authSecretSource = getFirstEnv(["NEXTAUTH_SECRET", "AUTH_SECRET"]) ? "configured" : null;
  const dbEnvSource =
    process.env.NODE_ENV !== "production"
      ? getFirstEnv([
          "DATABASE_URL_UNPOOLED",
          "POSTGRES_URL_NON_POOLING",
          "DATABASE_URL",
          "POSTGRES_URL",
        ])
        ? "configured"
        : null
      : getFirstEnv(["DATABASE_URL", "POSTGRES_URL"])
        ? "configured"
        : null;

  let databaseReachable = false;
  let usersTableReachable = false;
  let accountsTableReachable = false;
  let transactionsTableReachable = false;
  let diagnosticError: string | null = null;

  try {
    await sql`SELECT 1`;
    databaseReachable = true;

    const tables = await sql`
      SELECT
        to_regclass('public.users')::text AS users_table,
        to_regclass('public.accounts')::text AS accounts_table,
        to_regclass('public.transactions')::text AS transactions_table
    `;

    const tableInfo = tables[0] as
      | {
          users_table: string | null;
          accounts_table: string | null;
          transactions_table: string | null;
        }
      | undefined;

    usersTableReachable = Boolean(tableInfo?.users_table);
    accountsTableReachable = Boolean(tableInfo?.accounts_table);
    transactionsTableReachable = Boolean(tableInfo?.transactions_table);
  } catch (error) {
    diagnosticError = error instanceof Error ? error.message : "Unknown database error";
  }

  return {
    status:
      authSecretSource && dbEnvSource && databaseReachable && usersTableReachable ? "ok" : "degraded",
    checks: {
      authSecretConfigured: Boolean(authSecretSource),
      dbEnvConfigured: Boolean(dbEnvSource),
      databaseReachable,
      usersTableReachable,
      accountsTableReachable,
      transactionsTableReachable,
    },
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      authRouteRuntime: "nodejs",
      productionDiagnosticsBlockedByDefault: process.env.NODE_ENV === "production",
    },
    hints: {
      loginFailureStage:
        !authSecretSource
          ? "auth_config"
          : !dbEnvSource
            ? "db_config"
            : !databaseReachable || !usersTableReachable
              ? "credentials_lookup"
              : !accountsTableReachable || !transactionsTableReachable
                ? "post_login_dashboard"
                : "credentials_or_user_data",
    },
    errors: {
      database: diagnosticError,
    },
  };
}
