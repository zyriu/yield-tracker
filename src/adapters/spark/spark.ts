import { Abi, Address, formatUnits } from "viem";

import { updateUserDepositData, queryUserEventsForPeriod, calculateAPR } from "./events";

import type { FetchPositions, Position } from "@/adapters/types";

import { abis, contracts } from "@/lib/web3";
import { multicall } from "@/lib/web3/multicall";
import { mainnetClient } from "@/lib/web3/viem";

// Ethereum block time is approximately 12 seconds
const SECONDS_PER_BLOCK = 12;
const BLOCKS_PER_DAY = Math.floor((24 * 60 * 60) / SECONDS_PER_BLOCK); // ~7200 blocks per day

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
      // Silently ignore errors in background updates
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

    // Calculate APR for 7 days and 30 days
    let apr7d = 0;
    let apr30d = 0;

    try {
      // Query events for 30 days and calculate APR
      const { events: events30d, currentPosition } = await queryUserEventsForPeriod(user, 30);
      const totalBlocks30d = 30 * BLOCKS_PER_DAY;
      apr30d = calculateAPR(events30d, currentPosition, totalBlocks30d);

      // For 7-day APR, filter events to last 7 days
      const currentBlock = await mainnetClient.getBlockNumber();
      const blocks7dAgo = currentBlock - BigInt(7 * BLOCKS_PER_DAY);
      const events7d = events30d.filter(event => event.blockNumber >= blocks7dAgo);
      const totalBlocks7d = 7 * BLOCKS_PER_DAY;
      apr7d = calculateAPR(events7d, currentPosition, totalBlocks7d);
    } catch (error) {
      // Silently ignore APR calculation errors
    }

    out.push({
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol || "USDS",
      valueUSD,
      claimableRewards: claimable,
      claimableRewardsValueUSD,
      apr7d,
      lifetimeAPR: apr30d, // Use 30-day APR instead of lifetime
      detailsUrl: "https://app.spark.fi/farms",
    });
  } catch {
    /* swallow */
  }

  return out;
};
