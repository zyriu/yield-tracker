import type { FetchPositions, Position } from "./types";

/**
 * Adapter for Sky.money positions.
 *
 * Sky.money does not currently expose a public API for per-wallet positions,
 * yields, or claimable SKY rewards.  This adapter is a placeholder showing
 * where such logic would be implemented when an API becomes available.
 *
 * Real implementation steps:
 *  - Query Sky.money’s subgraph or contract for user positions and yields.
 *  - Compute APR/APY and USD valuation from the contract’s interest rate model.
 *  - Fetch claimable SKY rewards via Sky’s reward-distribution contract.
 *
 * Until that API is available, this adapter returns an empty array.
 */
export const fetchSkyPositions: FetchPositions = async ({ address }) => {
  const out: Position[] = [];
  return out;
};
