import "./load-env";
import { openDb, getLastIndexedBlock, setLastIndexedBlock } from "./db";
import { createClient, fetchBlockTimestamps } from "./rpc";
import { MARKET_ADDRESS, PREDICTION_MARKET_ABI } from "./abi";
import { upsertMarket } from "./handlers/markets";
import { insertTrade } from "./handlers/trades";
import { insertResolution } from "./handlers/resolutions";
import { insertClaim } from "./handlers/claims";
import { updatePoolSnapshots } from "./snapshot";

// Default resolves to <repo>/data/app.db (shared with the frontend route handlers).
const DB_PATH = process.env.DATABASE_PATH ?? "../data/app.db";
const DEPLOY_BLOCK = BigInt(
  process.env.CONTRACT_DEPLOY_BLOCK ?? "10696829"
);
// Infura free caps eth_getLogs at 10k blocks AND truncates the response when it
// grows too large — either path produces obscure viem errors. 2k is a safe
// default across Infura/Alchemy/public RPCs; tune via INDEXER_BATCH_SIZE.
const BATCH_SIZE = BigInt(process.env.INDEXER_BATCH_SIZE ?? "2000");
const POLL_INTERVAL_MS = 6_000;
const REORG_BUFFER = 64n;

// RPC-error messages that indicate the batch window is too wide.
const RANGE_ERROR_RE =
  /more than \d+ results|query returned more than|log response size|range is too wide|exceed|block range|limit.*exceeded/i;

type Client = ReturnType<typeof createClient>;
type DB = ReturnType<typeof openDb>;

async function processBatch(
  db: DB,
  client: Client,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Set<number>> {
  const affectedMarkets = new Set<number>();

  // Sequential (not Promise.all) to keep per-second request pressure low —
  // free-tier Infura throttles bursts aggressively and returns a malformed
  // JSON-RPC batch under stress (observed HTTP 200 with `-32005` array).
  const created = await client.getContractEvents({
    address: MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "MarketCreated",
    fromBlock,
    toBlock,
  });
  const bought = await client.getContractEvents({
    address: MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "SharesBought",
    fromBlock,
    toBlock,
  });
  const sold = await client.getContractEvents({
    address: MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "SharesSold",
    fromBlock,
    toBlock,
  });
  const resolved = await client.getContractEvents({
    address: MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "MarketResolved",
    fromBlock,
    toBlock,
  });
  const claimed = await client.getContractEvents({
    address: MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "WinningsClaimed",
    fromBlock,
    toBlock,
  });

  const allEvents = [...created, ...bought, ...sold, ...resolved, ...claimed];
  const blockNums = allEvents
    .map((e) => e.blockNumber)
    .filter((n): n is bigint => n != null);

  const timestamps =
    blockNums.length > 0
      ? await fetchBlockTimestamps(client, blockNums)
      : new Map<bigint, number>();

  db.transaction(() => {
    for (const e of created) {
      const a = e.args as {
        marketId: bigint;
        question: string;
        category: string;
        closingTime: bigint;
        resolutionTime: bigint;
        creator: `0x${string}`;
      };
      upsertMarket(db, {
        id: Number(a.marketId),
        question: a.question,
        category: a.category,
        closingTime: Number(a.closingTime),
        resolutionTime: Number(a.resolutionTime),
        outcome: 0,
        resolved: 0,
        creator: a.creator,
        createdAtBlock: Number(e.blockNumber ?? 0n),
      });
      affectedMarkets.add(Number(a.marketId));
    }

    for (const e of bought) {
      const a = e.args as {
        marketId: bigint;
        buyer: `0x${string}`;
        isYes: boolean;
        collateralIn: bigint;
        sharesOut: bigint;
        newYesProbability: bigint;
      };
      if (!e.transactionHash || e.logIndex == null) continue;
      insertTrade(db, {
        txHash: e.transactionHash,
        logIndex: e.logIndex,
        blockNumber: Number(e.blockNumber ?? 0n),
        timestamp: timestamps.get(e.blockNumber!) ?? 0,
        marketId: Number(a.marketId),
        userAddr: a.buyer,
        kind: "buy",
        isYes: a.isYes ? 1 : 0,
        collateral: a.collateralIn.toString(),
        shares: a.sharesOut.toString(),
        newYesProbability: Number(a.newYesProbability) / 1e18,
      });
      affectedMarkets.add(Number(a.marketId));
    }

    for (const e of sold) {
      const a = e.args as {
        marketId: bigint;
        seller: `0x${string}`;
        isYes: boolean;
        sharesIn: bigint;
        collateralOut: bigint;
        newYesProbability: bigint;
      };
      if (!e.transactionHash || e.logIndex == null) continue;
      insertTrade(db, {
        txHash: e.transactionHash,
        logIndex: e.logIndex,
        blockNumber: Number(e.blockNumber ?? 0n),
        timestamp: timestamps.get(e.blockNumber!) ?? 0,
        marketId: Number(a.marketId),
        userAddr: a.seller,
        kind: "sell",
        isYes: a.isYes ? 1 : 0,
        collateral: a.collateralOut.toString(),
        shares: a.sharesIn.toString(),
        newYesProbability: Number(a.newYesProbability) / 1e18,
      });
      affectedMarkets.add(Number(a.marketId));
    }

    for (const e of resolved) {
      const a = e.args as {
        marketId: bigint;
        outcome: number;
        resolver: `0x${string}`;
      };
      insertResolution(
        db,
        Number(a.marketId),
        a.outcome,
        a.resolver,
        Number(e.blockNumber ?? 0n),
        timestamps.get(e.blockNumber!) ?? 0
      );
      affectedMarkets.add(Number(a.marketId));
    }

    for (const e of claimed) {
      const a = e.args as {
        marketId: bigint;
        claimer: `0x${string}`;
        amount: bigint;
      };
      if (!e.transactionHash || e.logIndex == null) continue;
      insertClaim(
        db,
        e.transactionHash,
        e.logIndex,
        Number(a.marketId),
        a.claimer,
        a.amount.toString(),
        Number(e.blockNumber ?? 0n),
        timestamps.get(e.blockNumber!) ?? 0
      );
      affectedMarkets.add(Number(a.marketId));
    }
  })();

  return affectedMarkets;
}

function purgeReorgWindow(db: DB, fromBlock: bigint, toBlock: bigint): Set<number> {
  const from = Number(fromBlock);
  const to = Number(toBlock);
  const affectedMarkets = new Set<number>();

  const trades = db
    .prepare(
      `SELECT DISTINCT market_id
       FROM trades
       WHERE block_number BETWEEN ? AND ?`
    )
    .all(from, to) as Array<{ market_id: number }>;
  const resolutions = db
    .prepare(
      `SELECT DISTINCT market_id
       FROM resolutions
       WHERE block_number BETWEEN ? AND ?`
    )
    .all(from, to) as Array<{ market_id: number }>;
  const claims = db
    .prepare(
      `SELECT DISTINCT market_id
       FROM claims
       WHERE block_number BETWEEN ? AND ?`
    )
    .all(from, to) as Array<{ market_id: number }>;

  for (const row of [...trades, ...resolutions, ...claims]) {
    affectedMarkets.add(row.market_id);
  }

  db.transaction(() => {
    db.prepare(
      `DELETE FROM trades
       WHERE block_number BETWEEN ? AND ?`
    ).run(from, to);
    db.prepare(
      `DELETE FROM resolutions
       WHERE block_number BETWEEN ? AND ?`
    ).run(from, to);
    db.prepare(
      `DELETE FROM claims
       WHERE block_number BETWEEN ? AND ?`
    ).run(from, to);
  })();

  return affectedMarkets;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tries the batch once; on range-size errors it bisects the block window and
// retries each half. Any other error propagates to the caller's retry loop.
async function processBatchAdaptive(
  db: DB,
  client: Client,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Set<number>> {
  try {
    return await processBatch(db, client, fromBlock, toBlock);
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    if (toBlock <= fromBlock || !RANGE_ERROR_RE.test(msg)) throw err;

    const mid = fromBlock + (toBlock - fromBlock) / 2n;
    console.warn(
      `[indexer] splitting ${fromBlock}-${toBlock} → ${fromBlock}-${mid} + ${mid + 1n}-${toBlock} (${msg.slice(0, 100)})`
    );
    const left = await processBatchAdaptive(db, client, fromBlock, mid);
    const right = await processBatchAdaptive(db, client, mid + 1n, toBlock);
    return new Set([...left, ...right]);
  }
}

async function main(): Promise<void> {
  if (!MARKET_ADDRESS) {
    throw new Error("MARKET_ADDRESS env var is required");
  }

  console.log(`[indexer] Starting — market: ${MARKET_ADDRESS}, db: ${DB_PATH}`);

  const db = openDb(DB_PATH);
  const client = createClient();

  // ── Backfill ───────────────────────────────────────────────────────────────
  let fromBlock = getLastIndexedBlock(db);
  if (fromBlock === 0n) fromBlock = DEPLOY_BLOCK;

  const latestBlock = await client.getBlockNumber();
  console.log(`[indexer] Backfilling blocks ${fromBlock}–${latestBlock}`);

  let cursor = fromBlock;
  while (cursor <= latestBlock) {
    const toBlock =
      cursor + BATCH_SIZE - 1n < latestBlock
        ? cursor + BATCH_SIZE - 1n
        : latestBlock;

    console.log(`[indexer] batch ${cursor}–${toBlock}`);

    try {
      const affected = await processBatchAdaptive(db, client, cursor, toBlock);
      if (affected.size > 0) {
        await updatePoolSnapshots(db, client, affected, toBlock);
      }
      setLastIndexedBlock(db, toBlock);
    } catch (err) {
      console.error(`[indexer] batch error:`, err);
      await sleep(5_000);
      continue;
    }

    cursor = toBlock + 1n;
  }

  console.log("[indexer] Backfill complete — entering poll loop");

  // ── Steady-state poll ──────────────────────────────────────────────────────
  while (true) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const latest = await client.getBlockNumber();
      const lastIndexed = getLastIndexedBlock(db);
      // Re-scan last REORG_BUFFER blocks to tolerate shallow reorgs
      const from =
        lastIndexed > REORG_BUFFER ? lastIndexed - REORG_BUFFER : DEPLOY_BLOCK;

      if (from > latest) continue;

      const purgedMarkets = purgeReorgWindow(db, from, latest);
      const affected = await processBatchAdaptive(db, client, from, latest);
      const allAffected = new Set([...purgedMarkets, ...affected]);
      if (allAffected.size > 0) {
        await updatePoolSnapshots(db, client, allAffected, latest);
      }
      setLastIndexedBlock(db, latest);
    } catch (err) {
      console.error("[indexer] poll error:", err);
    }
  }
}

main().catch((err) => {
  console.error("[indexer] fatal:", err);
  process.exit(1);
});
