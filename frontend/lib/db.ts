import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

let _db: Database.Database | null = null;

// Default resolves to <repo>/data/app.db when running `npm run dev` from
// frontend/ — the same file the backend indexer writes by default.
// In Docker, compose sets DATABASE_PATH to /data/app.db.
const DEFAULT_DB_PATH = "../data/app.db";

export function getDb(): Database.Database {
  if (_db) return _db;
  const path = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
  if (!existsSync(path)) {
    throw new Error(
      `SQLite database not found at ${resolve(path)}. ` +
        `Start the indexer first (cd backend && npm run dev) or set DATABASE_PATH.`
    );
  }
  _db = new Database(path, { readonly: true });
  _db.pragma("journal_mode = WAL");
  return _db;
}
