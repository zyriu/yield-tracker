import { createPublicClient, http } from "viem";
import { arbitrum, mainnet } from "viem/chains";

import { useSessionStore } from "@/store/useSessionStore";

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().mainnetRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return "https://eth.llamarpc.com";
    })()
  ),
});

export const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().arbitrumRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return "https://arbitrum-one.public.blastapi.io";
    })()
  ),
});

export const hyperliquidClient = createPublicClient({
  chain: {
    id: 999,
    name: "Hyperliquid",
    nativeCurrency: {
      name: "Hyperliquid",
      symbol: "HYPE",
      decimals: 18,
    },
    rpcUrls: {
      default: "https://rpc.hyperliquid.xyz/evm",
    },
  },
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().hyperliquidRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return "https://rpc.hyperliquid.xyz/evm";
    })()
  ),
});
