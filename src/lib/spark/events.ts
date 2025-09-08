import { type Address, decodeEventLog } from "viem";

import { mainnetClient } from "@/lib/web3/viem";
import { abis, contracts } from "@/lib/web3";
import { useSparkStore } from "@/store/useSparkStore";

const { farm } = contracts.ethereum.spark;
const rewardsAbi = abis.ethereum.spark.rewards;

/**
 * Find the deployment block of the Spark farm contract
 */
export async function findSparkDeploymentBlock(): Promise<bigint> {
  const farmAddress = farm as Address;
  
  // Binary search for deployment block
  let left = 18000000; // Start from a reasonable block
  let right = Number(await mainnetClient.getBlockNumber());
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    try {
      const code = await mainnetClient.getCode({ 
        address: farmAddress, 
        blockNumber: BigInt(mid) 
      });
      
      if (code && code !== "0x") {
        right = mid;
      } else {
        left = mid + 1;
      }
    } catch {
      // If we can't get code at this block, it's too early
      left = mid + 1;
    }
  }
  
  return BigInt(left);
}

/**
 * Query Spark events for a specific user from a start block to end block
 */
export async function querySparkEvents(
  userAddress: Address,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Array<{ blockNumber: bigint; transactionHash: string; amount: bigint; type: "stake" | "withdraw"; timestamp?: number }>> {
  const farmAddress = farm as Address;
  
  try {
    // Query Staked events
    const stakedLogs = await mainnetClient.getLogs({
      address: farmAddress,
      event: {
        type: "event",
        name: "Staked",
        inputs: [
          { name: "user", type: "address", indexed: true },
          { name: "amount", type: "uint256", indexed: false },
        ],
      },
      args: {
        user: userAddress,
      },
      fromBlock,
      toBlock,
    });
    
    // Query Withdrawn events  
    const withdrawnLogs = await mainnetClient.getLogs({
      address: farmAddress,
      event: {
        type: "event",
        name: "Withdrawn", 
        inputs: [
          { name: "user", type: "address", indexed: true },
          { name: "amount", type: "uint256", indexed: false },
        ],
      },
      args: {
        user: userAddress,
      },
      fromBlock,
      toBlock,
    });
    
    // Process and combine events
    const events = [];
    
    // Process staked events
    for (const log of stakedLogs) {
      const decoded = decodeEventLog({
        abi: rewardsAbi,
        eventName: "Staked",
        data: log.data,
        topics: log.topics,
      });
      
      events.push({
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        amount: decoded.args.amount as bigint,
        type: "stake" as const,
      });
    }
    
    // Process withdrawn events
    for (const log of withdrawnLogs) {
      const decoded = decodeEventLog({
        abi: rewardsAbi,
        eventName: "Withdrawn",
        data: log.data,
        topics: log.topics,
      });
      
      events.push({
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        amount: decoded.args.amount as bigint,
        type: "withdraw" as const,
      });
    }
    
    // Sort by block number
    return events.sort((a, b) => Number(a.blockNumber - b.blockNumber));
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error querying Spark events:", error);
    return [];
  }
}

/**
 * Update deposit data for a user by querying events from the last indexed block
 */
export async function updateUserDepositData(userAddress: Address): Promise<void> {
  const sparkStore = useSparkStore.getState();
  const existingData = sparkStore.getUserDepositData(userAddress);
  
  const currentBlock = await mainnetClient.getBlockNumber();
  let fromBlock: bigint;
  
  if (existingData) {
    // Start from the last indexed block + 1
    fromBlock = existingData.lastIndexedBlock + 1n;
  } else {
    // For new users, check if we have the deployment block cached
    let deploymentBlock = sparkStore.deploymentBlock;
    
    // If deployment block is still the estimated one, try to find the real one
    if (deploymentBlock === 19000000n) {
      try {
        deploymentBlock = await findSparkDeploymentBlock();
        sparkStore.setDeploymentBlock(deploymentBlock);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Could not find exact deployment block, using estimate:", error);
      }
    }
    
    fromBlock = deploymentBlock;
  }
  
  // Don't query if we're already up to date
  if (fromBlock > currentBlock) {
    return;
  }
  
  // Query events in chunks to avoid rate limits (1000 blocks at a time)
  const CHUNK_SIZE = 1000n;
  let currentFromBlock = fromBlock;
  
  while (currentFromBlock <= currentBlock) {
    const toBlock = currentFromBlock + CHUNK_SIZE - 1n > currentBlock 
      ? currentBlock 
      : currentFromBlock + CHUNK_SIZE - 1n;
    
    const events = await querySparkEvents(userAddress, currentFromBlock, toBlock);
    
    if (events.length > 0) {
      sparkStore.addDepositEvents(userAddress, events);
    }
    
    currentFromBlock = toBlock + 1n;
  }
  
  // Update the last indexed block
  sparkStore.updateLastIndexedBlock(userAddress, currentBlock);
}

/**
 * Get total deposited amount for a user (from cached data)
 */
export function getUserTotalDeposited(userAddress: Address): bigint {
  const sparkStore = useSparkStore.getState();
  const userData = sparkStore.getUserDepositData(userAddress);
  return userData?.netDeposited || 0n;
}

/**
 * Initialize Spark deposit tracking for a user
 */
export async function initializeSparkDepositTracking(userAddress: Address): Promise<void> {
  try {
    await updateUserDepositData(userAddress);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error initializing Spark deposit tracking:", error);
  }
}