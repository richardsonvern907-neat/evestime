import { auth } from "@/auth";
import { sql } from "@/lib/db";

export type AuthenticatedSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type StaffRole = "admin" | "advisor";
export type StaffSession = Awaited<ReturnType<typeof requireStaffRoles>>;

export async function requireAuthenticatedSession(): Promise<AuthenticatedSession> {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("UNAUTHORIZED");
  }

  const users = await sql`
    SELECT id, email, name
    FROM users
    WHERE email = ${session.user.email.toLowerCase()}
    LIMIT 1
  `;

  const user = users[0] as
    | {
        id: string | number;
        email: string;
        name: string | null;
      }
    | undefined;

  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    user: {
      id: String(user.id),
      email: user.email,
      name: user.name ?? session.user.name ?? null,
    },
  };
}

export async function requireStaffRoles(allowedRoles: readonly StaffRole[]) {
  const session = await requireAuthenticatedSession();
  const roles = await sql`
    SELECT role
    FROM user_roles
    WHERE user_id = ${session.user.id}
  `;

  const normalizedRoles = roles
    .map(row => row.role)
    .filter((role): role is StaffRole => role === "admin" || role === "advisor");

  if (!normalizedRoles.some(role => allowedRoles.includes(role))) {
    throw new Error("FORBIDDEN");
  }

  return {
    ...session,
    roles: normalizedRoles,
  };
}

export function hasRole(session: { roles: StaffRole[] }, role: StaffRole) {
  return session.roles.includes(role);
}

export function ensureLeadAccess(input: {
  session: { user: { id: string }; roles: StaffRole[] };
  leadAssignedAdvisorId: string | null;
}) {
  if (hasRole(input.session, "admin")) {
    return;
  }

  if (hasRole(input.session, "advisor") && input.leadAssignedAdvisorId === input.session.user.id) {
    return;
  }

  throw new Error("FORBIDDEN");
}
