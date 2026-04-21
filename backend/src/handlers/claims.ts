import type { DB } from "../db";

export function insertClaim(
  db: DB,
  txHash: string,
  logIndex: number,
  marketId: number,
  userAddr: string,
  amount: string,
  blockNumber: number,
  timestamp: number
): void {
  db.prepare(
    `INSERT OR REPLACE INTO claims
       (tx_hash, log_index, market_id, user_addr, amount, block_number, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(txHash, logIndex, marketId, userAddr, amount, blockNumber, timestamp);
}
