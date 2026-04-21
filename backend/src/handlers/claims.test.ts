import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type DB } from "../db";
import { insertClaim } from "./claims";

describe("insertClaim", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("inserts a claim row", () => {
    insertClaim(db, "0xtxhash1", 0, 1, "0xuser", "5000000", 400, 1_700_700_000);
    const row = db
      .prepare("SELECT * FROM claims WHERE tx_hash = '0xtxhash1' AND log_index = 0")
      .get() as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(row!.market_id).toBe(1);
    expect(row!.user_addr).toBe("0xuser");
    expect(row!.amount).toBe("5000000");
    expect(row!.block_number).toBe(400);
    expect(row!.timestamp).toBe(1_700_700_000);
  });

  it("replaces on conflict (same tx_hash + log_index)", () => {
    insertClaim(db, "0xtxhash1", 0, 1, "0xuser", "5000000", 400, 1_700_700_000);
    insertClaim(db, "0xtxhash1", 0, 1, "0xuser", "9999999", 401, 1_700_800_000);
    const rows = db.prepare("SELECT * FROM claims").all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).amount).toBe("9999999");
  });

  it("allows multiple claims with same tx hash and different log indexes", () => {
    insertClaim(db, "0xtxhash1", 0, 1, "0xuser", "1000000", 400, 0);
    insertClaim(db, "0xtxhash1", 1, 2, "0xuser", "2000000", 400, 0);
    const rows = db.prepare("SELECT * FROM claims WHERE tx_hash = '0xtxhash1'").all();
    expect(rows).toHaveLength(2);
  });

  it("allows multiple claims with different tx hashes", () => {
    insertClaim(db, "0xtx1", 0, 1, "0xuser1", "1000000", 400, 0);
    insertClaim(db, "0xtx2", 0, 1, "0xuser2", "2000000", 401, 0);
    const rows = db.prepare("SELECT * FROM claims ORDER BY tx_hash").all();
    expect(rows).toHaveLength(2);
  });

  it("allows claims from different markets", () => {
    insertClaim(db, "0xtx1", 0, 1, "0xuser", "1000000", 400, 0);
    insertClaim(db, "0xtx2", 0, 2, "0xuser", "2000000", 401, 0);
    const rows = db.prepare("SELECT * FROM claims").all();
    expect(rows).toHaveLength(2);
  });

  it("indexes by user_addr", () => {
    insertClaim(db, "0xtx1", 0, 1, "0xuser", "1000000", 400, 0);
    insertClaim(db, "0xtx2", 0, 2, "0xuser", "2000000", 401, 0);
    const rows = db
      .prepare("SELECT * FROM claims WHERE user_addr = '0xuser'")
      .all();
    expect(rows).toHaveLength(2);
  });
});
