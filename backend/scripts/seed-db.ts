import "../src/load-env";
import { openDb } from "../src/db";
import { upsertMarket } from "../src/handlers/markets";
import { insertTrade } from "../src/handlers/trades";
import { insertResolution } from "../src/handlers/resolutions";

const DB_PATH = process.env.DATABASE_PATH ?? "/tmp/pm.db";
const NOW = Math.floor(Date.now() / 1000);

const db = openDb(DB_PATH);

const markets = [
  {
    id: 1,
    question: "Will ETH price exceed $5,000 by end of 2025?",
    category: "crypto",
    closingTime: NOW + 86400 * 30,
    resolutionTime: NOW + 86400 * 35,
    outcome: 0,
    resolved: 0,
    creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    createdAtBlock: 10_700_000,
  },
  {
    id: 2,
    question: "Will Bitcoin reach $150k before July 2025?",
    category: "crypto",
    closingTime: NOW + 86400 * 10,
    resolutionTime: NOW + 86400 * 15,
    outcome: 0,
    resolved: 0,
    creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    createdAtBlock: 10_701_000,
  },
  {
    id: 3,
    question: "Will the Fed cut rates in Q1 2025?",
    category: "macro",
    closingTime: NOW - 86400 * 5,
    resolutionTime: NOW - 86400 * 2,
    outcome: 1,
    resolved: 1,
    creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    createdAtBlock: 10_702_000,
  },
  {
    id: 4,
    question: "Will Solana flip Ethereum by TVL in 2025?",
    category: "crypto",
    closingTime: NOW + 86400 * 60,
    resolutionTime: NOW + 86400 * 65,
    outcome: 0,
    resolved: 0,
    creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    createdAtBlock: 10_703_000,
  },
  {
    id: 5,
    question: "Will AI replace 10% of software engineering jobs by 2026?",
    category: "tech",
    closingTime: NOW + 86400 * 90,
    resolutionTime: NOW + 86400 * 95,
    outcome: 0,
    resolved: 0,
    creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    createdAtBlock: 10_704_000,
  },
];

for (const m of markets) {
  upsertMarket(db, m);
}

// Pool snapshots
const snapshots = [
  { id: 1, yes: 600_000_000, no: 400_000_000, total: 1_000_000_000 },
  { id: 2, yes: 300_000_000, no: 700_000_000, total: 1_000_000_000 },
  { id: 3, yes: 800_000_000, no: 200_000_000, total: 1_000_000_000 },
  { id: 4, yes: 500_000_000, no: 500_000_000, total: 1_000_000_000 },
  { id: 5, yes: 550_000_000, no: 450_000_000, total: 1_000_000_000 },
];
for (const s of snapshots) {
  db.prepare(
    `INSERT OR REPLACE INTO pool_snapshots
       (market_id, yes_reserve, no_reserve, total_collateral, updated_at_block)
     VALUES (?, ?, ?, ?, ?)`
  ).run(s.id, s.yes, s.no, s.total, 10_710_000);
}

// Trades for market 1
const trades = [
  { tx: "0xaaa1", logIndex: 0, block: 10_700_100, ts: NOW - 3600 * 24, marketId: 1, user: "0xUser1", kind: "buy" as const, isYes: 1, col: 100_000_000, shares: 150_000_000, prob: 0.58 },
  { tx: "0xaaa2", logIndex: 0, block: 10_700_200, ts: NOW - 3600 * 20, marketId: 1, user: "0xUser2", kind: "buy" as const, isYes: 0, col: 50_000_000, shares: 80_000_000, prob: 0.55 },
  { tx: "0xaaa3", logIndex: 0, block: 10_700_300, ts: NOW - 3600 * 16, marketId: 1, user: "0xUser3", kind: "buy" as const, isYes: 1, col: 200_000_000, shares: 280_000_000, prob: 0.62 },
  { tx: "0xaaa4", logIndex: 0, block: 10_700_400, ts: NOW - 3600 * 12, marketId: 1, user: "0xUser1", kind: "sell" as const, isYes: 1, col: 80_000_000, shares: 100_000_000, prob: 0.59 },
  { tx: "0xaaa5", logIndex: 0, block: 10_700_500, ts: NOW - 3600 * 8, marketId: 1, user: "0xUser4", kind: "buy" as const, isYes: 1, col: 300_000_000, shares: 400_000_000, prob: 0.63 },
  // Trades for market 2
  { tx: "0xbbb1", logIndex: 0, block: 10_701_100, ts: NOW - 3600 * 10, marketId: 2, user: "0xUser1", kind: "buy" as const, isYes: 0, col: 150_000_000, shares: 200_000_000, prob: 0.30 },
  { tx: "0xbbb2", logIndex: 0, block: 10_701_200, ts: NOW - 3600 * 6, marketId: 2, user: "0xUser5", kind: "buy" as const, isYes: 0, col: 250_000_000, shares: 330_000_000, prob: 0.28 },
];
for (const t of trades) {
  insertTrade(db, {
    txHash: t.tx,
    logIndex: t.logIndex,
    blockNumber: t.block,
    timestamp: t.ts,
    marketId: t.marketId,
    userAddr: t.user,
    kind: t.kind,
    isYes: t.isYes,
    collateral: t.col.toString(),
    shares: t.shares.toString(),
    newYesProbability: t.prob,
  });
}

// Resolution for market 3 (YES wins)
insertResolution(db, 3, 1, "0xAdmin", 10_708_000, NOW - 86400 * 2);

console.log(`[seed] DB seeded at ${DB_PATH}`);
console.log(`[seed] Markets: ${markets.length}`);
console.log(`[seed] Trades: ${trades.length}`);
console.log(`[seed] Resolutions: 1`);
db.close();
