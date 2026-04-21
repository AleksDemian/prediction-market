import type { DB } from "../db";

export interface TradeRow {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: number;
  marketId: number;
  userAddr: string;
  kind: "buy" | "sell";
  isYes: number;
  collateral: string;
  shares: string;
  newYesProbability: number;
}

export function insertTrade(db: DB, row: TradeRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO trades
       (tx_hash, log_index, block_number, timestamp, market_id, user_addr,
        kind, is_yes, collateral, shares, new_yes_probability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.txHash,
    row.logIndex,
    row.blockNumber,
    row.timestamp,
    row.marketId,
    row.userAddr,
    row.kind,
    row.isYes,
    row.collateral,
    row.shares,
    row.newYesProbability
  );
}
