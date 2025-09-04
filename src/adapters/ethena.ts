import { formatUnits, parseUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { getUSDePrice } from "@/lib/prices";
import { getPublicClient } from "@/lib/viem";

const SUSDE = "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497" as const;

const ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }
] as const;

// ≈12s blocks
const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

async function readPpsAtBlocks(client: ReturnType<typeof getPublicClient>, decimals: number, blockNow: bigint, blockThen: bigint) {
  const oneShare = parseUnits("1", decimals);
  const [ppsNow, ppsThen] = await Promise.all([
    client.readContract({ address: SUSDE, abi: ABI, functionName: "convertToAssets", args: [oneShare], blockNumber: blockNow }) as Promise<bigint>,
    client.readContract({ address: SUSDE, abi: ABI, functionName: "convertToAssets", args: [oneShare], blockNumber: blockThen }) as Promise<bigint>
  ]);
  const nowF = Number(formatUnits(ppsNow, decimals));
  const thenF = Number(formatUnits(ppsThen, decimals));
  if (!(nowF > 0 && thenF > 0)) throw new Error("bad pps");
  return nowF / thenF - 1;
}

export const fetchEthenaPositions: FetchPositions = async ({ address }) => {
  const client = getPublicClient();

  const shares = (await client.readContract({
    address: SUSDE,
    abi: ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`]
  })) as bigint;

  if (shares === 0n) return [];

  const decimals = (await client.readContract({
    address: SUSDE,
    abi: ABI,
    functionName: "decimals"
  })) as number;

  const assetsNow = (await client.readContract({
    address: SUSDE,
    abi: ABI,
    functionName: "convertToAssets",
    args: [shares]
  })) as bigint;

  const usdePrice = await getUSDePrice();
  const assetsNowFloat = Number(formatUnits(assetsNow, decimals));
  const valueUSD = assetsNowFloat * usdePrice;

  let apr7d: number | undefined;
  let apr30d: number | undefined;
  let apy30d: number | undefined;

  try {
    const latest = await client.getBlockNumber();
    const past7 = latest > BLOCKS_7D ? latest - BLOCKS_7D : 0n;
    const past30 = latest > BLOCKS_30D ? latest - BLOCKS_30D : 0n;

    const r7 = await readPpsAtBlocks(client, decimals, latest, past7);   // 7-day period return
    const r30 = await readPpsAtBlocks(client, decimals, latest, past30); // 30-day period return

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
    detailsUrl: "https://app.ethena.fi/"
  };

  return [pos];
};
