import { useQuery } from "@tanstack/react-query";

import { adapters } from "@/adapters";
import type { Protocol } from "@/adapters/types";
import { getPricesUSD } from "@/lib/coingecko/prices";
import { useSessionStore } from "@/store/useSessionStore";

/**
 * Hook to fetch positions for a specific protocol
 */
export function useProtocolPositions(protocol: Protocol) {
  const addresses = useSessionStore((s) => s.addresses.map((a) => a.address));
  const { pricesUSD, isLoading: pricesLoading } = getPricesUSD();

  return useQuery({
    queryKey: ["positions", protocol, addresses],
    queryFn: async () => {
      const adapter = adapters[protocol];
      if (!adapter) return [];

      const results = await Promise.all(
        addresses.map(addr => adapter({ address: addr, pricesUSD: pricesUSD! }))
      );
      
      return results.flat();
    },
    enabled: addresses.length > 0 && !pricesLoading,
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch positions for all protocols concurrently
 */
export function useAllProtocolPositions() {
  const protocols = Object.keys(adapters) as Protocol[];
  
  const queries = protocols.map(protocol => 
    useProtocolPositions(protocol)
  );

  const isAnyLoading = queries.some(q => q.isLoading);
  const isAnyFetching = queries.some(q => q.isFetching);
  const hasAnyError = queries.some(q => q.isError);

  // Combine all successful results
  const allData = queries
    .filter(q => q.data)
    .flatMap(q => q.data!);

  // Create a status map for each protocol
  const protocolStatus = Object.fromEntries(
    protocols.map((protocol, index) => [
      protocol,
      {
        isLoading: queries[index].isLoading,
        isFetching: queries[index].isFetching,
        isError: queries[index].isError,
        error: queries[index].error,
        data: queries[index].data || [],
      }
    ])
  );

  return {
    data: allData,
    protocolStatus,
    isLoading: isAnyLoading,
    isFetching: isAnyFetching,
    isError: hasAnyError,
    refetch: () => queries.forEach(q => q.refetch()),
  };
}