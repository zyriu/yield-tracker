import type { Abi, Address } from "viem";
import { publicClient } from "./viem";

/**
 * Definition for a single read-only contract call to be executed in a
 * multicall.  Each item specifies the target contract address, the
 * contract’s ABI, the function name to call, and optional arguments.
 */
export interface MulticallItem {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

/**
 * Execute a batch of read-only contract calls using a single on-chain
 * multicall.  This helper wraps the viem `publicClient.multicall`
 * method and normalises the return value: each result is either the
 * decoded function return value or `null` if the call failed.  A
 * rejected Promise is caught and converted to an array of `null`
 * results to preserve call ordering.
 *
 * Example:
 *
 * ```ts
 * const results = await multicall([
 *   { address: token, abi: erc20Abi, functionName: "symbol" },
 *   { address: token, abi: erc20Abi, functionName: "decimals" },
 * ]);
 * const [symbol, decimals] = results as [string, number];
 * ```
 *
 * @param calls An array of contract calls to execute in a single multicall
 * @returns An array of results corresponding to each call
 */
export async function multicall<T extends MulticallItem>(
  calls: readonly T[]
): Promise<unknown[]> {
  try {
    const response = await publicClient.multicall({
      contracts: calls.map((call) => ({
        address: call.address,
        abi: call.abi,
        functionName: call.functionName as any,
        args: call.args ?? [],
      })),
      allowFailure: true,
    });
    return response.map((res) => (res.status === "success" ? res.result : null));
  } catch (err) {
    // In case the entire multicall fails, return an array of nulls matching
    // the number of calls.  This preserves ordering and length for callers.
    console.error("multicall failed", err);
    return new Array(calls.length).fill(null);
  }
}
