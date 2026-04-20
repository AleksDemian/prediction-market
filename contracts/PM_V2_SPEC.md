# PredictionMarket PM v2 Spec

## Scope

This specification defines the v2 binary market math used by `PredictionMarket.sol`.
The goal is to keep outcome share pricing in the `0..1` probability range while keeping
`1 winning share = 1 mUSDC` at claim time.

## Core Model

- Each market has AMM share reserves: `yesReserve` and `noReserve`.
- Collateral and shares are treated as separate concepts.
- A buy first mints `netIn` complete sets (YES + NO), then swaps into the chosen side.
- A sell does the inverse: add side shares, then remove complete sets as collateral.

## Invariants

- `k = yesReserve * noReserve` is preserved by trade transforms (ignoring integer rounding).
- `yesPrice + noPrice ~= 1` where `yesPrice = noReserve / (yesReserve + noReserve)`.
- Claim payout stays `1:1` with winning shares:
  - `YES` outcome: `payout = yesShares`
  - `NO` outcome: `payout = noShares`
  - `INVALID`: `payout = yesShares + noShares`

## Buy Quote

Given collateral input `collateralIn`:

- `fee = collateralIn * FEE_BPS / 10_000`
- `netIn = collateralIn - fee`

Buy YES:

- `newNo = noReserve + netIn`
- `newYes = k / newNo`
- `sharesOut = (yesReserve + netIn) - newYes`

Buy NO is symmetric.

## Sell Quote

Given `sharesIn` for side `isYes`, gross collateral out is:

- `sum = yesReserve + noReserve + sharesIn`
- `term = sharesIn * (isYes ? noReserve : yesReserve)`
- `disc = sum^2 - 4*term`
- `grossOut = (sum - sqrt(disc)) / 2`
- `fee = grossOut * FEE_BPS / 10_000`
- `collateralOut = grossOut - fee`

## Accounting

- `totalCollateral` tracks live collateral in the market.
- On buy: increase by full `collateralIn`.
- On sell: decrease by `collateralOut` (fee remains in pool collateral).
- `lpFeeAccrued` tracks cumulative retained fees.
