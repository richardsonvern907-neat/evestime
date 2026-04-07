import { neon } from "@neondatabase/serverless";

import { requireAnyEnv } from "./env";

const connectionString = requireAnyEnv(["DATABASE_URL", "POSTGRES_URL"]);

export const sql = neon(connectionString, {
  fetchOptions: {
    signal: AbortSignal.timeout(45000),
  },
});
