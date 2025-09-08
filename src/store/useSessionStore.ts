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

  mainnetRpcUrl: string;
  setMainnetRPC: (_url: string) => void;
  arbitrumRpcUrl: string;
  setArbitrumRPC: (_url: string) => void;
};

function idFor(addr: string) {
  return `${addr.toLowerCase()}`;
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
        const exists = get().addresses.some((a) => a.id === id);
        if (exists) return;

        set((s) => ({
          addresses: [...s.addresses, { id, address, label }],
        }));
      },
      removeAddress: (id) => {
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) }));
      },
      setAddressLabel: (id, label) => {
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, label: label || undefined } : a)),
        }));
      },
      mainnetRpcUrl: "",
      setMainnetRPC: (url) => set({ mainnetRpcUrl: url }),
      arbitrumRpcUrl: "",
      setArbitrumRPC: (url) => set({ arbitrumRpcUrl: url }),
    }),
    { name: "session" }
  )
);
