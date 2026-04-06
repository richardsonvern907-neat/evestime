import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseEnvFile(contents) {
  const entries = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    entries[key] = value;
  }

  return entries;
}

async function loadLocalEnv() {
  for (const name of [".env.local", ".env.development.local"]) {
    const filePath = path.join(repoRoot, name);

    try {
      const contents = await readFile(filePath, "utf8");
      const parsed = parseEnvFile(contents);

      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }
}

function splitStatements(sqlText) {
  return sqlText
    .split(/;\s*(?:\r?\n|$)/g)
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function main() {
  await loadLocalEnv();

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running migrations.");
  }

  const sql = neon(connectionString);
  const migrationsDir = path.join(repoRoot, "db", "migrations");
  const migrationFiles = (await readdir(migrationsDir)).filter(name => name.endsWith(".sql")).sort();

  await sql.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );

  for (const migrationFile of migrationFiles) {
    const existing = await sql.query("SELECT name FROM schema_migrations WHERE name = $1", [migrationFile]);

    if (existing.length > 0) {
      console.log(`Skipping ${migrationFile}`);
      continue;
    }

    const migrationPath = path.join(migrationsDir, migrationFile);
    const statements = splitStatements(await readFile(migrationPath, "utf8"));

    console.log(`Applying ${migrationFile}`);

    for (const statement of statements) {
      await sql.query(statement);
    }

    await sql.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migrationFile]);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
