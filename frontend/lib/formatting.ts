import { USDC_DECIMALS } from "@/constants";
import { formatDistanceToNow } from "date-fns";

/** Format raw mUSDC bigint as human-readable string, e.g. "123.45" */
export function formatUsdc(raw: bigint, decimals = 2): string {
  const divisor = BigInt(10 ** USDC_DECIMALS);
  const whole = raw / divisor;
  const frac  = raw % divisor;
  const fracStr = frac.toString().padStart(USDC_DECIMALS, "0").slice(0, decimals);
  return `${whole}.${fracStr}`;
}

/** Format mUSDC with dollar sign and commas, e.g. "$1,234.56" */
export function formatMUSDC(raw: bigint): string {
  const value = Number(raw) / 10 ** USDC_DECIMALS;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Parse a float/string dollar amount to mUSDC bigint */
export function parseUsdc(amount: string | number): bigint {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.round(n * 10 ** USDC_DECIMALS));
}

/** Format 1e18-scaled probability to percentage string, e.g. "63.4%" */
export function formatProb(raw: bigint): string {
  const pct = (Number(raw) / 1e18) * 100;
  return `${pct.toFixed(1)}%`;
}

/** Format a 0-1 float probability to percentage string, e.g. "63.4%" */
export function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

/** Format 0-1 probability as a share price, e.g. 0.625 → "$0.63" */
export function formatSharePrice(p: number): string {
  return `$${p.toFixed(2)}`;
}

/** Convert 1e18-scaled probability to 0-1 float */
export function probToFloat(raw: bigint): number {
  return Number(raw) / 1e18;
}

/** Format shares (same 6-decimal precision as mUSDC) */
export function formatShares(raw: bigint): string {
  return formatUsdc(raw, 2);
}

/** Time remaining as human string, e.g. "12d 3h" or "Closed" */
export function formatTimeLeft(closingTime: bigint): string {
  const now  = BigInt(Math.floor(Date.now() / 1000));
  const diff = closingTime - now;
  if (diff <= 0n) return "Closed";

  const totalSecs = Number(diff);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);

  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Short address: 0x1234…abcd */
export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Truncate address: 0x1234...abcd (with dots, compatible with etherscan links) */
export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Relative time: "2 minutes ago", "1 hour ago" */
export function formatTimeAgo(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

/** Sepolia Etherscan URL for tx or address */
export function getEtherscanUrl(type: "tx" | "address", hash: string): string {
  return `https://sepolia.etherscan.io/${type}/${hash}`;
}
