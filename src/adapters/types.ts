export type Protocol = "pendle" | "ethena" | "spark" | "sky";
export type Chain = "ethereum" | "arbitrum" | "hyperliquid";

export interface Position {
  /**
   * Top-level protocol that produced the position (e.g. pendle, ethena, spark, sky).
   */
  protocol: Protocol;
  /**
   * EVM chain on which the position lives.
   */
  chain: Chain;
  /**
   * Wallet address for which this position was fetched.
   */
  address: string;
  /**
   * Human-readable asset identifier.
   */
  asset: string;
  /**
   * The yield source or protocol backing a market (for Pendle; optional).
   */
  marketProtocol?: string;
  /**
   * Annual percentage rate extrapolated from a 7-day window, if available.
   */
  apr7d?: number;
  /**
   * Annual percentage rate extrapolated from a 30-day window, if available.
   */
  apr30d?: number;
  /**
   * Annual percentage yield computed from a 30-day window using compounding, if available.
   */
  apy30d?: number;
  /**
   * Current USD valuation of the position. Zero if unknown.
   */
  valueUSD: number;
  /**
   * Optional URL to view more details about the position.
   */
  detailsUrl?: string;
  /**
   * Claimable rewards in the protocol’s native token (e.g., “2 SPK” for Spark,
   * “3 SKY” for Sky). Used for the “Current yield” column.
   */
  claimableRewards?: string;
}
export type FetchPositions = (args: { address: string }) => Promise<Position[]>;
