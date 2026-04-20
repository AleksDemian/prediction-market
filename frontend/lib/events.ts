import type { PublicClient } from "viem";

// Module-level cache for block timestamps — survives re-renders, cleared on page reload
const blockTimestampCache = new Map<bigint, number>();

/** Fetch the timestamp for a single block, using the module-level cache. */
export async function getBlockTimestamp(
  client: PublicClient,
  blockNumber: bigint
): Promise<number> {
  if (blockTimestampCache.has(blockNumber)) {
    return blockTimestampCache.get(blockNumber)!;
  }
  const block = await client.getBlock({ blockNumber });
  const ts = Number(block.timestamp);
  blockTimestampCache.set(blockNumber, ts);
  return ts;
}

/** Batch-fetch timestamps for multiple block numbers, deduplicating requests. */
export async function batchGetBlockTimestamps(
  client: PublicClient,
  blockNumbers: bigint[]
): Promise<Map<bigint, number>> {
  const unique = [...new Set(blockNumbers.map(String))].map(BigInt);
  const missing = unique.filter((bn) => !blockTimestampCache.has(bn));

  await Promise.all(missing.map((bn) => getBlockTimestamp(client, bn)));

  const result = new Map<bigint, number>();
  for (const bn of blockNumbers) {
    result.set(bn, blockTimestampCache.get(bn)!);
  }
  return result;
}
