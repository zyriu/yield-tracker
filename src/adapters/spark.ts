import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { multicall } from "@/lib/multicall";
import { ERC20_ABI, SPK_FARM, SPK_TOKEN, STAKING_REWARDS_ABI, USDS_TOKEN } from "@/lib/web3";

export const fetchSparkPositions: FetchPositions = async ({ address }) => {
  const out: Position[] = [];
  try {
    const user = address as `0x${string}`;
    // Batch calls: staked USDS balance, earned SPK rewards, USDS decimals & symbol, SPK decimals & symbol
    const results = await multicall([
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "balanceOf", args: [user] },
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "earned", args: [user] },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "decimals" },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "symbol" },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "decimals" },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "symbol" },
    ]);

    console.log(user, results);

    const rawDeposit = results[0] as bigint | null;
    const rawEarned = results[1] as bigint | null;
    const usdsDecimals = results[2] as number | null;
    const usdsSymbol = results[3] as string | null;
    const spkDecimals = results[4] as number | null;
    const spkSymbol = results[5] as string | null;

    // If no deposit, return empty
    if (!rawDeposit || rawDeposit === 0n) return out;

    // Convert staked USDS to human amount; treat USDS as 1 USD per unit
    const depositAmount = Number(formatUnits(rawDeposit, usdsDecimals ?? 18));
    const valueUSD = depositAmount; // stablecoin pegged to USD

    // Format claimable SPK rewards, if any
    let claimable: string | undefined;
    if (rawEarned && rawEarned > 0n) {
      const earned = Number(formatUnits(rawEarned, spkDecimals ?? 18));
      if (earned > 0) {
        const symbol = spkSymbol || "SPK";
        // Show up to 6 decimals for readability
        claimable = `${earned.toFixed(2)} ${symbol}`;
      }
    }

    out.push({
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol || "USDS",
      valueUSD,
      claimableRewards: claimable,
      detailsUrl: "https://app.spark.fi/farms",
    });
  } catch {
    // ignore errors and return empty
  }
  return out;
};
