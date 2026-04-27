import { describe, expect, it } from "vitest";
import { getIndexerConfig } from "./indexer-config";

describe("getIndexerConfig", () => {
  it("uses RPC-friendly defaults for the demo deployment", () => {
    expect(getIndexerConfig({})).toEqual({
      pollIntervalMs: 60_000,
      reorgBufferBlocks: 24n,
      refreshPort: 8787,
    });
  });

  it("allows deployment-specific overrides", () => {
    expect(
      getIndexerConfig({
        INDEXER_POLL_INTERVAL_MS: "120000",
        INDEXER_REORG_BUFFER_BLOCKS: "12",
        INDEXER_REFRESH_PORT: "9000",
      })
    ).toEqual({
      pollIntervalMs: 120_000,
      reorgBufferBlocks: 12n,
      refreshPort: 9000,
    });
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      getIndexerConfig({
        INDEXER_POLL_INTERVAL_MS: "0",
        INDEXER_REORG_BUFFER_BLOCKS: "-1",
        INDEXER_REFRESH_PORT: "not-a-port",
      })
    ).toEqual({
      pollIntervalMs: 60_000,
      reorgBufferBlocks: 24n,
      refreshPort: 8787,
    });
  });

  it("rejects invalid refresh ports", () => {
    expect(getIndexerConfig({ INDEXER_REFRESH_PORT: "65536" }).refreshPort).toBe(
      8787
    );
    expect(getIndexerConfig({ INDEXER_REFRESH_PORT: "0" }).refreshPort).toBe(
      8787
    );
  });
});
