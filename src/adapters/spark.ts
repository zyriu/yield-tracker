// adapters/spark/fetchSparkPositions.ts
import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { multicall } from "@/lib/multicall";
import { mainnetClient } from "@/lib/viem";
import { ERC20_ABI, SPK_FARM, SPK_TOKEN, STAKING_REWARDS_ABI, USDS_TOKEN } from "@/lib/web3";

const computeYield = ({ address, pricesUSD }) => {
  return { apr7d: 0, apy: 0 };
};

export const fetchSparkPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const user = address as `0x${string}`;
    const blockNow = await mainnetClient.getBlockNumber();

    // --- Current snapshot (1 multicall) ---
    const [rawDeposit, rawEarned, usdsDecimals, usdsSymbol, spkDecimals, spkSymbol] = (await multicall(mainnetClient, [
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "balanceOf", args: [user], blockNumber: blockNow },
      { address: SPK_FARM, abi: STAKING_REWARDS_ABI, functionName: "earned", args: [user], blockNumber: blockNow },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "decimals", blockNumber: blockNow },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "symbol", blockNumber: blockNow },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "decimals", blockNumber: blockNow },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "symbol", blockNumber: blockNow },
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

    const { apr7d, apy } = computeYield({ address, pricesUSD });

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
    /* swallow */
  }

  return out;
};
