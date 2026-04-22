# Backend (Indexer)

TypeScript indexer that reads `PredictionMarket` contract events from RPC and writes aggregated data to SQLite. The `frontend` reads from this SQLite database.

## Role in the System

- backfill historical events from the deploy block
- poll new blocks with a reorg buffer
- upsert data into `markets`, `trades`, `resolutions`, `claims`, `pool_snapshots`
- update `last_indexed_block` in the `meta` table

## Environment Variables

- `MARKET_ADDRESS` — `PredictionMarket` address (required)
- `RPC_URL` — JSON-RPC endpoint (optional, fallback URLs are available)
- `DATABASE_PATH` — SQLite path (`../data/app.db` locally, `/data/app.db` in Docker)
- `CONTRACT_DEPLOY_BLOCK` — start block for backfill (default: `10696829`)
- `INDEXER_BATCH_SIZE` — batch size for `getLogs` (default: `2000`)

In Docker/handoff flow, root `.env` uses canonical names (`MARKET_ADDRESS`, `USDC_ADDRESS`, `RPC_URL`, etc.) and `docker-compose.yml` maps them to service-specific variables.

## Local Run (without Docker)

Prerequisites:

- Node.js 22+
- configured root `.env` or `backend/.env`

Steps:

```bash
npm install
npm run dev
```

## Run with Docker (recommended)

Run from the repository root:

```bash
cp .env.example .env
docker compose up --build -d
```

Check indexer logs:

```bash
docker compose logs --tail=200 indexer
```

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```
