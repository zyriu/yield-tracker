import { type Address } from "viem";

import { abis, contracts, mainnetClient } from "@/lib/web3";
import { useSparkStore } from "@/store/useSparkStore";

const CHUNK_SIZE = 50_000n;
const CONTRACT_CREATION_BLOCK = 22725185n;

// Ethereum block time is approximately 12 seconds
const SECONDS_PER_BLOCK = 12;
const BLOCKS_PER_DAY = Math.floor((24 * 60 * 60) / SECONDS_PER_BLOCK); // ~7200 blocks per day

type UserEvent = {
  blockNumber: bigint;
  timestamp?: number;
  type: 'Staked' | 'Withdrawn' | 'RewardPaid';
  amount: bigint;
};

/**
 * Query user events for a specific time period to calculate yield
 */
export async function queryUserEventsForPeriod(
  userAddress: Address,
  days: number
): Promise<{ events: UserEvent[]; currentPosition: bigint }> {
  const currentBlock = await mainnetClient.getBlockNumber();
  const blocksBack = BigInt(Math.floor(days * BLOCKS_PER_DAY));
  const fromBlock = currentBlock - blocksBack;

  // Make sure we don't go before contract creation
  const startBlock = fromBlock > CONTRACT_CREATION_BLOCK ? fromBlock : CONTRACT_CREATION_BLOCK;

  const events: UserEvent[] = [];

  // Query events in chunks
  for (let k = startBlock; k <= currentBlock; k += CHUNK_SIZE) {
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
      if (log.eventName === "RewardPaid" || log.eventName === "Staked" || log.eventName === "Withdrawn") {
        events.push({
          blockNumber: log.blockNumber,
          type: log.eventName,
          amount: log.args.amount || log.args.reward,
        });
      }
    }
  }

  // Get current position size
  const currentPosition = await mainnetClient.readContract({
    address: contracts.ethereum.spark.farm as Address,
    abi: abis.ethereum.spark.rewards,
    functionName: "balanceOf",
    args: [userAddress],
  }) as bigint;

  return { events: events.sort((a, b) => Number(a.blockNumber - b.blockNumber)), currentPosition };
}

/**
 * Calculate APR for a given period based on position changes and rewards
 */
export function calculateAPR(events: UserEvent[], currentPosition: bigint, totalBlocks: number): number {
  if (totalBlocks <= 0) {
    return 0;
  }

  // Sum up all rewards earned in the period
  let totalRewards = 0n;
  for (const event of events) {
    if (event.type === 'RewardPaid') {
      totalRewards += event.amount;
    }
  }

  // If no rewards and no position, return 0
  if (totalRewards === 0n && currentPosition === 0n) {
    return 0;
  }

  // If no position at end, but had rewards, use a minimal approach
  if (currentPosition === 0n) {
    return 0;
  }

  // Calculate time-weighted average position size
  let weightedPositionBlocks = 0n;
  let totalWeightedBlocks = 0n;
  
  // Start with current position and work backwards through events
  let positionAtTime = currentPosition;
  let remainingBlocks = totalBlocks;
  
  // Process events in reverse chronological order to reconstruct position history
  for (let i = events.length - 1; i >= 0 && remainingBlocks > 0; i--) {
    const event = events[i];
    
    // Add time-weighted position for the period since this event
    const blocksInPeriod = Math.min(remainingBlocks, totalBlocks);
    weightedPositionBlocks += positionAtTime * BigInt(blocksInPeriod);
    totalWeightedBlocks += BigInt(blocksInPeriod);
    
    // Adjust position based on this event (working backwards)
    if (event.type === 'Staked') {
      positionAtTime -= event.amount; // Remove this deposit to get previous position
    } else if (event.type === 'Withdrawn') {
      positionAtTime += event.amount; // Add back this withdrawal to get previous position
    }
    
    remainingBlocks -= blocksInPeriod;
    break; // For now, just use the most recent position change
  }
  
  // If we still have remaining blocks (no events), use the current position
  if (remainingBlocks > 0) {
    weightedPositionBlocks += positionAtTime * BigInt(remainingBlocks);
    totalWeightedBlocks += BigInt(remainingBlocks);
  }
  
  if (totalWeightedBlocks === 0n) {
    return 0;
  }
  
  // Calculate time-weighted average position
  const avgPosition = Number(weightedPositionBlocks) / Number(totalWeightedBlocks);
  
  if (avgPosition <= 0) {
    return 0;
  }

  // Calculate APR: (rewards / avg_position) * (blocks_per_year / total_blocks) * 100
  const blocksPerYear = 365 * BLOCKS_PER_DAY;
  const rewardRate = Number(totalRewards) / avgPosition;
  const annualizedRate = rewardRate * (blocksPerYear / totalBlocks);
  
  return annualizedRate * 100; // Convert to percentage
}

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
          break;
      }
    }
  }

  sparkStore.setUserDepositData(userAddress, data);
}