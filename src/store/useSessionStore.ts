// src/state/sessionStore.ts (or update existing file)
import { isAddress } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type TrackedAddress = {
  id: string;
  address: string;
  label?: string;
};

type SessionState = {
  addresses: TrackedAddress[];
  addAddress: (_address: string, _label?: string) => void;
  removeAddress: (_id: string) => void;
  setAddressLabel: (_id: string, _label?: string) => void;

  // RPC URLs for chains
  ethereumRpcUrl: string;
  setEthereumRPC: (_url: string) => void;

  optimismRpcUrl: string;
  setOptimismRPC: (_url: string) => void;

  sonicRpcUrl: string;
  setSonicRPC: (_url: string) => void;

  berachainRpcUrl: string;
  setBerachainRPC: (_url: string) => void;

  bnbSmartChainRpcUrl: string;
  setBnbSmartChainRPC: (_url: string) => void;

  mantleRpcUrl: string;
  setMantleRPC: (_url: string) => void;

  baseRpcUrl: string;
  setBaseRPC: (_url: string) => void;

  arbitrumRpcUrl: string;
  setArbitrumRPC: (_url: string) => void;

  hyperevmRpcUrl: string;
  setHyperevmRPC: (_url: string) => void;
};

function idFor(addr: string) {
  return addr.toLowerCase();
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      addresses: [],
      addAddress: (address, label) => {
        if (!isAddress(address as `0x${string}`)) {
          throw new Error("Invalid EVM address");
        }
        const id = idFor(address);
        if (get().addresses.some((a) => a.id === id)) return;
        set((s) => ({ addresses: [...s.addresses, { id, address, label }] }));
      },
      removeAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),
      setAddressLabel: (id, label) =>
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, label: label || undefined } : a)),
        })),

      // RPC fields + setters
      ethereumRpcUrl: "",
      setEthereumRPC: (url) => set({ ethereumRpcUrl: url }),

      optimismRpcUrl: "",
      setOptimismRPC: (url) => set({ optimismRpcUrl: url }),

      sonicRpcUrl: "",
      setSonicRPC: (url) => set({ sonicRpcUrl: url }),

      berachainRpcUrl: "",
      setBerachainRPC: (url) => set({ berachainRpcUrl: url }),

      bnbSmartChainRpcUrl: "",
      setBnbSmartChainRPC: (url) => set({ bnbSmartChainRpcUrl: url }),

      mantleRpcUrl: "",
      setMantleRPC: (url) => set({ mantleRpcUrl: url }),

      baseRpcUrl: "",
      setBaseRPC: (url) => set({ baseRpcUrl: url }),

      arbitrumRpcUrl: "",
      setArbitrumRPC: (url) => set({ arbitrumRpcUrl: url }),

      hyperevmRpcUrl: "",
      setHyperevmRPC: (url) => set({ hyperevmRpcUrl: url }),
    }),
    { name: "session" }
  )
);
