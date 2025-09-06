import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

import { useSessionStore } from "@/store/useSessionStore";

function getRpcUrl(): string {
  // Read from Zustand session store if available.
  const sessionRpc = useSessionStore.getState().rpcUrl;
  if (sessionRpc && sessionRpc.trim().length > 0) {
    return sessionRpc.trim();
  }

  // Fallback to default Ankr endpoint.
  return "https://eth.llamarpc.com";
}

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(getRpcUrl()),
});
