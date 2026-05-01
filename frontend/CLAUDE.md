# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack, localhost:3000)
npm run build    # Production build (Turbopack, standalone output)
npm start        # Start production server (requires prior build)
npm run lint     # Run ESLint via ESLint CLI (not next lint — v16 change)
```

No test suite is configured. There is no `npm test` command.

## Architecture

### Tech Stack

- **Next.js 16.2.3** — App Router, Turbopack by default (no `--turbopack` flag needed)
- **React 19.2.4** — uses canary features via App Router
- **TailwindCSS v4** — configured via `@theme` inline in `app/globals.css`, no `tailwind.config.js`
- **wagmi 2 + viem 2** — Ethereum interactions; all contract calls go through wagmi hooks
- **RainbowKit 2** — wallet connection UI (dark theme, custom BoostyLabs accent)
- **TanStack React Query v5** — server state; default `staleTime: 10_000ms`

### Directory Layout

```
app/
  layout.tsx          # Root layout — mounts Providers, Header
  providers.tsx       # Provider tree: Wagmi → QueryClient → RainbowKit → Toast
  page.tsx            # Market listing page
  globals.css         # Tailwind v4 @theme tokens (brand colors, dark theme)
  api/
    health/           # GET  — health check
  market/[id]/        # Dynamic market detail page

components/           # React components by domain
  ui/                 # Primitive UI elements
  layout/             # Header, navigation
  markets/            # Market cards, list, detail
  trading/            # Buy/sell share panels

hooks/                # Custom wagmi-based hooks
  useTrading.ts       # Buy/sell/claim flow with allowance checks
  useMarkets.ts       # Fetch all markets
  useMarket.ts        # Fetch single market
  useAllowance.ts     # ERC-20 allowance + approve
  useUserPositions.ts # User share positions

lib/
  contracts.ts        # All contract ABIs (PredictionMarket, MockUSDC)
  wagmi.ts            # wagmi config (chains, transports, QueryClient)
  formatting.ts       # Number/date helpers

constants/            # Chain IDs, addresses, fee constants (2% / 200 BPS), min trade (1 mUSDC)
types/                # Market, Pool, Position interfaces; Outcome enum
```

### Environment Variables

Client-exposed (`NEXT_PUBLIC_` prefix required):
- `NEXT_PUBLIC_MARKET_ADDRESS` — deployed PredictionMarket contract
- `NEXT_PUBLIC_USDC_ADDRESS` — deployed MockUSDC contract
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — defaults to `"demo"` if unset
- `NEXT_PUBLIC_RPC_URL` — optional Sepolia RPC override

See `.env.example` for the full list.

### Key Next.js 16 Differences

- **Turbopack is the default** for both `dev` and `build`. Webpack is opt-in via `--webpack`.
- `experimental.turbopack` config moved to top-level `turbopack` in `next.config.ts`.
- `next lint` is replaced by calling the ESLint CLI directly.
- `headers()`, `cookies()` and similar APIs are now `async` — always `await` them.
- Route Handler `context.params` is now a Promise — `const { id } = await ctx.params`.
- Node.js ≥ 20.9 required; TypeScript ≥ 5.1 required.
- Always check `node_modules/next/dist/docs/` before writing new Next.js patterns.

### Contract Integration

Trading flow (see `hooks/useTrading.ts`):
1. Check USDC allowance via `useAllowance`
2. If insufficient, call `MockUSDC.approve(marketAddress, amount)`
3. Call `PredictionMarket.buyShares(marketId, outcomeIndex, amount)`
4. On resolution, call `PredictionMarket.claimWinnings(marketId)`

All ABIs live in `lib/contracts.ts`. Contract addresses come from constants or env vars.

### Docker

Multi-stage build: deps → builder (injects `NEXT_PUBLIC_*` build args) → runner (Node 24 alpine, standalone output). The final image runs `node server.js` on port 3000.
