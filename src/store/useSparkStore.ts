import { Address } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type SparkStoreState = {
  getUserDepositData: (_address: Address) => UserDepositData | undefined;
  setUserDepositData: (_address: Address, _data: UserDepositData) => void;
  userDeposits: Record<
    string,
    {
      lastIndexedBlock: string;
      totalClaimed: string;
      totalDeposited: string;
      totalWithdrawn: string;
    }
  >;
};

type UserDepositData = {
  lastIndexedBlock: bigint;
  totalClaimed: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
};

export const useSparkStore = create<SparkStoreState>()(
  persist(
    (set, get) => ({
      getUserDepositData: (address: Address) => {
        const rawData = get().userDeposits[address.toLowerCase()];
        return {
          lastIndexedBlock: BigInt(rawData?.lastIndexedBlock || 0n),
          totalClaimed: BigInt(rawData?.totalClaimed || 0n),
          totalDeposited: BigInt(rawData?.totalDeposited || 0n),
          totalWithdrawn: BigInt(rawData?.totalWithdrawn || 0n),
        };
      },
      setUserDepositData: (address: Address, data) => {
        set((state) => ({
          userDeposits: {
            ...state.userDeposits,
            [address.toLowerCase()]: {
              lastIndexedBlock: data.lastIndexedBlock.toString(),
              totalClaimed: data.totalClaimed.toString(),
              totalDeposited: data.totalDeposited.toString(),
              totalWithdrawn: data.totalWithdrawn.toString(),
            },
          },
        }));
      },
      userDeposits: {},
    }),
    { name: "spark-deposits" }
  )
);
