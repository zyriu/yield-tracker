export type Protocol = "pendle" | "ethena" | "spark" | "sky";
export type Chain = "ethereum" | "arbitrum" | "hyperliquid";

export interface Position {
  protocol: Protocol;
  chain: Chain;
  address: string;
  asset: string;
  marketProtocol?: string;
  apr7d?: number;
  apr30d?: number;
  apy30d?: number;
  valueUSD: number;
  detailsUrl?: string;
  claimableRewards?: string;
}
export type FetchPositions = (args: { address: string }) => Promise<Position[]>;
