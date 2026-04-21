import { describe, it, expect, beforeEach } from "vitest";
import { openDb, getLastIndexedBlock, setLastIndexedBlock, type DB } from "./db";

describe("openDb", () => {
  it("creates all required tables", () => {
    const db = openDb(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("meta");
    expect(names).toContain("markets");
    expect(names).toContain("pool_snapshots");
    expect(names).toContain("trades");
    expect(names).toContain("resolutions");
    expect(names).toContain("claims");
  });

  it("enables WAL journal mode", () => {
    const db = openDb(":memory:");
    const row = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    expect(row.journal_mode).toBe("memory");
  });

  it("enables foreign keys", () => {
    const db = openDb(":memory:");
    const row = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    expect(row.foreign_keys).toBe(1);
  });

  it("is idempotent — calling twice on same path does not throw", () => {
    expect(() => {
      openDb(":memory:");
      openDb(":memory:");
    }).not.toThrow();
  });
});

describe("getLastIndexedBlock", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("returns 0n when no row exists", () => {
    expect(getLastIndexedBlock(db)).toBe(0n);
  });

  it("returns the stored block number after set", () => {
    setLastIndexedBlock(db, 12345n);
    expect(getLastIndexedBlock(db)).toBe(12345n);
  });

  it("handles large block numbers (bigint)", () => {
    const large = 999_999_999_999n;
    setLastIndexedBlock(db, large);
    expect(getLastIndexedBlock(db)).toBe(large);
  });
});

describe("setLastIndexedBlock", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("inserts a new row", () => {
    setLastIndexedBlock(db, 100n);
    const row = db
      .prepare("SELECT value FROM meta WHERE key = 'last_indexed_block'")
      .get() as { value: string } | undefined;
    expect(row?.value).toBe("100");
  });

  it("replaces the existing row on subsequent calls", () => {
    setLastIndexedBlock(db, 100n);
    setLastIndexedBlock(db, 200n);
    expect(getLastIndexedBlock(db)).toBe(200n);

    const rows = db
      .prepare("SELECT * FROM meta WHERE key = 'last_indexed_block'")
      .all();
    expect(rows).toHaveLength(1);
  });
});
