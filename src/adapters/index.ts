import { fetchEthenaPositions } from "./ethena";
import { fetchPendlePositions } from "./pendle";
import { fetchSkyPositions } from "./sky";
import { fetchSparkPositions } from "./spark";

import type { FetchPositions, Protocol } from "./types";

export const adapters: Record<Protocol, FetchPositions> = {
  pendle: fetchPendlePositions,
  ethena: fetchEthenaPositions,
  spark: fetchSparkPositions,
  sky: fetchSkyPositions,
};

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
