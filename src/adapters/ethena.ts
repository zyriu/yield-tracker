import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { multicall } from "@/lib/multicall"; // Address of the sUSDe vault on Ethereum mainnet
import { getUSDePrice } from "@/lib/prices";
import { publicClient } from "@/lib/viem";

// Address of the sUSDe vault on Ethereum mainnet
const SUSDE = "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497" as const;

// Minimal ABI needed for Ethena’s vault interactions
const ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

// ≈12s blocks
const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

/**
 * Fetch an Ethena position for the given wallet.  Uses multicall to
 * batch contract reads where possible to minimise RPC overhead.  Yields
 * are computed by sampling the price per share (pps) over 7- and
 * 30‑day windows.  Historical pps reads still require individual
 * contract calls because multicall cannot target multiple block
 * heights in a single request.
 */
export const fetchEthenaPositions: FetchPositions = async ({ address }) => {
  // Batch the first two calls: sUSDe balance and decimals.
  const [rawShares, rawDecimals] = (await multicall([
    { address: SUSDE, abi: ABI, functionName: "balanceOf", args: [address as `0x${string}`] },
    { address: SUSDE, abi: ABI, functionName: "decimals" },
  ])) as [bigint, number];

  // If no shares, return empty array
  if (!rawShares || rawShares === 0n) {
    return [];
  }

  const shares = rawShares as bigint;
  const decimals = rawDecimals as number;

  // Batch convertToAssets for both the user’s full balance and a single share to get PPS
  const [assetsNow, oneShareAssetsNow] = (await multicall([
    { address: SUSDE, abi: ABI, functionName: "convertToAssets", args: [shares] },
    { address: SUSDE, abi: ABI, functionName: "convertToAssets", args: [1n] },
  ])) as [bigint, bigint];

  const usdePrice = await getUSDePrice();
  const assetsNowFloat = Number(formatUnits(assetsNow, decimals));
  const valueUSD = assetsNowFloat * usdePrice;

  let apr7d: number | undefined;
  let apr30d: number | undefined;
  let apy30d: number | undefined;

  try {
    const latest = await publicClient.getBlockNumber();
    const past7 = latest > BLOCKS_7D ? latest - BLOCKS_7D : 0n;
    const past30 = latest > BLOCKS_30D ? latest - BLOCKS_30D : 0n;

    // Read pps at past blocks.  These calls cannot be batched with others
    // because multicall doesn’t support per-call block numbers.  Each call
    // returns the assets for a single share at the specified block.
    const ppsPast7Raw = (await publicClient.readContract({
      address: SUSDE,
      abi: ABI,
      functionName: "convertToAssets",
      args: [1n],
      blockNumber: past7,
    })) as bigint;
    const ppsPast30Raw = (await publicClient.readContract({
      address: SUSDE,
      abi: ABI,
      functionName: "convertToAssets",
      args: [1n],
      blockNumber: past30,
    })) as bigint;

    const ppsNow = Number(formatUnits(oneShareAssetsNow, decimals));
    const ppsPast7 = Number(formatUnits(ppsPast7Raw, decimals));
    const ppsPast30 = Number(formatUnits(ppsPast30Raw, decimals));

    // Compute periodic returns
    const r7 = ppsNow / ppsPast7 - 1;
    const r30 = ppsNow / ppsPast30 - 1;

    apr7d = r7 * (365 / 7);
    apr30d = r30 * (365 / 30);
    apy30d = Math.pow(1 + r30, 365 / 30) - 1;
  } catch {
    // If RPC lacks archival depth, yields stay undefined.
  }

  const pos: Position = {
    protocol: "ethena",
    chain: "ethereum",
    address,
    asset: "sUSDe",
    apr7d,
    apr30d,
    apy30d,
    valueUSD,
    detailsUrl: "https://app.ethena.fi/",
  };

  return [pos];
};
