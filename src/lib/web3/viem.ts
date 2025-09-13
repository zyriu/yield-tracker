import { createPublicClient, http } from "viem";
import { arbitrum, base, berachain, bsc, mainnet, mantle, optimism, sonic } from "viem/chains";

import { useSessionStore } from "@/store/useSessionStore";

export const getClientForChain = (chainId: number) => {
  switch (chainId) {
    case 1:
      return mainnetClient;
    case 10:
      return optimismClient;
    case 56:
      return bnbSmartChainClient;
    case 146:
      return sonicClient;
    case 999:
      return hyperevmClient;
    case 5000:
      return mantleClient;
    case 8453:
      return baseClient;
    case 42161:
      return arbitrumClient;
    case 80094:
      return berachainClient;
  }
};

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().ethereumRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return mainnet.rpcUrls.default.http[0];
    })()
  ),
});

export const optimismClient = createPublicClient({
  chain: optimism,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().optimismRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return optimism.rpcUrls.default.http[0];
    })()
  ),
});

export const bnbSmartChainClient = createPublicClient({
  chain: bsc,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().bnbSmartChainRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return bsc.rpcUrls.default.http[0];
    })()
  ),
});

export const sonicClient = createPublicClient({
  chain: sonic,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().sonicRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return sonic.rpcUrls.default.http[0];
    })()
  ),
});

export const hyperevmClient = createPublicClient({
  chain: {
    id: 999,
    name: "Hyperevm",
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
      const sessionRpc = useSessionStore.getState().hyperevmRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return "https://rpc.hyperliquid.xyz/evm";
    })()
  ),
});

export const mantleClient = createPublicClient({
  chain: mantle,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().mantleRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return mantle.rpcUrls.default.http[0];
    })()
  ),
});

export const baseClient = createPublicClient({
  chain: base,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().baseRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return base.rpcUrls.default.http[0];
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

      return arbitrum.rpcUrls.default.http[0];
    })()
  ),
});

export const berachainClient = createPublicClient({
  chain: berachain,
  transport: http(
    (() => {
      const sessionRpc = useSessionStore.getState().berachainRpcUrl;
      if (sessionRpc && sessionRpc.trim().length > 0) {
        return sessionRpc.trim();
      }

      return berachain.rpcUrls.default.http[0];
    })()
  ),
});
