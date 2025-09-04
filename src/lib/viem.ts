import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

import { useSessionStore } from "@/store/useSessionStore";

/**
 * Get a viem public client based on current user RPC.
 * If none set, we default to viem's public RPC (not recommended for prod).
 */
export const getPublicClient = () => {
    const rpc = useSessionStore.getState().rpcUrl;
    return createPublicClient({
        chain: mainnet,
        transport: http(rpc || undefined)
    });
};
