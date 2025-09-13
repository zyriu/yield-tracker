export type Chain =
  | "ethereum"
  | "optimism"
  | "bnb smart chain"
  | "sonic"
  | "hyperliquid"
  | "mantle"
  | "base"
  | "arbitrum"
  | "berachain";

export type ChainId = 1 | 10 | 56 | 146 | 999 | 5000 | 8453 | 42161 | 80094;

export const CHAINS: Record<ChainId, Chain> = {
  1: "ethereum",
  10: "optimism",
  56: "bnb smart chain",
  146: "sonic",
  999: "hyperliquid",
  5000: "mantle",
  8453: "base",
  42161: "arbitrum",
  80094: "berachain",
};
