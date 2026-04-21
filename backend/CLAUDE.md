# Backend — Prediction Market Indexer

TypeScript blockchain indexer that tails Ethereum events from a deployed `PredictionMarket` contract and writes them into a local SQLite database. The frontend reads from the same SQLite file via a shared Docker volume.

## Architecture

```
Ethereum (Sepolia)
      │ viem (fallback RPC transport)
      ▼
  indexer.ts          — main loop: backfill + poll
      │
      ├── handlers/
      │   ├── markets.ts      — upsertMarket, updateMarketResolution
      │   ├── trades.ts       — insertTrade (buy/sell)
      │   ├── resolutions.ts  — insertResolution (+ syncs market row)
      │   └── claims.ts       — insertClaim
      │
      ├── snapshot.ts         — updatePoolSnapshots (reads on-chain pool state)
      ├── db.ts               — openDb, getLastIndexedBlock, setLastIndexedBlock
      ├── rpc.ts              — createClient (viem fallback), fetchBlockTimestamps
      ├── abi.ts              — MARKET_ADDRESS + PREDICTION_MARKET_ABI
      └── schema.sql          — DDL for all tables
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MARKET_ADDRESS` | Yes | — | Deployed contract address (`0x…`) |
| `RPC_URL` | No | public endpoints | Primary JSON-RPC endpoint |
| `DATABASE_PATH` | No | `/data/app.db` | SQLite file path |
| `CONTRACT_DEPLOY_BLOCK` | No | `10696829` | Block to start backfill from |

## Database Schema (SQLite)

**`meta`** — key/value store; currently stores `last_indexed_block`.

**`markets`** — one row per `MarketCreated` event. `resolved` and `outcome` updated on `MarketResolved` and via snapshot calls.

**`pool_snapshots`** — latest on-chain AMM reserves per market (`yesReserve`, `noReserve`, `totalCollateral`). Written after every batch that touches a market.

**`trades`** — every `SharesBought` / `SharesSold` event. PK is `(tx_hash, log_index)`.

**`resolutions`** — one row per `MarketResolved` event. Writing a resolution also updates the parent `markets` row.

**`claims`** — every `WinningsClaimed` event. PK is `tx_hash`.

## Indexer Logic

### Backfill phase
Starts from `last_indexed_block` (or `DEPLOY_BLOCK` on first run). Processes blocks in batches of 10 000, writing `last_indexed_block` after each successful batch.

### Poll phase
Runs every 6 s. Re-scans the last 64 blocks (reorg buffer) before the latest chain tip to tolerate shallow reorgs.

### processBatch
Fetches five event types in parallel via `Promise.all`, then resolves block timestamps in chunks of 50 (also parallel per chunk). Events are processed in order: created → bought → sold → resolved → claimed. After processing, `updatePoolSnapshots` is called for every affected market to sync on-chain AMM state.

## Scripts

```bash
npm run dev       # tsx watch (hot reload)
npm start         # production
npm test          # vitest run (all tests)
npm run test:watch
npm run test:coverage
```

## Testing

Framework: **vitest** with `@vitest/coverage-v8`.

Test files sit next to source files (`*.test.ts`). All DB tests use an **in-memory SQLite** database (`":memory:"`). RPC calls are mocked with `vi.fn()`.

Current coverage: **95%** statements across all non-entry-point modules.

| Test file | What it covers |
|---|---|
| `db.test.ts` | openDb (tables, pragmas), getLastIndexedBlock, setLastIndexedBlock |
| `handlers/markets.test.ts` | upsertMarket, updateMarketResolution |
| `handlers/trades.test.ts` | insertTrade (buy, sell, conflicts, multi-log) |
| `handlers/resolutions.test.ts` | insertResolution + market sync |
| `handlers/claims.test.ts` | insertClaim (conflicts, multi-market) |
| `snapshot.test.ts` | updatePoolSnapshots (happy path, error resilience, resolved sync) |
| `rpc.test.ts` | fetchBlockTimestamps (dedup, chunking, empty input) |

`indexer.ts` and `abi.ts` are excluded from coverage — they are entry points / static data.

## Key Invariants

- `insertResolution` **always** calls `updateMarketResolution` — the `markets` row is the source of truth for the frontend; the `resolutions` table is the audit log.
- `updatePoolSnapshots` **never throws** — errors per market are caught and logged so other markets in the same batch are not blocked.
- `processBatch` is idempotent — all inserts use `INSERT OR REPLACE`, safe to re-run on reorg re-scans.
- Block timestamps are fetched **after** all events are collected to minimise RPC round trips.

## RPC Transport

`createClient` sets up a `viem` fallback transport across four endpoints (primary env var + three public fallbacks). Batching is enabled. No ranking — first healthy endpoint wins per request.

## Docker

The indexer runs as the `indexer` service in `docker-compose.yml`. It shares an `app-data` volume with the `frontend` service (frontend mounts it read-only). The SQLite WAL mode is intentional — it allows concurrent readers (frontend) while the indexer writes.
