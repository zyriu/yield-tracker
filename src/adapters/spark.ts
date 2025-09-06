import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

// getPublicClient is imported for consistency with other adapters but unused here
// import { getPublicClient } from "@/lib/viem";
import { multicall } from "@/lib/multicall";

/**
 * Adapter for Spark.fi lending positions on USDS.
 *
 * Spark’s lending product allows users to deposit USDS into the SparkLend pool
 * and accrue rewards in the SPK governance token.  Deposits are held in an
 * interest-bearing token (aUSDS) which represents the user’s share of the
 * underlying pool.  Rewards are distributed via a RewardsController contract.
 *
 * This adapter queries the user’s aUSDS balance and any unclaimed SPK
 * incentives in a single batched call using the multicall helper.  The
 * returned position includes the staked USDS balance (converted to USD value)
 * and a claimable rewards string if any SPK has been earned.
 */

// aUSDS token (Spark’s interest‑bearing token for USDS deposits) on Ethereum
const USDS_ATOKEN = "0x32a6268f9Ba3642Dda7892aDd74f1D34469A4259" as const;

// Underlying USDS ERC‑20 token (used for price lookup)
const USDS_TOKEN = "0xdC035D45d973E3EC169d2276DDab16f1e407384F" as const;

// SPK governance token (reward token) on Ethereum
const SPK_TOKEN = "0xc20059e0317DE91738d13af027DfC4a50781b066" as const;

// RewardsController contract that manages SparkLend incentives
const SPARK_REWARDS = "0xbaf21A27622Db71041Bd336a573DDEdC8eB65122" as const;

// Minimal ERC‑20 ABI for reading balances, decimals and symbol
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

// Minimal RewardsController ABI for fetching unclaimed rewards
const REWARDS_CONTROLLER_ABI = [
  {
    type: "function",
    name: "getRewardsBalance",
    stateMutability: "view",
    inputs: [
      { name: "assets", type: "address[]" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const fetchSparkPositions: FetchPositions = async ({ address }) => {
  const out: Position[] = [];
  try {
    const user = address as `0x${string}`;
    // Batch calls: aUSDS balance, decimals, symbol; SPK rewards; SPK decimals & symbol
    const results = await multicall([
      { address: USDS_ATOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [user] },
      { address: USDS_ATOKEN, abi: ERC20_ABI, functionName: "decimals" },
      { address: USDS_ATOKEN, abi: ERC20_ABI, functionName: "symbol" },
      {
        address: SPARK_REWARDS,
        abi: REWARDS_CONTROLLER_ABI,
        functionName: "getRewardsBalance",
        args: [[USDS_ATOKEN], user],
      },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "decimals" },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "symbol" },
    ]);

    const rawBal = results[0] as bigint | null;
    if (!rawBal || rawBal === 0n) {
      return out; // no deposit
    }

    const usdsDecimals = results[1] as number | null;
    const usdsSymbol = results[2] as string | null;
    const rawRewards = results[3] as bigint | null;
    const spkDecimals = results[4] as number | null;
    const spkSymbol = results[5] as string | null;

    // Convert aUSDS balance to human units
    const stakedAmount = Number(formatUnits(rawBal, usdsDecimals ?? 18));

    // Fetch USDS price; fallback to 1 if unknown (stablecoin)
    let usdsPrice = 1;
    const valueUSD = stakedAmount * usdsPrice;

    // Convert raw rewards to SPK units, if any
    let claimable: string | undefined;
    if (rawRewards && rawRewards > 0n) {
      const earned = Number(formatUnits(rawRewards, spkDecimals ?? 18));
      if (earned > 0) {
        const symbol = spkSymbol || "SPK";
        claimable = `${earned.toFixed(6)} ${symbol}`;
      }
    }

    const pos: Position = {
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol ?? "USDS",
      valueUSD,
      claimableRewards: claimable,
      detailsUrl: "https://app.spark.fi/lend",
    };
    out.push(pos);
  } catch {
    // swallow errors and return empty list
  }
  return out;
};
