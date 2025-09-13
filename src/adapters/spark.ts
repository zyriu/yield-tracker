import { Abi, Address, formatUnits } from "viem";

import type { FetchPositions, Position } from "@/adapters/types";

import { abis, contracts } from "@/lib/web3";
import { multicall } from "@/lib/web3/multicall";
import { mainnetClient } from "@/lib/web3/viem";
import { useSparkStore } from "@/store/useSparkStore";

const CHUNK_SIZE = 50_000n;
const CONTRACT_CREATION_BLOCK = 22725185n;

const erc20 = abis.erc20 as Abi;
const rewards = abis.ethereum.spark.rewards as Abi;
const { farm, spk, USDS } = contracts.ethereum.spark;

export const fetchSparkPositions: FetchPositions = async ({ address, pricesUSD }) => {
  const out: Position[] = [];

  try {
    const user = address as Address;
    const blockNow = await mainnetClient.getBlockNumber();

    const sparkStore = useSparkStore.getState();
    const existingData = sparkStore.getUserDepositData(address as Address);

    const currentBlock = await mainnetClient.getBlockNumber();

    // Start from the last indexed block + 1, otherwise use contract creation block
    const fromBlock = existingData ? existingData.lastIndexedBlock + 1n : CONTRACT_CREATION_BLOCK;

    // Don't query if we're already up to date
    if (fromBlock <= currentBlock) {
      const data = {
        lastIndexedBlock: currentBlock,
        totalClaimed: existingData?.totalClaimed || 0n,
        totalDeposited: existingData?.totalDeposited || 0n,
        totalWithdrawn: existingData?.totalWithdrawn || 0n,
      };

      for (let k = fromBlock; k <= currentBlock; k += CHUNK_SIZE) {
        let toBlock = k + CHUNK_SIZE - 1n;
        if (toBlock > currentBlock) toBlock = currentBlock;

        const logs = await mainnetClient.getLogs({
          address: contracts.ethereum.spark.farm as Address,
          events: abis.ethereum.spark.rewards.filter(({ type }) => type === "event"),
          args: { user: address as Address },
          fromBlock: k,
          toBlock,
        });

        for (const log of logs) {
          switch (log.eventName) {
            case "RewardPaid":
              data.totalClaimed += log.args.reward;
              break;
            case "Staked":
              data.totalDeposited += log.args.amount;
              break;
            case "Withdrawn":
              data.totalWithdrawn += log.args.amount;
          }
        }
      }

      sparkStore.setUserDepositData(address as Address, data);
    }

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
