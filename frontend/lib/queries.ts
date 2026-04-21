import { getDb } from "./db";

export interface MarketRow {
  id: number;
  question: string;
  category: string;
  closing_time: number;
  resolution_time: number;
  outcome: number;
  resolved: number;
  creator: string;
  yes_reserve: string | null;
  no_reserve: string | null;
  total_collateral: string | null;
  volume: number;
}

export interface ActivityRow {
  type: "buy" | "sell" | "resolve" | "claim";
  tx_hash: string | null;
  log_index: number | null;
  block_number: number;
  timestamp: number;
  market_id: number;
  user_addr: string;
  is_yes: number | null;
  collateral: string | null;
  shares: string | null;
  new_yes_probability: number | null;
  outcome: number | null;
  amount: string | null;
}

export interface PriceRow {
  timestamp: number;
  probability: number;
  block_number: number;
}

export interface PortfolioRow {
  market_id: number;
  yes_cost: number;
  yes_shares_net: number;
  no_cost: number;
  no_shares_net: number;
  avg_yes_entry: number;
  avg_no_entry: number;
}

const MARKET_SELECT = `
  SELECT
    m.id, m.question, m.category, m.closing_time, m.resolution_time,
    m.outcome, m.resolved, m.creator,
    p.yes_reserve, p.no_reserve, p.total_collateral,
    COALESCE(
      (SELECT SUM(CAST(collateral AS REAL)) FROM trades WHERE market_id = m.id), 0
    ) AS volume
  FROM markets m
  LEFT JOIN pool_snapshots p ON p.market_id = m.id
`;

export function getMarkets(): MarketRow[] {
  const db = getDb();
  return db
    .prepare(`${MARKET_SELECT} ORDER BY m.id DESC`)
    .all() as MarketRow[];
}

export function getMarket(id: number): MarketRow | undefined {
  const db = getDb();
  return db
    .prepare(`${MARKET_SELECT} WHERE m.id = ?`)
    .get(id) as MarketRow | undefined;
}

export function getActivity(
  marketId: number,
  limit: number
): ActivityRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT 'buy'     AS type, tx_hash, log_index, block_number, timestamp,
                market_id, user_addr, is_yes, collateral, shares,
                new_yes_probability, NULL AS outcome, NULL AS amount
       FROM trades WHERE market_id = ? AND kind = 'buy'
       UNION ALL
       SELECT 'sell'    AS type, tx_hash, log_index, block_number, timestamp,
                market_id, user_addr, is_yes, collateral, shares,
                new_yes_probability, NULL AS outcome, NULL AS amount
       FROM trades WHERE market_id = ? AND kind = 'sell'
       UNION ALL
       SELECT 'resolve' AS type, NULL AS tx_hash, NULL AS log_index,
                block_number, timestamp, market_id, resolver AS user_addr,
                NULL AS is_yes, NULL AS collateral, NULL AS shares,
                NULL AS new_yes_probability, outcome, NULL AS amount
       FROM resolutions WHERE market_id = ?
       UNION ALL
      SELECT 'claim'   AS type, tx_hash, log_index,
                block_number, timestamp, market_id, user_addr,
                NULL AS is_yes, NULL AS collateral, NULL AS shares,
                NULL AS new_yes_probability, NULL AS outcome, amount
       FROM claims WHERE market_id = ?
       ORDER BY block_number DESC
       LIMIT ?`
    )
    .all(marketId, marketId, marketId, marketId, limit) as ActivityRow[];
}

export function getPrices(marketId: number): PriceRow[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT timestamp, new_yes_probability AS probability, block_number
       FROM trades
       WHERE market_id = ?
       ORDER BY block_number ASC`
    )
    .all(marketId) as PriceRow[];

  if (rows.length === 0) {
    const ts = Math.floor(Date.now() / 1000);
    return [{ timestamp: ts, probability: 0.5, block_number: 0 }];
  }

  const startTs = rows[0].timestamp - 60;

  return [
    { timestamp: startTs, probability: 0.5, block_number: 0 },
    ...rows,
  ];
}

export function getPortfolio(address: string): PortfolioRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         market_id,
         CAST(SUM(CASE WHEN kind = 'buy' AND is_yes = 1 THEN collateral ELSE 0 END) AS REAL) / 1e6 AS yes_cost,
         SUM(CASE WHEN kind = 'buy'  AND is_yes = 1 THEN shares
                  WHEN kind = 'sell' AND is_yes = 1 THEN -shares
                  ELSE 0 END) AS yes_shares_net,
         CAST(SUM(CASE WHEN kind = 'buy' AND is_yes = 0 THEN collateral ELSE 0 END) AS REAL) / 1e6 AS no_cost,
         SUM(CASE WHEN kind = 'buy'  AND is_yes = 0 THEN shares
                  WHEN kind = 'sell' AND is_yes = 0 THEN -shares
                  ELSE 0 END) AS no_shares_net,
         CASE WHEN SUM(CASE WHEN kind = 'buy' AND is_yes = 1 THEN shares
                            WHEN kind = 'sell' AND is_yes = 1 THEN -shares
                            ELSE 0 END) > 0
           THEN CAST(SUM(CASE WHEN kind = 'buy' AND is_yes = 1 THEN collateral ELSE 0 END) AS REAL)
              / SUM(CASE WHEN kind = 'buy'  AND is_yes = 1 THEN shares
                         WHEN kind = 'sell' AND is_yes = 1 THEN -shares
                         ELSE 0 END)
           ELSE 0 END AS avg_yes_entry,
         CASE WHEN SUM(CASE WHEN kind = 'buy' AND is_yes = 0 THEN shares
                            WHEN kind = 'sell' AND is_yes = 0 THEN -shares
                            ELSE 0 END) > 0
           THEN CAST(SUM(CASE WHEN kind = 'buy' AND is_yes = 0 THEN collateral ELSE 0 END) AS REAL)
              / SUM(CASE WHEN kind = 'buy'  AND is_yes = 0 THEN shares
                         WHEN kind = 'sell' AND is_yes = 0 THEN -shares
                         ELSE 0 END)
           ELSE 0 END AS avg_no_entry
       FROM trades
       WHERE lower(user_addr) = lower(?)
       GROUP BY market_id`
    )
    .all(address) as PortfolioRow[];
}
