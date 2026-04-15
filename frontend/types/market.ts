export enum Outcome {
  UNRESOLVED = 0,
  YES = 1,
  NO = 2,
  INVALID = 3,
}

export interface MarketInfo {
  id: bigint;
  question: string;
  category: string;
  closingTime: bigint;
  resolutionTime: bigint;
  outcome: number;
  creator: `0x${string}`;
  resolved: boolean;
}

export interface Pool {
  yesReserve: bigint;
  noReserve: bigint;
  totalCollateral: bigint;
  lpFeeAccrued: bigint;
}

export interface Position {
  yesShares: bigint;
  noShares: bigint;
  claimed: boolean;
}

export interface MarketWithPool {
  market: MarketInfo;
  pool: Pool;
  yesProbability: number; // 0–1 float
}
