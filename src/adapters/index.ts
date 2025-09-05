import { fetchEthenaPositions } from "./ethena";
import { fetchPendlePositions } from "./pendle";
import { fetchSkyPositions } from "./sky";
import { fetchSparkPositions } from "./spark";

import type { FetchPositions, Protocol } from "./types";

/**
 * Registry of protocol adapters.  Each entry must implement FetchPositions.
 */
export const adapters: Record<Protocol, FetchPositions> = {
  pendle: fetchPendlePositions,
  ethena: fetchEthenaPositions,
  spark: fetchSparkPositions,
  sky: fetchSkyPositions,
};

/**
 * Fetch positions for a wallet across an arbitrary list of protocols.
 */
export async function fetchPositionsForAddress(address: string, protocols: string[]) {
  const results: Promise<any[]>[] = [];
  for (const protocol of protocols) {
    const fn = adapters[protocol as Protocol];
    if (fn) {
      results.push(fn({ address }));
    }
  }
  return (await Promise.all(results)).flat();
}
