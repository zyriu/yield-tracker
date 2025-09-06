import { publicClient } from "./viem";

import type { Abi, Address } from "viem";

export interface MulticallItem {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

export async function multicall<T extends MulticallItem>(calls: readonly T[]): Promise<unknown[]> {
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
