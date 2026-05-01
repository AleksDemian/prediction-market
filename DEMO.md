# Prediction Market — Demo Guide

A live demo of binary YES/NO prediction markets on Sepolia testnet.
Users trade shares through a constant-product AMM; an admin resolves outcomes.

---

## Architecture at a Glance

```
Smart contracts (Sepolia)
        │  events
        ▼
  Backend indexer  ──writes──▶  SQLite (/data/app.db)
                                    │
                              Frontend reads
                                    │
                              Browser UI (localhost:3000)
```

- **PredictionMarket.sol** — AMM-based binary markets with buy/sell/claim
- **MockUSDC.sol** — ERC-20 test token with a public faucet (1 000 mUSDC / 24 h)
- **Backend** — TypeScript indexer that backfills and polls Sepolia events into SQLite
- **Frontend** — Next.js 16 app; all data comes from SQLite via server-side API routes

---

## Step 1 — Start the Stack

### Prerequisites

- Docker + Docker Compose
- MetaMask (or any EVM wallet) pointed at **Sepolia testnet**
- Sepolia ETH for gas (free at any Sepolia faucet)

### Configure

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | What it is |
|---|---|
| `MARKET_ADDRESS` | Deployed `PredictionMarket` contract address |
| `USDC_ADDRESS` | Deployed `MockUSDC` contract address |
| `RPC_URL` | Sepolia RPC (Alchemy / Infura free tier works) |
| `WALLETCONNECT_PROJECT_ID` | From cloud.walletconnect.com (or leave `demo`) |
| `PRIVATE_KEY` | Admin wallet private key (used by Foundry scripts) |

### Launch

```bash
docker compose up --build -d
```

```bash
docker compose ps          # both services should be Up / healthy
docker compose logs -f     # watch indexer backfill progress
```

UI is available at **http://localhost:3000**

---

## Step 2 — Connect Your Wallet

1. Open **http://localhost:3000**
2. Click **Connect Wallet** (top right) → choose MetaMask or any WalletConnect wallet
3. Switch to **Sepolia** network when prompted
4. Your connected address appears in the header

---

## Step 3 — Get Test mUSDC

mUSDC is the demo collateral token (6 decimals, 1 mUSDC = 1 USDC equivalent on testnet).

**Option A — Faucet button in the header**

Click **Get mUSDC** in the top-right area. Sign the transaction in your wallet. After ~15 seconds you receive **1 000 mUSDC**. The button enters a **24-hour cooldown** after each use.

> You need a small amount of Sepolia ETH for gas. Get it free from any Sepolia faucet (e.g. sepoliafaucet.com).

---

## Step 4 — Browse Markets

The **Markets** page (home `/`) lists all active and resolved markets.

- Each card shows the current YES/NO probability derived from AMM pool reserves
- Filter by **status** (open / resolved) or **category** using the filter bar
- Click any market card to open the detail page

---

## Step 5 — Trade Shares

Open any open market → detail page (`/market/[id]`).

### Reading the market

| Element | Meaning |
|---|---|
| YES price (green) | Current cost per YES share in mUSDC |
| NO price (red) | Current cost per NO share in mUSDC |
| Probability bar | Visual split of YES% vs NO% |
| Liquidity | Total mUSDC backing the AMM pool |
| Volume | Cumulative trading volume |
| Price chart | YES probability history since market creation |

### Buying shares

1. Select **YES** or **NO** tab in the trade panel (right column)
2. Enter an amount in mUSDC (minimum 1 mUSDC)
3. Click **Buy**
4. **First trade only:** a two-step wallet prompt appears
   - Step 1: **Approve** mUSDC spend (sign in wallet)
   - Step 2: **Buy shares** transaction (sign in wallet)
5. Subsequent trades use the existing allowance and require only one signature

The price chart and probability bar update within ~30 seconds after the indexer picks up the event.

### Selling shares

1. Select **Sell** tab in the trade panel
2. Enter the number of shares to sell
3. Click **Sell** → sign in wallet
4. mUSDC is returned to your wallet minus the 2% AMM fee

### Your positions

The **Shares Held** section on the market detail page shows your current YES and NO share balances for that market. The **Portfolio** page (`/portfolio`) aggregates all positions across every market.

---

## Step 6 — Resolve a Market (Admin)

The **Admin Panel** (`/admin`) is available to anyone connected as the admin wallet.

### Manual resolution (wallet connected as admin)

1. Navigate to `/admin`
2. Find the market in the **Unresolved** list
3. Click **YES**, **NO**, or **INVALID** on the `ResolveMarketCard`
4. Confirm the `forceResolveMarket` transaction in your wallet

`forceResolveMarket` skips the `resolutionTime` check — it resolves immediately regardless of when the market was supposed to close. This is intentional for demo purposes.

---

## Step 7 — Create a New Market (Admin)

1. Navigate to `/admin`
2. Fill in the **Create market** form at the top:
   - **Question** — e.g. "Will ETH reach $5,000 by July 2026?"
   - **Category** — free text label (e.g. "Crypto", "Demo")
   - **Closing time** — trading stops at this datetime
   - **Resolution time** — earliest time admin can resolve (must be ≥ closing time)
   - **Initial liquidity** — mUSDC seeded into the AMM pool (minimum 1 000 mUSDC)
3. Click **Create market**
   - If your allowance is insufficient, an **Approve** transaction fires first
   - Then the **createMarket** transaction fires
4. The market appears in the list within ~30 seconds after indexing

---

## Step 8 — Claim Winnings

After a market resolves, winning shareholders can redeem their shares for mUSDC.

1. Go to the market detail page (`/market/[id]`)
2. The trade panel switches to a **Claim** panel showing your claimable amount
3. Click **Claim Winnings** → sign in wallet
4. mUSDC is transferred to your wallet (1 mUSDC per winning share, pro-rated for INVALID)

Alternatively, the **Portfolio** page shows all claimable positions with a Claim button next to each.

---

## Demo Flow End-to-End (Quick Reference)

```
Connect wallet
    → Get 1 000 mUSDC from faucet
    → Open a market
    → Buy 20 mUSDC of YES shares
    → Admin resolves market as YES
    → Claim winnings  ✓
```

---

## Useful URLs

| URL | What it is |
|---|---|
| `http://localhost:3000` | Main UI |
| `http://localhost:3000/admin` | Admin panel (create / resolve) |
| `http://localhost:3000/portfolio` | Your positions (requires wallet) |
| `http://localhost:3000/api/health` | JSON health check |
| `https://sepolia.etherscan.io/address/<MARKET_ADDRESS>` | Contract on Etherscan |

---

## Stop the Stack

```bash
docker compose down          # stop containers, keep database volume
docker compose down -v       # stop + delete database (full reset)
```
