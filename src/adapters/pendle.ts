import type { FetchPositions, Position } from "./types";

// Dashboard positions endpoint
const PENDLE_POSITIONS_API = "https://api-v2.pendle.finance/core/v1/dashboard/positions/database";

// Market‑data endpoint base.  The documentation for this endpoint shows it
// returns APY metrics such as impliedApy, ytFloatingApy and aggregatedApy:contentReference[oaicite:1]{index=1}.
const PENDLE_MARKET_DATA_BASE = "https://api-v2.pendle.finance/core/v2";

type AnyObj = Record<string, any>;

// Map chain IDs from the API to chain names used in our app
const CHAIN_MAP: Record<number, Position["chain"] | "skip"> = {
  1: "ethereum",
  42161: "arbitrum",
  999: "hyperliquid",
  // Other chains are skipped for now
};

// Convert any type to a number if possible
function toNumber(x: any): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}
// Convert a value to BigInt, defaulting to 0n on failure
function toBigIntOrZero(x: any): bigint {
  try {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(Math.trunc(x));
    if (typeof x === "string" && x.length > 0) return BigInt(x);
  } catch {}
  return 0n;
}
// Shorten a market address for asset labels
function shortMarket(marketId: string): string {
  const addr = marketId.split("-")[1] || marketId;
  const core = addr.startsWith("0x") ? addr.slice(2) : addr;
  return core.slice(0, 6);
}
// Construct an asset label such as "PT-0123ab"
function assetLabel(kind: "pt" | "yt" | "lp", marketId: string): string {
  return `${kind.toUpperCase()}-${shortMarket(marketId)}`;
}

/**
 * Fetch Pendle positions for a given wallet.
 * Instead of using local snapshots to compute APR, we call Pendle’s market
 * data endpoint to obtain annualized yields (APYs).  Those APYs are used
 * as the 7‑day APR, 30‑day APR and 30‑day APY for each position.
 */
export const fetchPendlePositions: FetchPositions = async ({ address }) => {
  const url = `${PENDLE_POSITIONS_API}/${address.toLowerCase()}`;
  let json: AnyObj;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    json = (await res.json()) as AnyObj;
  } catch {
    return [];
  }

  const positionsArr: AnyObj[] = Array.isArray(json?.positions) ? json.positions : [];
  if (positionsArr.length === 0) return [];

  const out: Position[] = [];

  // Cache market‑level APY data per marketId to avoid repeated network calls
  const marketDataCache: Record<string, any> = {};

  // Helper to fetch APY metrics for a market
  async function getMarketData(marketId: string): Promise<any | undefined> {
    if (marketId in marketDataCache) return marketDataCache[marketId];
    const [chainIdStr, marketAddr] = marketId.split("-");
    if (!chainIdStr || !marketAddr) {
      marketDataCache[marketId] = undefined;
      return undefined;
    }
    const api = `${PENDLE_MARKET_DATA_BASE}/${chainIdStr}/markets/${marketAddr}/data`;
    try {
      const res = await fetch(api, { headers: { accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        marketDataCache[marketId] = data;
        return data;
      }
    } catch {
      // ignore network errors
    }
    marketDataCache[marketId] = undefined;
    return undefined;
  }

  // Iterate through chain buckets and positions
  for (const chainBucket of positionsArr) {
    const chainId = toNumber(chainBucket?.chainId);
    const chain: Position["chain"] | "skip" =
      chainId && CHAIN_MAP[chainId] ? CHAIN_MAP[chainId] : "skip";
    if (chain === "skip") continue;

    const opens: AnyObj[] = Array.isArray(chainBucket?.openPositions)
      ? chainBucket.openPositions
      : [];
    for (const op of opens) {
      const marketId: string = String(op?.marketId || "");

      // Pre‑fetch market APY data once per market
      const marketData = await getMarketData(marketId);

      // Each position may have PT, YT or LP legs; handle each separately
      const legs: Array<["pt" | "yt" | "lp", AnyObj | undefined]> = [
        ["pt", op?.pt],
        ["yt", op?.yt],
        ["lp", op?.lp],
      ];

      for (const [kind, leg] of legs) {
        if (!leg || typeof leg !== "object") continue;

        const valuation = toNumber(leg.valuation) ?? 0;
        const balanceBI = toBigIntOrZero(leg.balance);
        const activeBI = toBigIntOrZero(leg.activeBalance);
        // Skip zero‑value or zero‑balance legs
        if (valuation <= 0 && balanceBI === 0n && activeBI === 0n) continue;

        const asset = assetLabel(kind, marketId);

        let apr7d: number | undefined;
        let apr30d: number | undefined;
        let apy30d: number | undefined;

        // Derive APR/APY from market metrics based on the leg type
        if (marketData) {
          if (kind === "pt") {
            const implied = toNumber(marketData.impliedApy);
            if (implied !== undefined) {
              apr7d = implied;
              apr30d = implied;
              apy30d = implied;
            }
          } else if (kind === "yt") {
            const ytFloat = toNumber(marketData.ytFloatingApy);
            if (ytFloat !== undefined) {
              apr7d = ytFloat;
              apr30d = ytFloat;
              apy30d = ytFloat;
            }
          } else if (kind === "lp") {
            const agg = toNumber(marketData.aggregatedApy);
            if (agg !== undefined) {
              apr7d = agg;
              apr30d = agg;
              apy30d = agg;
            }
          }
        }

        out.push({
          protocol: "pendle",
          chain,
          address,
          asset,
          apr7d,
          apr30d,
          apy30d,
          valueUSD: valuation > 0 ? valuation : 0,
          detailsUrl: `https://app.pendle.finance/trade/market/${marketId}`,
        });
      }
    }
  }

  return out;
};
