import { handleAdapterError } from "./utils";

import type { FetchPositions } from "./types";

export const fetchSkyPositions: FetchPositions = async ({ address: _address, pricesUSD: _pricesUSD }) => {
  try {
    return [];
  } catch (error) {
    handleAdapterError("sky", error);
    return [];
  }
};
