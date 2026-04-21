import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type DB } from "../db";
import { upsertMarket } from "./markets";
import { insertResolution } from "./resolutions";

const MARKET = {
  id: 1,
  question: "Test?",
  category: "test",
  closingTime: 1_000,
  resolutionTime: 2_000,
  outcome: 0,
  resolved: 0,
  creator: "0xabc",
  createdAtBlock: 10,
};

describe("insertResolution", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
    upsertMarket(db, MARKET);
  });

  it("inserts a resolution row", () => {
    insertResolution(db, 1, 1, "0xresolver", 300, 1_700_500_000);
    const row = db
      .prepare("SELECT * FROM resolutions WHERE market_id = 1")
      .get() as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(row!.outcome).toBe(1);
    expect(row!.resolver).toBe("0xresolver");
    expect(row!.block_number).toBe(300);
    expect(row!.timestamp).toBe(1_700_500_000);
  });

  it("also updates the market outcome and resolved flag", () => {
    insertResolution(db, 1, 2, "0xresolver", 300, 1_700_500_000);
    const market = db
      .prepare("SELECT outcome, resolved FROM markets WHERE id = 1")
      .get() as Record<string, unknown>;
    expect(market.outcome).toBe(2);
    expect(market.resolved).toBe(1);
  });

  it("replaces resolution on conflict (same market_id)", () => {
    insertResolution(db, 1, 1, "0xresolver", 300, 1_700_500_000);
    insertResolution(db, 1, 2, "0xresolver2", 400, 1_700_600_000);
    const rows = db.prepare("SELECT * FROM resolutions").all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).outcome).toBe(2);
  });

  it("handles outcome=1 (YES wins)", () => {
    insertResolution(db, 1, 1, "0xresolver", 300, 0);
    const market = db
      .prepare("SELECT outcome FROM markets WHERE id = 1")
      .get() as Record<string, unknown>;
    expect(market.outcome).toBe(1);
  });

  it("handles outcome=2 (NO wins)", () => {
    insertResolution(db, 1, 2, "0xresolver", 300, 0);
    const market = db
      .prepare("SELECT outcome FROM markets WHERE id = 1")
      .get() as Record<string, unknown>;
    expect(market.outcome).toBe(2);
  });
});
