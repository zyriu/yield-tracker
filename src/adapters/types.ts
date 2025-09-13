import { Prices } from "@/lib/coingecko/prices";
import { Chain } from "@/lib/web3/chains";

export type Protocol = "pendle" | "ethena" | "spark" | "sky";

export interface Position {
  protocol: Protocol;
  chain: Chain;
  address: string;
  asset: string;
  marketProtocol?: string;
  apr7d?: number;
  lifetimeAPR?: number;
  valueUSD: number;
  detailsUrl?: string;
  claimableRewards?: string;
  claimableRewardsValueUSD?: number;
}

export type FetchPositions = (_args: { address: string; pricesUSD: Prices }) => Promise<Position[]>;
