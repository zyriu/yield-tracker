import { Abi, Address, formatUnits } from "viem";

import { updateUserDepositData } from "./events";

import type { FetchPositions, Position } from "@/adapters/types";

import { abis, contracts } from "@/lib/web3";
import { multicall } from "@/lib/web3/multicall";
import { mainnetClient } from "@/lib/web3/viem";

const erc20 = abis.erc20 as Abi;
const rewards = abis.ethereum.spark.rewards as Abi;
const { farm, spk, USDS } = contracts.ethereum.spark;

export const fetchSparkPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const user = address as Address;
    const blockNow = await mainnetClient.getBlockNumber();

    // Update deposit tracking in background (async)
    updateUserDepositData(user).catch((error) => {
      console.warn("Failed to update Spark deposit data:", error);
    });

    // --- Current snapshot (1 multicall) ---
    const [rawDeposit, rawEarned, usdsDecimals, usdsSymbol, spkDecimals, spkSymbol] = (await multicall(mainnetClient, [
      { address: farm as Address, abi: rewards, functionName: "balanceOf", args: [user], blockNumber: blockNow },
      { address: farm as Address, abi: rewards, functionName: "earned", args: [user], blockNumber: blockNow },
      { address: USDS as Address, abi: erc20, functionName: "decimals", blockNumber: blockNow },
      { address: USDS as Address, abi: erc20, functionName: "symbol", blockNumber: blockNow },
      { address: spk as Address, abi: erc20, functionName: "decimals", blockNumber: blockNow },
      { address: spk as Address, abi: erc20, functionName: "symbol", blockNumber: blockNow },
    ])) as [bigint | null, bigint | null, number | null, string | null, number | null, string | null];

    if (!rawDeposit || rawDeposit === 0n) return out;

    const usdsDec = usdsDecimals ?? 18;
    const spkDec = spkDecimals ?? 18;
    const spkPrice = pricesUSD.spk ?? 0;

    const valueUSD = Number(formatUnits(rawDeposit || 0n, usdsDec));

    // Claimables
    const currentEarnedFloat = rawEarned && rawEarned > 0n ? Number(formatUnits(rawEarned, spkDec)) : 0;
    const claimable = currentEarnedFloat > 0 ? `${currentEarnedFloat.toFixed(2)} ${spkSymbol || "SPK"}` : undefined;
    const claimableRewardsValueUSD = currentEarnedFloat > 0 && spkPrice > 0 ? currentEarnedFloat * spkPrice : undefined;

    out.push({
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol || "USDS",
      apr7d: 0,
      lifetimeAPR: 0,
      valueUSD,
      detailsUrl: "https://app.spark.fi/farms",
      claimableRewards: claimable,
      claimableRewardsValueUSD,
    });
  } catch {
    /* swallow */
  }

  return out;
};
