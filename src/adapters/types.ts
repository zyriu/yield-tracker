import { Prices } from "@/lib/coingecko/prices";

export type Protocol = "pendle" | "ethena" | "spark" | "sky";
export type Chain = "ethereum" | "arbitrum" | "hyperliquid";

export interface Position {
  protocol: Protocol;
  chain: Chain;
  address: string;
  asset: string;
  marketProtocol?: string;
  apr7d?: number;
  apy?: number;
  valueUSD: number;
  detailsUrl?: string;
  claimableRewards?: string;
  claimableRewardsValueUSD?: number;
}

export type FetchPositions = (_args: { address: string; pricesUSD: Prices }) => Promise<Position[]>;
