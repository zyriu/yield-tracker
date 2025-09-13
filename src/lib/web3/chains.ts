export type Chain = "ethereum" | "arbitrum" | "hyperliquid";

export type ChainId = 1 | 42161 | 999;

export const CHAINS: Record<ChainId, Chain> = {
  1: "ethereum",
  42161: "arbitrum",
  999: "hyperliquid",
};
