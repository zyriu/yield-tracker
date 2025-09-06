import type { Abi, Address, PublicClient } from "viem";

import { pushToast } from "@/components/ui/toast";

export interface MulticallItem {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  blockNumber: bigint;
}

export async function multicall<T extends MulticallItem>(
  client: PublicClient,
  calls: readonly T[]
): Promise<unknown[]> {
  try {
    const response = await client.multicall({
      contracts: calls.map((call) => ({
        address: call.address,
        abi: call.abi,
        functionName: call.functionName as any,
        args: call.args ?? [],
        blockNumber: call.blockNumber,
      })),
      allowFailure: true,
    });
    return response.map((res) => (res.status === "success" ? res.result : null));
  } catch (err) {
    pushToast(`multicall failed: ${err}`);

    // In case the entire multicall fails, return an array of nulls matching
    // the number of calls.  This preserves ordering and length for callers.
    return new Array(calls.length).fill(null);
  }
}
