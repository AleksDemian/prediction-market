import type { DB } from "./db";
import type { PublicClient } from "./rpc";
import { MARKET_ADDRESS, PREDICTION_MARKET_ABI } from "./abi";

export async function updatePoolSnapshots(
  db: DB,
  client: PublicClient,
  marketIds: Set<number>,
  atBlock: bigint
): Promise<void> {
  for (const marketId of marketIds) {
    try {
      const result = await client.readContract({
        address: MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getMarket",
        args: [BigInt(marketId)],
      });

      const [market, pool] = result;

      db.prepare(
        `INSERT OR REPLACE INTO pool_snapshots
           (market_id, yes_reserve, no_reserve, total_collateral, updated_at_block)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        marketId,
        pool.yesReserve.toString(),
        pool.noReserve.toString(),
        pool.totalCollateral.toString(),
        Number(atBlock)
      );

      if (market.resolved) {
        db.prepare(
          "UPDATE markets SET outcome = ?, resolved = 1 WHERE id = ?"
        ).run(market.outcome, marketId);
      }
    } catch (err) {
      console.error(`[snapshot] market ${marketId} failed:`, err);
    }
  }
}
