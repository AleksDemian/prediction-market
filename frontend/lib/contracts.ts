import { MARKET_ADDRESS, USDC_ADDRESS } from "@/constants";

// ── PredictionMarket ABI ─────────────────────────────────────────────────────
export const PREDICTION_MARKET_ABI = [
  // ── View ──────────────────────────────────────────────────────────────────
  { type: "function", name: "getAllMarkets", inputs: [], outputs: [{ name: "mArr", type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "question", type: "string" }, { name: "category", type: "string" }, { name: "closingTime", type: "uint64" }, { name: "resolutionTime", type: "uint64" }, { name: "outcome", type: "uint8" }, { name: "creator", type: "address" }, { name: "resolved", type: "bool" }] }, { name: "pArr", type: "tuple[]", components: [{ name: "yesReserve", type: "uint256" }, { name: "noReserve", type: "uint256" }, { name: "totalCollateral", type: "uint256" }, { name: "lpFeeAccrued", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getMarket", inputs: [{ name: "marketId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "question", type: "string" }, { name: "category", type: "string" }, { name: "closingTime", type: "uint64" }, { name: "resolutionTime", type: "uint64" }, { name: "outcome", type: "uint8" }, { name: "creator", type: "address" }, { name: "resolved", type: "bool" }] }, { name: "", type: "tuple", components: [{ name: "yesReserve", type: "uint256" }, { name: "noReserve", type: "uint256" }, { name: "totalCollateral", type: "uint256" }, { name: "lpFeeAccrued", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getUserPosition", inputs: [{ name: "marketId", type: "uint256" }, { name: "user", type: "address" }], outputs: [{ name: "", type: "tuple", components: [{ name: "yesShares", type: "uint256" }, { name: "noShares", type: "uint256" }, { name: "claimed", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "getUserMarketIds", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "getYesProbability", inputs: [{ name: "marketId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getSharesOut", inputs: [{ name: "marketId", type: "uint256" }, { name: "isYes", type: "bool" }, { name: "collateralIn", type: "uint256" }], outputs: [{ name: "sharesOut", type: "uint256" }, { name: "fee", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getCollateralOut", inputs: [{ name: "marketId", type: "uint256" }, { name: "isYes", type: "bool" }, { name: "sharesIn", type: "uint256" }], outputs: [{ name: "collateralOut", type: "uint256" }, { name: "fee", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "marketCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // ── Write ─────────────────────────────────────────────────────────────────
  { type: "function", name: "buyShares", inputs: [{ name: "marketId", type: "uint256" }, { name: "isYes", type: "bool" }, { name: "collateralIn", type: "uint256" }, { name: "minSharesOut", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "sellShares", inputs: [{ name: "marketId", type: "uint256" }, { name: "isYes", type: "bool" }, { name: "sharesIn", type: "uint256" }, { name: "minCollateralOut", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimWinnings", inputs: [{ name: "marketId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "resolveMarket", inputs: [{ name: "marketId", type: "uint256" }, { name: "outcome", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "forceResolveMarket", inputs: [{ name: "marketId", type: "uint256" }, { name: "outcome", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "createMarket", inputs: [{ name: "question", type: "string" }, { name: "category", type: "string" }, { name: "closingTime", type: "uint64" }, { name: "resolutionTime", type: "uint64" }, { name: "initialLiquidity", type: "uint256" }], outputs: [{ name: "marketId", type: "uint256" }], stateMutability: "nonpayable" },
  // ── Events ────────────────────────────────────────────────────────────────
  { type: "event", name: "MarketCreated", inputs: [{ name: "marketId", type: "uint256", indexed: true }, { name: "question", type: "string", indexed: false }, { name: "category", type: "string", indexed: false }, { name: "closingTime", type: "uint64", indexed: false }, { name: "resolutionTime", type: "uint64", indexed: false }, { name: "creator", type: "address", indexed: true }], anonymous: false },
  { type: "event", name: "SharesBought", inputs: [{ name: "marketId", type: "uint256", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "isYes", type: "bool", indexed: false }, { name: "collateralIn", type: "uint256", indexed: false }, { name: "sharesOut", type: "uint256", indexed: false }, { name: "newYesProbability", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "SharesSold", inputs: [{ name: "marketId", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "isYes", type: "bool", indexed: false }, { name: "sharesIn", type: "uint256", indexed: false }, { name: "collateralOut", type: "uint256", indexed: false }, { name: "newYesProbability", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "MarketResolved", inputs: [{ name: "marketId", type: "uint256", indexed: true }, { name: "outcome", type: "uint8", indexed: false }, { name: "resolver", type: "address", indexed: true }], anonymous: false },
  { type: "event", name: "WinningsClaimed", inputs: [{ name: "marketId", type: "uint256", indexed: true }, { name: "claimer", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }], anonymous: false },
] as const;

// ── MockUSDC ABI ─────────────────────────────────────────────────────────────
export const MOCK_USDC_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "faucet", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "lastFaucet", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "pure" },
  { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }], anonymous: false },
] as const;

// ── Contract config shortcuts ────────────────────────────────────────────────
export const predictionMarketConfig = {
  address: MARKET_ADDRESS,
  abi: PREDICTION_MARKET_ABI,
} as const;

export const mockUsdcConfig = {
  address: USDC_ADDRESS,
  abi: MOCK_USDC_ABI,
} as const;
