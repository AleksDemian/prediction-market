import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";

export type DB = Database.Database;

export function openDb(path: string): DB {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  migrateClaimsTable(db);

  return db;
}

function migrateClaimsTable(db: DB): void {
  const cols = db
    .prepare("PRAGMA table_info(claims)")
    .all() as Array<{ name: string }>;
  if (cols.length === 0) return;

  const hasLogIndex = cols.some((c) => c.name === "log_index");
  if (hasLogIndex) return;

  db.exec(`
    BEGIN;
    ALTER TABLE claims RENAME TO claims_old;
    CREATE TABLE claims (
      tx_hash      TEXT    NOT NULL,
      log_index    INTEGER NOT NULL,
      market_id    INTEGER NOT NULL,
      user_addr    TEXT    NOT NULL,
      amount       TEXT    NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp    INTEGER NOT NULL,
      PRIMARY KEY (tx_hash, log_index)
    );
    INSERT INTO claims (tx_hash, log_index, market_id, user_addr, amount, block_number, timestamp)
      SELECT tx_hash, 0, market_id, user_addr, CAST(amount AS TEXT), block_number, timestamp
      FROM claims_old;
    DROP TABLE claims_old;
    CREATE INDEX IF NOT EXISTS idx_claims_market ON claims (market_id);
    CREATE INDEX IF NOT EXISTS idx_claims_user   ON claims (user_addr);
    COMMIT;
  `);
}

export function getLastIndexedBlock(db: DB): bigint {
  const row = db
    .prepare("SELECT value FROM meta WHERE key = 'last_indexed_block'")
    .get() as { value: string } | undefined;
  return row ? BigInt(row.value) : 0n;
}

export function setLastIndexedBlock(db: DB, block: bigint): void {
  db.prepare(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('last_indexed_block', ?)"
  ).run(block.toString());
}
