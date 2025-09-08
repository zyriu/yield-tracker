import { type Address } from "viem";

import { abis, contracts, mainnetClient } from "@/lib/web3";
import { useSparkStore } from "@/store/useSparkStore";

const CHUNK_SIZE = 50_000n;
const CONTRACT_CREATION_BLOCK = 22725185n;

export async function updateUserDepositData(userAddress: Address): Promise<void> {
  const sparkStore = useSparkStore.getState();
  const existingData = sparkStore.getUserDepositData(userAddress);

  const currentBlock = await mainnetClient.getBlockNumber();

  // Start from the last indexed block + 1, otherwise use contract creation block
  const fromBlock = existingData ? existingData.lastIndexedBlock + 1n : CONTRACT_CREATION_BLOCK;

  // Don't query if we're already up to date
  if (fromBlock > currentBlock) {
    return;
  }

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
      args: { user: userAddress as Address },
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

  sparkStore.setUserDepositData(userAddress, data);
}
