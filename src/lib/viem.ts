import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

/**
 * Shared public client used for all on‑chain reads.
 *
 * This client connects to Ethereum mainnet using the RPC endpoint
 * defined in the `VITE_MAINNET_RPC_URL` environment variable.  If no
 * endpoint is provided, it falls back to a publicly available RPC.
 * Adjust the fallback value based on your preferred provider.
 */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(
    // Use Vite’s environment injection if available.  When running
    // outside of Vite (e.g. tests), `import.meta.env` may be undefined,
    // so we guard against it.  Fallback to Ankr’s free endpoint.
    typeof import.meta !== "undefined" && import.meta.env?.VITE_MAINNET_RPC_URL
      ? (import.meta.env.VITE_MAINNET_RPC_URL as string)
      : "https://rpc.ankr.com/eth"
  ),
});
