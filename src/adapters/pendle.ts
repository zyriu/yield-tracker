import axios from "axios";
import { formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { pushToast } from "@/components/ui/toast";

const PENDLE_POSITIONS_API = "https://api-v2.pendle.finance/core/v1/dashboard/positions/database";
const PENDLE_MARKET_DATA_BASE = "https://api-v2.pendle.finance/core/v2";
const PENDLE_MARKET_DETAILS_BASE = "https://api-v2.pendle.finance/core/v1";

type AnyObj = Record<string, any>;

// Map chain IDs to user‑friendly names. Unknown chains are skipped.
const CHAIN_MAP: Record<number, Position["chain"] | "skip"> = {
  1: "ethereum",
  42161: "arbitrum",
  999: "hyperliquid",
};

// Convert arbitrary values to numbers when possible
function toNumber(x: any): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

// Convert to BigInt or return zero on failure
function toBigIntOrZero(x: any): bigint {
  try {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(Math.trunc(x));
    if (typeof x === "string" && x.length > 0) return BigInt(x);
  } catch {
    /* empty */
  }
  return 0n;
}

// Storage for active market metadata (name and expiry) keyed by `${chainId}-${address}`
const marketMetaCache: Record<string, { name: string; expiry: string }> = {};
const activeMarketsFetched: Record<number, boolean> = {};

// Produce a human‑readable asset label.  If metadata exists in marketMetaCache, include the market name and expiry date; otherwise fall back to a truncated address.
function assetLabel(kind: "pt" | "yt" | "lp", marketId: string): string {
  const [chainIdStr, marketAddr] = marketId.split("-");
  const key = `${chainIdStr}-${marketAddr}`;
  const meta = marketMetaCache[key];
  if (meta?.name && meta.expiry) {
    const date = new Date(meta.expiry);
    const dateStr = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    return `${kind.toUpperCase()}-${meta.name} (${dateStr})`;
  }
  const core = marketAddr.startsWith("0x") ? marketAddr.slice(2) : marketAddr;
  return `${kind.toUpperCase()}-${core.slice(0, 6)}`;
}

export const fetchPendlePositions: FetchPositions = async ({ address }) => {
  const url = `${PENDLE_POSITIONS_API}/${address.toLowerCase()}`;
  let json: AnyObj;
  try {
    const { data, status } = await axios.get(url, { headers: { accept: "application/json" } });
    if (status !== 200) return [];
    json = data;
  } catch {
    return [];
  }

  const positionsArr: AnyObj[] = Array.isArray(json?.positions) ? json.positions : [];
  if (positionsArr.length === 0) return [];

  const out: Position[] = [];

  // Per call caches to avoid redundant network requests
  const marketDataCache: Record<string, any> = {};
  const marketDetailsCache: Record<string, any> = {};

  // Fetch APY metrics for a given market (impliedApy, ytFloatingApy, aggregatedApy)
  async function getMarketData(marketId: string): Promise<any | undefined> {
    if (marketId in marketDataCache) return marketDataCache[marketId];
    const [chainIdStr, marketAddr] = marketId.split("-");
    if (!chainIdStr || !marketAddr) {
      marketDataCache[marketId] = undefined;
      return undefined;
    }
    const api = `${PENDLE_MARKET_DATA_BASE}/${chainIdStr}/markets/${marketAddr}/data`;
    try {
      const { data } = await axios.get(api, { headers: { accept: "application/json" } });
      marketDataCache[marketId] = data;
      return data;
    } catch (err) {
      pushToast(`error fetching pendle market: ${err}`);
    }
    marketDataCache[marketId] = undefined;
    return undefined;
  }

  // Fetch detailed market info (includes protocol field)
  async function getMarketDetails(marketId: string): Promise<any | undefined> {
    if (marketId in marketDetailsCache) return marketDetailsCache[marketId];
    const [chainIdStr, marketAddr] = marketId.split("-");
    if (!chainIdStr || !marketAddr) {
      marketDetailsCache[marketId] = undefined;
      return undefined;
    }
    const api = `${PENDLE_MARKET_DETAILS_BASE}/${chainIdStr}/markets/${marketAddr}`;
    try {
      const { data } = await axios.get(api, { headers: { accept: "application/json" } });
      marketDetailsCache[marketId] = data;
      return data;
    } catch {
      // ignore errors
    }
    marketDetailsCache[marketId] = undefined;
    return undefined;
  }

  // Load active markets for a given chain and populate marketMetaCache
  async function loadMarketMeta(chainId: number) {
    if (activeMarketsFetched[chainId]) return;
    try {
      const { data } = await axios.get(`https://api-v2.pendle.finance/core/v1/${chainId}/markets/active`, {
        headers: { accept: "application/json" },
      });
      if (Array.isArray(data)) {
        for (const m of data) {
          if (m?.address && m?.name && m?.expiry) {
            const key = `${chainId}-${m.address}`;
            marketMetaCache[key] = {
              name: m.name,
              expiry: m.expiry,
            };
          }
        }
      }
    } catch {
      /* empty */
    }
    activeMarketsFetched[chainId] = true;
  }

  for (const chainBucket of positionsArr) {
    const chainId = toNumber(chainBucket?.chainId);
    const chain: Position["chain"] | "skip" = chainId && CHAIN_MAP[chainId] ? CHAIN_MAP[chainId] : "skip";
    if (chain === "skip") continue;

    // Preload market metadata for this chain
    if (typeof chainId === "number") {
      await loadMarketMeta(chainId);
    }

    const opens: AnyObj[] = Array.isArray(chainBucket?.openPositions) ? chainBucket.openPositions : [];
    for (const op of opens) {
      const marketId: string = String(op?.marketId || "");

      // Pre-fetch APY and market details concurrently
      const [marketData, marketInfo] = await Promise.all([getMarketData(marketId), getMarketDetails(marketId)]);
      const protocolName: string | undefined =
        typeof marketInfo?.protocol === "string" ? marketInfo.protocol : undefined;

      // For each leg type (pt, yt, lp)
      const legs: Array<["pt" | "yt" | "lp", AnyObj | undefined]> = [
        ["pt", op?.pt],
        ["yt", op?.yt],
        ["lp", op?.lp],
      ];

      for (const [kind, leg] of legs) {
        if (!leg || typeof leg !== "object") continue;

        const valuation = toNumber(leg.valuation) ?? 0;
        const balanceBI = toBigIntOrZero(leg.balance);
        const activeBI = toBigIntOrZero((leg as any).activeBalance);
        if (valuation <= 0 && balanceBI === 0n && activeBI === 0n) continue;

        const asset = assetLabel(kind, marketId);

        let apr7d: number | undefined;
        let apy: number | undefined;

        // Derive yields from marketData: use impliedApy for PT,
        // ytFloatingApy for YT, aggregatedApy for LP.
        if (marketData) {
          if (kind === "pt") {
            const implied = toNumber(marketData.impliedApy);
            if (implied !== undefined) {
              apr7d = implied;
              apy = implied;
            }
          } else if (kind === "yt") {
            const ytFloat = toNumber(marketData.ytFloatingApy);
            if (ytFloat !== undefined) {
              apr7d = ytFloat;
              apy = ytFloat;
            }
          } else if (kind === "lp") {
            const agg = toNumber(marketData.aggregatedApy);
            if (agg !== undefined) {
              apr7d = agg;
              apy = agg;
            }
          }
        }

        // Build a details URL pointing to the Pendle app.  Use the market address directly and append the chain ID as a query parameter.  This mirrors the structure used on pendle.finance (e.g. markets/<address>?chainId=1).
        let detailsUrl: string | undefined;
        const [chainIdStr, marketAddr] = marketId.split("-");
        if (chainIdStr && marketAddr) {
          detailsUrl = `https://app.pendle.finance/markets/${marketAddr}?chainId=${chainIdStr}`;
        }

        // Determine amount and symbols for display.  Try to infer the underlying token symbol from the asset label.
        let claimableRewards: string | undefined;
        let claimableRewardsValueUSD: number | undefined;

        // Handle claimable tokens if provided in API (claimTokenAmounts array)
        const cta: any[] | undefined = Array.isArray((leg as any).claimTokenAmounts)
          ? (leg as any).claimTokenAmounts
          : undefined;
        if (cta && cta.length > 0) {
          const parts: string[] = [];
          let totalUSD = 0;
          for (const ct of cta) {
            if (!ct) continue;
            // Determine amount with decimals
            const dec = typeof ct.decimals === "number" ? ct.decimals : 18;
            let amtFloat = 0;
            try {
              if (typeof ct.amount === "string" || typeof ct.amount === "number") {
                const bi = BigInt(ct.amount);
                amtFloat = Number(formatUnits(bi, dec));
              }
            } catch {
              const n = Number(ct.amount);
              if (!isNaN(n)) {
                amtFloat = n / 10 ** dec;
              }
            }
            const sym = ct.symbol ?? ct.tokenSymbol ?? "";
            if (amtFloat > 0) {
              parts.push(`${amtFloat.toFixed(2)} ${sym}`);
              if (typeof ct.price === "number") {
                totalUSD += amtFloat * ct.price;
              }
            }
          }
          if (parts.length > 0) {
            claimableRewards = parts.join(", ");
            claimableRewardsValueUSD = totalUSD > 0 ? totalUSD : undefined;
          }
        }

        out.push({
          protocol: "pendle",
          chain,
          address,
          asset,
          marketProtocol: protocolName,
          apr7d,
          apy,
          valueUSD: valuation > 0 ? valuation : 0,
          detailsUrl,
          claimableRewards,
          claimableRewardsValueUSD,
        });
      }
    }
  }

  return out;
};
