import { create } from "zustand";
import { persist } from "zustand/middleware";

// Types for deposit tracking
type DepositEvent = {
  blockNumber: bigint;
  transactionHash: string;
  amount: bigint;
  type: "stake" | "withdraw";
  timestamp?: number;
};

type UserDepositData = {
  address: string;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  netDeposited: bigint; // totalDeposited - totalWithdrawn
  events: DepositEvent[];
  lastIndexedBlock: bigint;
  lastUpdated: number;
};

type SparkStoreState = {
  userDeposits: Record<string, UserDepositData>; // address -> deposit data
  deploymentBlock: bigint;
  
  // Actions
  setUserDepositData: (address: string, data: UserDepositData) => void;
  updateLastIndexedBlock: (address: string, blockNumber: bigint) => void;
  addDepositEvents: (address: string, events: DepositEvent[]) => void;
  getUserDepositData: (address: string) => UserDepositData | undefined;
  setDeploymentBlock: (block: bigint) => void;
};

// Farm contract was deployed around block 19000000 (estimated based on Spark timeline)
const ESTIMATED_DEPLOYMENT_BLOCK = 19000000n;

export const useSparkStore = create<SparkStoreState>()(
  persist(
    (set, get) => ({
      userDeposits: {},
      deploymentBlock: ESTIMATED_DEPLOYMENT_BLOCK,
      
      setUserDepositData: (address, data) => {
        set((state) => ({
          userDeposits: {
            ...state.userDeposits,
            [address.toLowerCase()]: data,
          },
        }));
      },
      
      updateLastIndexedBlock: (address, blockNumber) => {
        const addressLower = address.toLowerCase();
        const existingData = get().userDeposits[addressLower];
        if (existingData) {
          set((state) => ({
            userDeposits: {
              ...state.userDeposits,
              [addressLower]: {
                ...existingData,
                lastIndexedBlock: blockNumber,
                lastUpdated: Date.now(),
              },
            },
          }));
        }
      },
      
      addDepositEvents: (address, events) => {
        const addressLower = address.toLowerCase();
        const existingData = get().userDeposits[addressLower];
        
        if (existingData) {
          // Merge new events and recalculate totals
          const allEvents = [...existingData.events, ...events]
            .sort((a, b) => Number(a.blockNumber - b.blockNumber));
          
          let totalDeposited = 0n;
          let totalWithdrawn = 0n;
          
          for (const event of allEvents) {
            if (event.type === "stake") {
              totalDeposited += event.amount;
            } else if (event.type === "withdraw") {
              totalWithdrawn += event.amount;
            }
          }
          
          const netDeposited = totalDeposited - totalWithdrawn;
          
          set((state) => ({
            userDeposits: {
              ...state.userDeposits,
              [addressLower]: {
                ...existingData,
                events: allEvents,
                totalDeposited,
                totalWithdrawn,
                netDeposited,
                lastUpdated: Date.now(),
              },
            },
          }));
        } else {
          // Create new user data
          let totalDeposited = 0n;
          let totalWithdrawn = 0n;
          
          for (const event of events) {
            if (event.type === "stake") {
              totalDeposited += event.amount;
            } else if (event.type === "withdraw") {
              totalWithdrawn += event.amount;
            }
          }
          
          const netDeposited = totalDeposited - totalWithdrawn;
          
          set((state) => ({
            userDeposits: {
              ...state.userDeposits,
              [addressLower]: {
                address: addressLower,
                totalDeposited,
                totalWithdrawn,
                netDeposited,
                events: events.sort((a, b) => Number(a.blockNumber - b.blockNumber)),
                lastIndexedBlock: get().deploymentBlock,
                lastUpdated: Date.now(),
              },
            },
          }));
        }
      },
      
      getUserDepositData: (address) => {
        return get().userDeposits[address.toLowerCase()];
      },
      
      setDeploymentBlock: (block) => {
        set({ deploymentBlock: block });
      },
    }),
    { 
      name: "spark-deposits",
      // Only persist the essential data
      partialize: (state) => ({
        userDeposits: state.userDeposits,
        deploymentBlock: state.deploymentBlock,
      }),
    }
  )
);