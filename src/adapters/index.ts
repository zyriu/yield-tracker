import type { FetchPositions, Protocol } from "./types";

import { fetchEthenaPositions } from "@/adapters/ethena";
import { fetchPendlePositions } from "@/adapters/pendle";
import { fetchSkyPositions } from "@/adapters/sky";
import { fetchSparkPositions } from "@/adapters/spark/spark";
import { Prices } from "@/lib/coingecko/prices";

export const adapters: Record<Protocol, FetchPositions> = {
  pendle: fetchPendlePositions,
  ethena: fetchEthenaPositions,
  spark: fetchSparkPositions,
  sky: fetchSkyPositions,
};

export async function fetchPositionsForAddress(address: string, protocols: string[], pricesUSD: Prices) {
  const results: Promise<any[]>[] = [];

  for (const protocol of protocols) {
    const fn = adapters[protocol as Protocol];
    if (fn) {
      results.push(fn({ address, pricesUSD }));
    }
  }

  return (await Promise.all(results)).flat();
}
