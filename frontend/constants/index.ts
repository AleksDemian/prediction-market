export const SEPOLIA_CHAIN_ID = 11155111;

export const MARKET_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const USDC_ADDRESS   = (process.env.NEXT_PUBLIC_USDC_ADDRESS   ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const MIN_TRADE_USDC = 1n * 10n ** 6n;  // 1 mUSDC
export const USDC_DECIMALS  = 6;
export const FEE_BPS        = 200n; // 2%
