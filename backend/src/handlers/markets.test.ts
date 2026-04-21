import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type DB } from "../db";
import { upsertMarket, updateMarketResolution, type MarketRow } from "./markets";

const BASE_MARKET: MarketRow = {
  id: 1,
  question: "Will ETH hit $5k?",
  category: "crypto",
  closingTime: 1_700_000_000,
  resolutionTime: 1_700_100_000,
  outcome: 0,
  resolved: 0,
  creator: "0xabc",
  createdAtBlock: 100,
};

describe("upsertMarket", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("inserts a market row", () => {
    upsertMarket(db, BASE_MARKET);
    const row = db.prepare("SELECT * FROM markets WHERE id = 1").get() as
      | Record<string, unknown>
      | undefined;
    expect(row).toBeDefined();
    expect(row!.question).toBe("Will ETH hit $5k?");
    expect(row!.category).toBe("crypto");
    expect(row!.closing_time).toBe(1_700_000_000);
    expect(row!.resolution_time).toBe(1_700_100_000);
    expect(row!.outcome).toBe(0);
    expect(row!.resolved).toBe(0);
    expect(row!.creator).toBe("0xabc");
    expect(row!.created_at_block).toBe(100);
  });

  it("replaces an existing market on conflict (same id)", () => {
    upsertMarket(db, BASE_MARKET);
    upsertMarket(db, { ...BASE_MARKET, question: "Updated question" });
    const rows = db.prepare("SELECT * FROM markets").all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).question).toBe("Updated question");
  });

  it("inserts multiple markets with different ids", () => {
    upsertMarket(db, BASE_MARKET);
    upsertMarket(db, { ...BASE_MARKET, id: 2, question: "Market 2" });
    const rows = db.prepare("SELECT * FROM markets ORDER BY id").all();
    expect(rows).toHaveLength(2);
  });

  it("stores resolved=1 when market is resolved", () => {
    upsertMarket(db, { ...BASE_MARKET, resolved: 1, outcome: 2 });
    const row = db.prepare("SELECT resolved, outcome FROM markets WHERE id = 1").get() as
      Record<string, unknown>;
    expect(row.resolved).toBe(1);
    expect(row.outcome).toBe(2);
  });
});

describe("updateMarketResolution", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
    upsertMarket(db, BASE_MARKET);
  });

  it("sets outcome and resolved=1", () => {
    updateMarketResolution(db, 1, 1);
    const row = db.prepare("SELECT outcome, resolved FROM markets WHERE id = 1").get() as
      Record<string, unknown>;
    expect(row.outcome).toBe(1);
    expect(row.resolved).toBe(1);
  });

  it("supports outcome=2 (NO wins)", () => {
    updateMarketResolution(db, 1, 2);
    const row = db.prepare("SELECT outcome FROM markets WHERE id = 1").get() as
      Record<string, unknown>;
    expect(row.outcome).toBe(2);
  });

  it("does not throw when marketId does not exist (no-op update)", () => {
    expect(() => updateMarketResolution(db, 999, 1)).not.toThrow();
  });
});
