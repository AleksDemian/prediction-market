import type { DB } from "../db";

export interface MarketRow {
  id: number;
  question: string;
  category: string;
  closingTime: number;
  resolutionTime: number;
  outcome: number;
  resolved: number;
  creator: string;
  createdAtBlock: number;
}

export function upsertMarket(db: DB, row: MarketRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO markets
       (id, question, category, closing_time, resolution_time,
        outcome, resolved, creator, created_at_block)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.question,
    row.category,
    row.closingTime,
    row.resolutionTime,
    row.outcome,
    row.resolved,
    row.creator,
    row.createdAtBlock
  );
}

export function updateMarketResolution(
  db: DB,
  marketId: number,
  outcome: number
): void {
  db.prepare(
    "UPDATE markets SET outcome = ?, resolved = 1 WHERE id = ?"
  ).run(outcome, marketId);
}
