# Prediction Market

A decentralized demo prediction market project on Sepolia:
- users buy/sell YES/NO shares through an AMM in the smart contract
- market outcomes are resolved by an admin
- the frontend displays live data from a local SQLite database populated by the indexer

## Repository Contents

- `contracts/` — Solidity contracts and Foundry scripts (deploy/seeding)
- `backend/` — TypeScript event indexer from RPC to SQLite
- `frontend/` — Next.js 16 UI + API routes reading from SQLite

Additional documentation:

- `backend/README.md` — backend indexer: env, run, tests, troubleshooting
- `frontend/README.md` — frontend: env, local run, Docker flow

## Architecture

Data flow:

1. The `PredictionMarket` contract emits events (`MarketCreated`, `SharesBought`, `SharesSold`, `MarketResolved`, `WinningsClaimed`).
2. The `backend` indexes chain events and writes them to SQLite (`/data/app.db`).
3. The `frontend` reads aggregated data from the same SQLite via server-side APIs (`/api/markets`, `/api/markets/[id]`, `/api/markets/[id]/activity`, `/api/markets/[id]/prices`, `/api/portfolio/[address]`).
4. The UI renders markets, details, price chart, activity, and portfolio.

In Docker, both services (`frontend`, `indexer`) share the same `app-data` volume:
- `indexer` mounts it read-write and writes the database
- `frontend` mounts it read-only and only reads

## Key Components

- `contracts/src/PredictionMarket.sol`:
  - buy/sell shares
  - `resolveMarket` (after `resolutionTime`, admin only)
  - `forceResolveMarket` (demo path, no time check, admin only)
  - `claimWinnings`
- `backend/src/indexer.ts`:
  - backfill + polling new blocks
  - upsert into `markets`, `trades`, `resolutions`, `claims`, `pool_snapshots`
- `backend/src/snapshot.ts`:
  - on-chain pool sync (`yesReserve/noReserve/totalCollateral`)
- `frontend/lib/queries.ts`:
  - SQL queries for frontend API routes
- `frontend/hooks/*`:
  - market data, price history, activity, trading, portfolio

## Run Flow (Docker)

1. Create `.env` from template:

```bash
cp .env.example .env
```

2. Fill in required variables:
- `MARKET_ADDRESS`
- `USDC_ADDRESS`
- `RPC_URL`
- `WALLETCONNECT_PROJECT_ID`
- `PRIVATE_KEY` (used by Foundry scripts and demo resolve API by default)
- `CONTRACT_DEPLOY_BLOCK` (optional; default `10696829`)

`docker-compose.yml` maps canonical variables to `NEXT_PUBLIC_*` for frontend build/runtime, so values are defined once in root `.env`.

3. Start the full stack with one command:

```bash
docker compose up --build -d
```

## Health Check

```bash
docker compose ps
docker compose logs --tail=100 frontend indexer
```

Expected state:
- `frontend` — `healthy`
- `indexer` — `Up`
- UI is available at `http://localhost:3000`
- health endpoint: `http://localhost:3000/api/health`

## Stop

```bash
docker compose down
```

Full cleanup with volume removal (destructive):

```bash
docker compose down -v
```
