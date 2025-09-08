import type { FetchPositions } from "./types";
import { handleAdapterError } from "./utils";

export const fetchSkyPositions: FetchPositions = async ({ address, pricesUSD }) => {
  try {
    return [];
  } catch (error) {
    handleAdapterError("sky", error);
    return [];
  }
};
