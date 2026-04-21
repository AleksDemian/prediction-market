import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type DB } from "../db";
import { insertTrade, type TradeRow } from "./trades";

const BASE_TRADE: TradeRow = {
  txHash: "0xdeadbeef",
  logIndex: 0,
  blockNumber: 200,
  timestamp: 1_700_000_000,
  marketId: 1,
  userAddr: "0xuser1",
  kind: "buy",
  isYes: 1,
  collateral: "1000000",
  shares: "2000000",
  newYesProbability: 0.6,
};

describe("insertTrade", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("inserts a buy trade", () => {
    insertTrade(db, BASE_TRADE);
    const row = db
      .prepare("SELECT * FROM trades WHERE tx_hash = '0xdeadbeef' AND log_index = 0")
      .get() as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(row!.kind).toBe("buy");
    expect(row!.is_yes).toBe(1);
    expect(row!.collateral).toBe("1000000");
    expect(row!.shares).toBe("2000000");
    expect(row!.new_yes_probability).toBeCloseTo(0.6);
    expect(row!.market_id).toBe(1);
    expect(row!.user_addr).toBe("0xuser1");
  });

  it("inserts a sell trade", () => {
    const sell: TradeRow = {
      ...BASE_TRADE,
      txHash: "0xcafe",
      kind: "sell",
      isYes: 0,
    };
    insertTrade(db, sell);
    const row = db
      .prepare("SELECT kind, is_yes FROM trades WHERE tx_hash = '0xcafe'")
      .get() as Record<string, unknown>;
    expect(row.kind).toBe("sell");
    expect(row.is_yes).toBe(0);
  });

  it("replaces on conflict (same tx_hash + log_index)", () => {
    insertTrade(db, BASE_TRADE);
    insertTrade(db, { ...BASE_TRADE, collateral: "9999999" });
    const rows = db.prepare("SELECT * FROM trades").all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).collateral).toBe("9999999");
  });

  it("allows multiple trades with different log indexes from same tx", () => {
    insertTrade(db, BASE_TRADE);
    insertTrade(db, { ...BASE_TRADE, logIndex: 1 });
    const rows = db.prepare("SELECT * FROM trades").all();
    expect(rows).toHaveLength(2);
  });

  it("allows trades from different transactions", () => {
    insertTrade(db, BASE_TRADE);
    insertTrade(db, { ...BASE_TRADE, txHash: "0xother", logIndex: 0 });
    const rows = db.prepare("SELECT * FROM trades").all();
    expect(rows).toHaveLength(2);
  });

  it("stores block_number and timestamp correctly", () => {
    insertTrade(db, BASE_TRADE);
    const row = db
      .prepare("SELECT block_number, timestamp FROM trades WHERE tx_hash = '0xdeadbeef'")
      .get() as Record<string, unknown>;
    expect(row.block_number).toBe(200);
    expect(row.timestamp).toBe(1_700_000_000);
  });
});
