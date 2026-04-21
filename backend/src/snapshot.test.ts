import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDb, type DB } from "./db";
import { upsertMarket } from "./handlers/markets";
import { updatePoolSnapshots } from "./snapshot";
import type { PublicClient } from "./rpc";

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

function makeClient(overrides?: {
  market?: { id: bigint; outcome: number; resolved: boolean };
  pool?: { yesReserve: bigint; noReserve: bigint; totalCollateral: bigint };
  throws?: boolean;
}): PublicClient {
  const market = overrides?.market ?? { id: 1n, outcome: 0, resolved: false };
  const pool = overrides?.pool ?? {
    yesReserve: 500_000n,
    noReserve: 300_000n,
    totalCollateral: 800_000n,
  };

  return {
    readContract: overrides?.throws
      ? vi.fn().mockRejectedValue(new Error("RPC error"))
      : vi.fn().mockResolvedValue([market, pool]),
  } as unknown as PublicClient;
}

describe("updatePoolSnapshots", () => {
  let db: DB;

  beforeEach(() => {
    db = openDb(":memory:");
    upsertMarket(db, MARKET);
  });

  it("inserts a pool_snapshots row", async () => {
    const client = makeClient();
    await updatePoolSnapshots(db, client, new Set([1]), 500n);

    const row = db
      .prepare("SELECT * FROM pool_snapshots WHERE market_id = 1")
      .get() as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(row!.yes_reserve).toBe("500000");
    expect(row!.no_reserve).toBe("300000");
    expect(row!.total_collateral).toBe("800000");
    expect(row!.updated_at_block).toBe(500);
  });

  it("replaces snapshot on subsequent call", async () => {
    const client1 = makeClient({
      pool: { yesReserve: 100n, noReserve: 100n, totalCollateral: 200n },
    });
    await updatePoolSnapshots(db, client1, new Set([1]), 100n);

    const client2 = makeClient({
      pool: { yesReserve: 999n, noReserve: 888n, totalCollateral: 1887n },
    });
    await updatePoolSnapshots(db, client2, new Set([1]), 200n);

    const rows = db.prepare("SELECT * FROM pool_snapshots").all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).yes_reserve).toBe("999");
  });

  it("processes multiple markets", async () => {
    upsertMarket(db, { ...MARKET, id: 2, question: "Market 2" });
    const client = makeClient();
    await updatePoolSnapshots(db, client, new Set([1, 2]), 600n);

    const rows = db.prepare("SELECT * FROM pool_snapshots ORDER BY market_id").all();
    expect(rows).toHaveLength(2);
  });

  it("updates market as resolved when contract says resolved=true", async () => {
    const client = makeClient({
      market: { id: 1n, outcome: 1, resolved: true },
    });
    await updatePoolSnapshots(db, client, new Set([1]), 700n);

    const market = db
      .prepare("SELECT outcome, resolved FROM markets WHERE id = 1")
      .get() as Record<string, unknown>;
    expect(market.outcome).toBe(1);
    expect(market.resolved).toBe(1);
  });

  it("does not update market when resolved=false", async () => {
    const client = makeClient({
      market: { id: 1n, outcome: 0, resolved: false },
    });
    await updatePoolSnapshots(db, client, new Set([1]), 700n);

    const market = db
      .prepare("SELECT resolved FROM markets WHERE id = 1")
      .get() as Record<string, unknown>;
    expect(market.resolved).toBe(0);
  });

  it("continues processing remaining markets when one fails", async () => {
    upsertMarket(db, { ...MARKET, id: 2, question: "Market 2" });

    const client = {
      readContract: vi
        .fn()
        .mockRejectedValueOnce(new Error("RPC error for market 1"))
        .mockResolvedValueOnce([
          { id: 2n, outcome: 0, resolved: false },
          { yesReserve: 100n, noReserve: 200n, totalCollateral: 300n },
        ]),
    } as unknown as PublicClient;

    await updatePoolSnapshots(db, client, new Set([1, 2]), 800n);

    const snapshots = db.prepare("SELECT * FROM pool_snapshots").all();
    expect(snapshots).toHaveLength(1);
    expect((snapshots[0] as Record<string, unknown>).market_id).toBe(2);
  });

  it("does nothing for empty market set", async () => {
    const client = makeClient();
    await updatePoolSnapshots(db, client, new Set(), 500n);
    const rows = db.prepare("SELECT * FROM pool_snapshots").all();
    expect(rows).toHaveLength(0);
    expect(client.readContract).not.toHaveBeenCalled();
  });
});
