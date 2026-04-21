# Prediction Market

Децентралізований демо-проєкт prediction market на Sepolia:
- користувачі купують/продають YES/NO шери через AMM у смартконтракті
- результати ринків резолвляться адміном
- фронтенд показує актуальні дані з локальної SQLite-бази, яку наповнює індексер

## Що є в репозиторії

- `contracts/` — Solidity-контракти та скрипти Foundry (деплой/сідинг)
- `backend/` — TypeScript-індексер подій з RPC у SQLite
- `frontend/` — Next.js 16 UI + API-роути для читання з SQLite

## Архітектура

Потік даних:

1. `PredictionMarket` контракт емітить події (`MarketCreated`, `SharesBought`, `SharesSold`, `MarketResolved`, `WinningsClaimed`).
2. `backend` індексує події з мережі та пише їх у SQLite (`/data/app.db`).
3. `frontend` читає агреговані дані з цієї ж SQLite через server-side API (`/api/markets`, `/api/markets/[id]`, `/api/markets/[id]/activity`, `/api/markets/[id]/prices`, `/api/portfolio/[address]`).
4. UI рендерить ринки, деталі, графік цін, активність та портфель.

У Docker обидва сервіси (`frontend`, `indexer`) шарять один volume `app-data`:
- `indexer` монтує його rw і пише БД
- `frontend` монтує його ro і тільки читає

## Ключові компоненти

- `contracts/src/PredictionMarket.sol`:
  - купівля/продаж шерів
  - `resolveMarket` (після `resolutionTime`, тільки admin)
  - `forceResolveMarket` (демо-шлях, без time check, тільки admin)
  - `claimWinnings`
- `backend/src/indexer.ts`:
  - backfill + polling нових блоків
  - upsert у таблиці `markets`, `trades`, `resolutions`, `claims`, `pool_snapshots`
- `backend/src/snapshot.ts`:
  - синхронізація on-chain пулів (`yesReserve/noReserve/totalCollateral`)
- `frontend/lib/queries.ts`:
  - SQL-запити для API-роутів фронтенду
- `frontend/hooks/*`:
  - дані ринків, історія цін, активність, трейдинг, портфель

## Схема запуску (Docker)

1. Створити `.env` з шаблону:

```bash
cp .env.example .env
```

2. Заповнити обов'язкові змінні:
- `NEXT_PUBLIC_MARKET_ADDRESS`
- `NEXT_PUBLIC_USDC_ADDRESS`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `DEMO_ADMIN_PRIVATE_KEY` (потрібен для demo resolve API)

3. Підняти весь стек однією командою:

```bash
docker compose up --build -d
```

## Перевірка працездатності

```bash
docker compose ps
docker compose logs --tail=100 frontend indexer
```

Очікуваний стан:
- `frontend` — `healthy`
- `indexer` — `Up`
- UI доступний на `http://localhost:3000`
- health endpoint: `http://localhost:3000/api/health`

## Зупинка

```bash
docker compose down
```

Повна очистка з видаленням volume (destructive):

```bash
docker compose down -v
```
