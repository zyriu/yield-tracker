import { Abi, formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { abis, contracts } from "@/lib/web3";
import { multicall } from "@/lib/web3/multicall";
import { mainnetClient } from "@/lib/web3/viem";

// ≈12s blocks
const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

const staking = abis.ethereum.ethena.staking as Abi;
const sUSDe = contracts.ethereum.ethena.sUSDe as `0x${string}`;

export const fetchEthenaPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const blockNumber = await mainnetClient.getBlockNumber();

    const [shares, decimals] = (await multicall(mainnetClient, [
      { address: sUSDe, abi: staking, functionName: "balanceOf", args: [address as `0x${string}`], blockNumber },
      { address: sUSDe, abi: staking, functionName: "decimals", blockNumber },
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
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [shares], blockNumber },
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [1n], blockNumber },
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [1n], blockNumber: past7 },
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [1n], blockNumber: past30 },
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
