import { Abi, formatUnits } from "viem";

import { handleAdapterError } from "./utils";

import type { FetchPositions, Position } from "./types";

import { abis, contracts } from "@/lib/web3";
import { multicall } from "@/lib/web3/multicall";
import { mainnetClient } from "@/lib/web3/viem";

const erc20 = abis.erc20 as Abi;
const rewards = abis.ethereum.spark.rewards as Abi;
const { farm, spk, USDS } = contracts.ethereum.spark;

export const fetchSparkPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const user = address as `0x${string}`;
    const blockNow = await mainnetClient.getBlockNumber();

    // --- Current snapshot (1 multicall) ---
    const [rawDeposit, rawEarned, usdsDecimals, usdsSymbol, spkDecimals, spkSymbol] = (await multicall(mainnetClient, [
      { address: farm as `0x${string}`, abi: rewards, functionName: "balanceOf", args: [user], blockNumber: blockNow },
      { address: farm as `0x${string}`, abi: rewards, functionName: "earned", args: [user], blockNumber: blockNow },
      { address: USDS as `0x${string}`, abi: erc20, functionName: "decimals", blockNumber: blockNow },
      { address: USDS as `0x${string}`, abi: erc20, functionName: "symbol", blockNumber: blockNow },
      { address: spk as `0x${string}`, abi: erc20, functionName: "decimals", blockNumber: blockNow },
      { address: spk as `0x${string}`, abi: erc20, functionName: "symbol", blockNumber: blockNow },
    ])) as [bigint | null, bigint | null, number | null, string | null, number | null, string | null];

    if (!rawDeposit || rawDeposit === 0n) return out;

    const usdsDec = usdsDecimals ?? 18;
    const spkDec = spkDecimals ?? 18;
    const spkPrice = pricesUSD.spk ?? 0;

    const valueUSD = Number(formatUnits(rawDeposit, usdsDec));

    // Claimables
    const currentEarnedFloat = rawEarned && rawEarned > 0n ? Number(formatUnits(rawEarned, spkDec)) : 0;
    const claimable = currentEarnedFloat > 0 ? `${currentEarnedFloat.toFixed(2)} ${spkSymbol || "SPK"}` : undefined;
    const claimableRewardsValueUSD = currentEarnedFloat > 0 && spkPrice > 0 ? currentEarnedFloat * spkPrice : undefined;

    out.push({
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol || "USDS",
      valueUSD,
      claimableRewards: claimable,
      claimableRewardsValueUSD,
      apr7d: 0,
      apy: 0,
      detailsUrl: "https://app.spark.fi/farms",
    });
  } catch (error) {
    handleAdapterError("spark", error);
  }

  return out;
};
