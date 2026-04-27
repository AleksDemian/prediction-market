type Env = Record<string, string | undefined>;

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_REORG_BUFFER_BLOCKS = 24;
const DEFAULT_REFRESH_PORT = 8787;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max?: number
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  if (max !== undefined && parsed > max) return fallback;
  return parsed;
}

export function getIndexerConfig(env: Env) {
  return {
    pollIntervalMs: parsePositiveInt(
      env.INDEXER_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS
    ),
    reorgBufferBlocks: BigInt(
      parsePositiveInt(
        env.INDEXER_REORG_BUFFER_BLOCKS,
        DEFAULT_REORG_BUFFER_BLOCKS
      )
    ),
    refreshPort: parsePositiveInt(
      env.INDEXER_REFRESH_PORT,
      DEFAULT_REFRESH_PORT,
      65_535
    ),
  };
}
