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
  rpcUrl: string;
  wcProjectId?: string;
  addAddress: (address: string, label?: string) => void;
  removeAddress: (id: string) => void;
  setAddressLabel: (id: string, label?: string) => void;
  setRPC: (url: string) => void;
  setWC: (id?: string) => void;
};

function idFor(addr: string) {
  return `${addr.toLowerCase()}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      addresses: [],
      rpcUrl: "",
      wcProjectId: undefined,
      addAddress: (address, label) => {
        if (!isAddress(address as `0x${string}`)) {
          throw new Error("Invalid EVM address");
        }
        const id = idFor(address);
        const exists = get().addresses.some(a => a.id === id);
        if (exists) return;
        set(s => ({
          addresses: [...s.addresses, { id, address, label }]
        }));
      },
      removeAddress: id => {
        set(s => ({ addresses: s.addresses.filter(a => a.id !== id) }));
      },
      setAddressLabel: (id, label) => {
        set(s => ({
          addresses: s.addresses.map(a => (a.id === id ? { ...a, label: label || undefined } : a))
        }));
      },
      setRPC: url => set({ rpcUrl: url }),
      setWC: id => set({ wcProjectId: id || undefined })
    }),
    { name: "session" }
  )
);
