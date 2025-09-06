import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { multicall } from "@/lib/multicall";
import { getPricesUSD } from "@/lib/prices";
import { publicClient } from "@/lib/viem";
import { ETHENA_ABI, SUSDE } from "@/lib/web3";

// ≈12s blocks
const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

export const fetchEthenaPositions: FetchPositions = async ({ address }) => {
  const blockNumber = await publicClient.getBlockNumber();

  // Batch the first two calls: sUSDe balance and decimals.
  const [rawShares, rawDecimals] = (await multicall([
    { address: SUSDE, abi: ETHENA_ABI, functionName: "balanceOf", args: [address as `0x${string}`], blockNumber },
    { address: SUSDE, abi: ETHENA_ABI, functionName: "decimals", blockNumber },
  ])) as [bigint, number];

  // If no shares, return empty array
  if (!rawShares || rawShares === 0n) {
    return [];
  }

  const shares = rawShares as bigint;
  const decimals = rawDecimals as number;

  const past7 = blockNumber > BLOCKS_7D ? blockNumber - BLOCKS_7D : 0n;
  const past30 = blockNumber > BLOCKS_30D ? blockNumber - BLOCKS_30D : 0n;

  let apr7d: number | undefined;
  let apy: number | undefined;

  try {
    const [assetsNow, oneShareAssetsNow, ppsPast7Raw, ppsPast30Raw] = (await multicall([
      { address: SUSDE, abi: ETHENA_ABI, functionName: "convertToAssets", args: [shares], blockNumber },
      { address: SUSDE, abi: ETHENA_ABI, functionName: "convertToAssets", args: [1n], blockNumber },
      { address: SUSDE, abi: ETHENA_ABI, functionName: "convertToAssets", args: [1n], blockNumber: past7 },
      { address: SUSDE, abi: ETHENA_ABI, functionName: "convertToAssets", args: [1n], blockNumber: past30 },
    ])) as [bigint, bigint, bigint, bigint];

    const ppsNow = Number(formatUnits(oneShareAssetsNow, decimals));
    const ppsPast7 = Number(formatUnits(ppsPast7Raw, decimals));
    const ppsPast30 = Number(formatUnits(ppsPast30Raw, decimals));

    // Compute periodic returns
    const r7 = ppsNow / ppsPast7 - 1;
    const r30 = ppsNow / ppsPast30 - 1;

    // Annualise the 7‑day return for APR (simple interest)
    apr7d = r7 * (365 / 7);

    // Compute APY using 30‑day compounding if available; otherwise fallback to 7‑day
    if (ppsPast30 > 0 && r30 >= 0) {
      apy = Math.pow(1 + r30, 365 / 30) - 1;
    } else if (r7 >= 0) {
      apy = Math.pow(1 + r7, 365 / 7) - 1;
    }

    const pricesUSD = await getPricesUSD();
    const assetsNowFloat = Number(formatUnits(assetsNow, decimals));
    const valueUSD = assetsNowFloat * pricesUSD.usde;

    const pos: Position = {
      protocol: "ethena",
      chain: "ethereum",
      address,
      asset: "sUSDe",
      apr7d,
      apy,
      valueUSD,
      detailsUrl: "https://app.ethena.fi/",
    };

    return [pos];
  } catch {
    /* empty */
  }

  return [];
};
