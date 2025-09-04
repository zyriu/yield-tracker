export type Protocol = "pendle" | "ethena";
export type Chain =
  | "ethereum"
  | "arbitrum"
  | "base"
  | "solana"
  | "avalanche"
  | "polygon"
  | "hyperliquid";

export type Position = {
  protocol: Protocol;
  chain: Chain;
  address: string;
  asset: string;

  apr7d?: number;    // simple, annualized from last 7 days
  apr30d?: number;   // simple, annualized from last 30 days
  apy30d?: number;   // compounded, annualized from last 30 days

  valueUSD: number;
  health?: number;
  detailsUrl?: string;
};

export type FetchPositions = (args: { address: string }) => Promise<Position[]>;
