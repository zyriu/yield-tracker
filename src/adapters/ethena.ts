import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { multicall } from "@/lib/multicall";
import { mainnetClient } from "@/lib/viem";
import { ETHENA_ABI, SUSDE } from "@/lib/web3";

// ≈12s blocks
const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

export const fetchEthenaPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const blockNumber = await mainnetClient.getBlockNumber();

    // Batch the first two calls: sUSDe balance and decimals.
    const [shares, decimals] = (await multicall(mainnetClient, [
      { address: SUSDE, abi: ETHENA_ABI, functionName: "balanceOf", args: [address as `0x${string}`], blockNumber },
      { address: SUSDE, abi: ETHENA_ABI, functionName: "decimals", blockNumber },
    ])) as [bigint, number];

    // If no shares, return empty array
    if (!shares || shares === 0n) {
      return out;
    }

    const past7 = blockNumber > BLOCKS_7D ? blockNumber - BLOCKS_7D : 0n;
    const past30 = blockNumber > BLOCKS_30D ? blockNumber - BLOCKS_30D : 0n;

    let apr7d: number | undefined;
    let apy: number | undefined;

    const [assetsNow, oneShareAssetsNow, ppsPast7Raw, ppsPast30Raw] = (await multicall(mainnetClient, [
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

    const assetsNowFloat = Number(formatUnits(assetsNow, decimals));
    const valueUSD = assetsNowFloat * pricesUSD!.usde;

    out.push({
      protocol: "ethena",
      chain: "ethereum",
      address,
      asset: "sUSDe",
      apr7d,
      apy,
      valueUSD,
      detailsUrl: "https://app.ethena.fi/",
    });
  } catch {
    /* empty */
  }

  return out;
};
