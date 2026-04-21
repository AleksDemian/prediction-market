import type { DB } from "../db";
import { updateMarketResolution } from "./markets";

export function insertResolution(
  db: DB,
  marketId: number,
  outcome: number,
  resolver: string,
  blockNumber: number,
  timestamp: number
): void {
  db.prepare(
    `INSERT OR REPLACE INTO resolutions
       (market_id, outcome, resolver, block_number, timestamp)
     VALUES (?, ?, ?, ?, ?)`
  ).run(marketId, outcome, resolver, blockNumber, timestamp);

  updateMarketResolution(db, marketId, outcome);
}
