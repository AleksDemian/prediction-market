# Frontend (Next.js 16)

Prediction market UI. It interacts with the on-chain contract via `wagmi/viem` and reads indexed data from SQLite through API routes.

## What the Frontend Provides

- market list and cards with live prices
- market detail page with chart, activity, and trading panel
- user portfolio

## Environment Variables

For Docker/handoff flow, define canonical values in root `.env` (`MARKET_ADDRESS`, `USDC_ADDRESS`, `RPC_URL`, `CHAIN_ID`, `WALLETCONNECT_PROJECT_ID`). Docker maps them to `NEXT_PUBLIC_*` for frontend.

Client variables (`NEXT_PUBLIC_*`):

- `NEXT_PUBLIC_MARKET_ADDRESS` — `PredictionMarket` contract address
- `NEXT_PUBLIC_USDC_ADDRESS` — `MockUSDC` address
- `NEXT_PUBLIC_CHAIN_ID` — chain id (default: `11155111`, Sepolia)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — WalletConnect project id (if unset, code uses `"demo"`)
- `NEXT_PUBLIC_RPC_URL` — RPC endpoint for wagmi transport

Server variables:

- `DATABASE_PATH` — SQLite path (default for local dev: `../data/app.db`; in Docker: `/data/app.db`)

Local template file: `frontend/.env.local.example`.

## Local Run (without Docker)

Prerequisites:

- Node.js 22+
- running backend indexer writing to SQLite

Steps:

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

UI will be available at [http://localhost:3000](http://localhost:3000).

## Run with Docker (recommended)

Run frontend from the repository root together with the indexer:

```bash
cp .env.example .env
docker compose up --build -d
```

Verification:

```bash
docker compose ps
docker compose logs --tail=100 frontend
```

Health endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Useful Commands

```bash
npm run dev
npm run build
npm start
npm run lint
```
