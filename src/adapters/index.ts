import { fetchEthenaPositions } from "./ethena";
import { fetchPendlePositions } from "./pendle";

import type { FetchPositions } from "./types";

export const adapters: Record<string, FetchPositions> = {
  pendle: fetchPendlePositions,
  ethena: fetchEthenaPositions
};

export const fetchPositionsForAddress = async (address: string, protocols: string[]) => {
  const fns: FetchPositions[] = protocols.map((p) => adapters[p]).filter(Boolean);
  const results = await Promise.all(fns.map((fn) => fn({ address })));
  return results.flat();
};
