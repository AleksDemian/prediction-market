import { describe, it, expect, vi } from "vitest";
import { fetchBlockTimestamps } from "./rpc";
import type { PublicClient } from "./rpc";

function makeBlock(timestamp: bigint) {
  return { timestamp };
}

function makeClient(blocks: Record<string, { timestamp: bigint }>): PublicClient {
  return {
    getBlock: vi.fn(({ blockNumber }: { blockNumber: bigint }) =>
      Promise.resolve(blocks[blockNumber.toString()] ?? makeBlock(0n))
    ),
  } as unknown as PublicClient;
}

describe("fetchBlockTimestamps", () => {
  it("returns a map of blockNumber → timestamp", async () => {
    const client = makeClient({
      "100": { timestamp: 1_700_000_000n },
      "200": { timestamp: 1_700_100_000n },
    });
    const result = await fetchBlockTimestamps(client, [100n, 200n]);
    expect(result.get(100n)).toBe(1_700_000_000);
    expect(result.get(200n)).toBe(1_700_100_000);
  });

  it("deduplicates block numbers", async () => {
    const client = makeClient({
      "100": { timestamp: 1_700_000_000n },
    });
    const result = await fetchBlockTimestamps(client, [100n, 100n, 100n]);
    expect(result.size).toBe(1);
    expect(client.getBlock).toHaveBeenCalledTimes(1);
  });

  it("returns empty map for empty input", async () => {
    const client = makeClient({});
    const result = await fetchBlockTimestamps(client, []);
    expect(result.size).toBe(0);
    expect(client.getBlock).not.toHaveBeenCalled();
  });

  it("processes blocks in chunks of 50", async () => {
    const blocks: Record<string, { timestamp: bigint }> = {};
    const blockNums: bigint[] = [];
    for (let i = 1; i <= 75; i++) {
      blocks[String(i)] = { timestamp: BigInt(i * 1000) };
      blockNums.push(BigInt(i));
    }
    const client = makeClient(blocks);
    const result = await fetchBlockTimestamps(client, blockNums);

    expect(result.size).toBe(75);
    expect(client.getBlock).toHaveBeenCalledTimes(75);
    expect(result.get(1n)).toBe(1000);
    expect(result.get(75n)).toBe(75_000);
  });

  it("converts bigint timestamps to numbers", async () => {
    const client = makeClient({
      "500": { timestamp: 9_999_999_999n },
    });
    const result = await fetchBlockTimestamps(client, [500n]);
    const ts = result.get(500n);
    expect(typeof ts).toBe("number");
    expect(ts).toBe(9_999_999_999);
  });

  it("handles exactly 50 blocks in one chunk", async () => {
    const blocks: Record<string, { timestamp: bigint }> = {};
    const blockNums: bigint[] = [];
    for (let i = 1; i <= 50; i++) {
      blocks[String(i)] = { timestamp: BigInt(i) };
      blockNums.push(BigInt(i));
    }
    const client = makeClient(blocks);
    const result = await fetchBlockTimestamps(client, blockNums);
    expect(result.size).toBe(50);
    expect(client.getBlock).toHaveBeenCalledTimes(50);
  });
});
