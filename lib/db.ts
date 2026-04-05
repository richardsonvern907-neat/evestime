import { neon } from "@neondatabase/serverless";

import { requireEnv } from "./env";

const connectionString =
  process.env.NODE_ENV !== "production" && process.env.DATABASE_URL_UNPOOLED
    ? process.env.DATABASE_URL_UNPOOLED
    : requireEnv("DATABASE_URL");

export const sql = neon(connectionString, {
  fetchOptions: {
    signal: AbortSignal.timeout(10000),
  },
});
