import axios, { AxiosRequestConfig } from "axios";

/**
 * Shared utilities for adapters to reduce code duplication
 */

// Convert arbitrary values to numbers when possible
export function toNumber(x: any): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

// Convert to BigInt or return zero on failure
export function toBigIntOrZero(x: any): bigint {
  try {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(Math.trunc(x));
    if (typeof x === "string" && x.length > 0) return BigInt(x);
  } catch {
    /* empty */
  }

  return 0n;
}

// Shared HTTP client with error handling
export async function makeHttpRequest<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<{ data: T; status: number } | null> {
  try {
    const response = await axios.get<T>(url, {
      headers: { accept: "application/json" },
      ...config,
    });
    return { data: response.data, status: response.status };
  } catch {
    return null;
  }
}

// Helper to handle API responses with caching
export function createCache<T>(): {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  has: (key: string) => boolean;
} {
  const cache: Record<string, T> = {};
  
  return {
    get: (key: string) => cache[key],
    set: (key: string, value: T) => { cache[key] = value; },
    has: (key: string) => key in cache,
  };
}

// Chain ID to chain name mapping
export const CHAIN_MAP: Record<number, string | "skip"> = {
  1: "ethereum",
  42161: "arbitrum",
  999: "hyperliquid",
};

// Common error handler for adapters
export function handleAdapterError(protocol: string, error: any): void {
  console.warn(`Error in ${protocol} adapter:`, error);
}