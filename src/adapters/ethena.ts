import { Abi, Address, formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { abis, contracts } from "@/lib/web3";
import { multicall } from "@/lib/web3/multicall";
import { mainnetClient } from "@/lib/web3/viem";

// ≈12s blocks
const BLOCKS_7D = 50_400n;

const staking = abis.ethereum.ethena.staking as Abi;
const sUSDe = contracts.ethereum.ethena.sUSDe as Address;

export const fetchEthenaPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const blockNumber = await mainnetClient.getBlockNumber();

    const [shares, decimals] = (await multicall(mainnetClient, [
      { address: sUSDe, abi: staking, functionName: "balanceOf", args: [address as Address], blockNumber },
      { address: sUSDe, abi: staking, functionName: "decimals", blockNumber },
    ])) as [bigint, number];

    // If no shares, return empty array
    if (!shares || shares === 0n) {
      return out;
    }

    const past7 = blockNumber > BLOCKS_7D ? blockNumber - BLOCKS_7D : 0n;

    const [assetsNow, oneShareAssetsNow, ppsPast7Raw] = (await multicall(mainnetClient, [
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [shares], blockNumber },
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [1n], blockNumber },
      { address: sUSDe, abi: staking, functionName: "convertToAssets", args: [1n], blockNumber: past7 },
    ])) as [bigint, bigint, bigint];

    const ppsNow = Number(formatUnits(oneShareAssetsNow, decimals));
    const ppsPast7 = Number(formatUnits(ppsPast7Raw, decimals));

    // Compute periodic returns
    const r7 = ppsNow / ppsPast7 - 1;

    // Annualise the 7‑day return for APR (simple interest)
    const apr7d = r7 * (365 / 7);

    const assetsNowFloat = Number(formatUnits(assetsNow, decimals));
    const valueUSD = assetsNowFloat * pricesUSD!.usde;

    out.push({
      protocol: "ethena",
      chain: "ethereum",
      address,
      asset: "sUSDe",
      apr7d,
      lifetimeAPR: 0,
      valueUSD,
      detailsUrl: "https://app.ethena.fi/",
    });
  } catch {
    /* empty */
  }

  return out;
};
