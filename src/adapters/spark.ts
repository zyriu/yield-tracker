import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { multicall } from "@/lib/multicall";
import { getPricesUSD } from "@/lib/prices";
import { mainnetClient } from "@/lib/viem";
import { ERC20_ABI, SPK_FARM, SPK_TOKEN, STAKING_REWARDS_ABI, USDS_TOKEN } from "@/lib/web3";

const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

export const fetchSparkPositions: FetchPositions = async ({ address }) => {
  const out: Position[] = [];

  try {
    const blockNumber = await mainnetClient.getBlockNumber();
    const user = address as `0x${string}`;

    // Fetch current staked balance, earned rewards, token decimals/symbols
    const [rawDeposit, rawEarned, usdsDecimals, usdsSymbol, spkDecimals, spkSymbol] = (await multicall(mainnetClient, [
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "balanceOf", args: [user], blockNumber },
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "earned", args: [user], blockNumber },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "decimals", blockNumber },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "symbol", blockNumber },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "decimals", blockNumber },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "symbol", blockNumber },
    ])) as [bigint | null, bigint | null, number | null, string | null, number | null, string | null];

    // If the user has no staked USDS, return early
    if (!rawDeposit || rawDeposit === 0n) return out;

    // Convert staked USDS to a human‑readable amount; treat 1 USDS = 1 USD
    const deposit = Number(formatUnits(rawDeposit, usdsDecimals ?? 18));
    const valueUSD = deposit;

    // Format claimable SPK rewards, if any
    let claimable: string | undefined;
    let claimableRewardsValueUSD: number | undefined;
    const currentEarnedFloat = rawEarned && rawEarned > 0n ? Number(formatUnits(rawEarned, spkDecimals ?? 18)) : 0;
    if (currentEarnedFloat > 0) {
      const symbol = spkSymbol || "SPK";
      claimable = `${currentEarnedFloat.toFixed(2)} ${symbol}`;
    }

    // Initialise yield metrics
    let apr7d: number | undefined;
    let apy: number | undefined;

    // Calculate block numbers 7 and 30 days ago
    const past7 = blockNumber > BLOCKS_7D ? blockNumber - BLOCKS_7D : 0n;
    const past30 = blockNumber > BLOCKS_30D ? blockNumber - BLOCKS_30D : 0n;

    const [pastDeposit7Raw, pastRewards7Raw, pastDeposit30Raw, pastRewards30Raw] = (await multicall(mainnetClient, [
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "balanceOf", args: [user], blockNumber: past7 },
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "earned", args: [user], blockNumber: past7 },
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "balanceOf", args: [user], blockNumber: past30 },
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "earned", args: [user], blockNumber: past30 },
    ])) as [bigint, bigint, bigint, bigint];

    // Convert past deposits to floats (USDS is stable)
    const depositPast7 = Number(formatUnits(pastDeposit7Raw, usdsDecimals ?? 18));
    const depositPast30 = Number(formatUnits(pastDeposit30Raw, usdsDecimals ?? 18));

    getPricesUSD();
    const spkPrice = 1;

    // If there are claimable rewards compute their USD value
    if (currentEarnedFloat > 0) {
      claimableRewardsValueUSD = currentEarnedFloat * spkPrice;
    }

    // Compute 7‑day reward delta and APR with fallback on current deposit when past deposit is zero
    if (rawEarned && pastRewards7Raw !== undefined) {
      const rewardDelta7Raw = rawEarned - pastRewards7Raw;
      const rewardDelta7Float = Number(formatUnits(rewardDelta7Raw, spkDecimals ?? 18));
      const rewardValue7USD = rewardDelta7Float * spkPrice;
      const depositDenom7 = depositPast7 > 0 ? depositPast7 : deposit;
      if (depositDenom7 > 0) {
        const r7 = rewardValue7USD / depositDenom7;
        apr7d = r7 * (365 / 7);
        // Also compute APY using 7‑day return as fallback
        apy = Math.pow(1 + r7, 365 / 7) - 1;
      }
    }

    // Compute 30‑day reward delta for APY if data is available, with fallback on current deposit
    if (depositPast30 > 0) {
      const rewardDelta30Raw = rawEarned && pastRewards30Raw ? rawEarned - pastRewards30Raw : 0n;
      const rewardDelta30Float = Number(formatUnits(rewardDelta30Raw, spkDecimals ?? 18));
      const rewardValue30USD = rewardDelta30Float * spkPrice;
      const depositDenom30 = depositPast30 > 0 ? depositPast30 : deposit;
      if (depositDenom30 > 0) {
        const r30 = rewardValue30USD / depositDenom30;
        apy = Math.pow(1 + r30, 365 / 30) - 1;
      }
    }

    out.push({
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol || "USDS",
      valueUSD,
      claimableRewards: claimable,
      claimableRewardsValueUSD,
      apr7d,
      apy,
      detailsUrl: "https://app.spark.fi/farms",
    });
  } catch {
    /* empty */
  }

  return out;
};
