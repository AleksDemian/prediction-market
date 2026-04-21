export const MARKET_ADDRESS = (
  process.env.MARKET_ADDRESS ??
  process.env.NEXT_PUBLIC_MARKET_ADDRESS ??
  ""
) as `0x${string}`;

export const PREDICTION_MARKET_ABI = [
  {
    type: "function",
    name: "getMarket",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "question", type: "string" },
          { name: "category", type: "string" },
          { name: "closingTime", type: "uint64" },
          { name: "resolutionTime", type: "uint64" },
          { name: "outcome", type: "uint8" },
          { name: "creator", type: "address" },
          { name: "resolved", type: "bool" },
        ],
      },
      {
        name: "",
        type: "tuple",
        components: [
          { name: "yesReserve", type: "uint256" },
          { name: "noReserve", type: "uint256" },
          { name: "totalCollateral", type: "uint256" },
          { name: "lpFeeAccrued", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "category", type: "string", indexed: false },
      { name: "closingTime", type: "uint64", indexed: false },
      { name: "resolutionTime", type: "uint64", indexed: false },
      { name: "creator", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SharesBought",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "isYes", type: "bool", indexed: false },
      { name: "collateralIn", type: "uint256", indexed: false },
      { name: "sharesOut", type: "uint256", indexed: false },
      { name: "newYesProbability", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SharesSold",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "isYes", type: "bool", indexed: false },
      { name: "sharesIn", type: "uint256", indexed: false },
      { name: "collateralOut", type: "uint256", indexed: false },
      { name: "newYesProbability", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "resolver", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WinningsClaimed",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "claimer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
