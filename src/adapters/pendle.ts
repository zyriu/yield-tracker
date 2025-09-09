import axios, { HttpStatusCode } from "axios";

import type { FetchPositions, Position } from "./types";
import type { Prices } from "@/lib/coingecko/prices";

// Dashboard positions endpoint
const PENDLE_POSITIONS_API = "https://api-v2.pendle.finance/core/v1/dashboard/positions/database";

// Base for market data (used to fetch APY metrics)
const PENDLE_MARKET_DATA_BASE = "https://api-v2.pendle.finance/core/v2";

// Base for market details (returns protocol and other info)
const PENDLE_MARKET_DETAILS_BASE = "https://api-v2.pendle.finance/core/v1";

// Base for rewards/claims data
const PENDLE_REWARDS_BASE = "https://api-v2.pendle.finance/core/v1";

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

// Produce a human‑readable asset label.  If metadata exists in
// marketMetaCache, include the market name and expiry date; otherwise fall
// back to a truncated address.
function assetLabel(kind: "pt" | "yt" | "lp", marketId: string): string {
  const [chainIdStr, marketAddr] = marketId.split("-");
  const key = `${chainIdStr}-${marketAddr}`;
  const meta = marketMetaCache[key];
  if (meta?.name && meta.expiry) {
    const date = new Date(meta.expiry);
    const dateStr = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${kind.toUpperCase()}-${meta.name} (${dateStr})`;
  }
  const core = marketAddr.startsWith("0x") ? marketAddr.slice(2) : marketAddr;
  return `${kind.toUpperCase()}-${core.slice(0, 6)}`;
}

/**
 * Pendle adapter: fetches open positions on Pendle and maps yield data to APR (7d) and APY.
 * Since Pendle’s API returns a single APY figure (implied/aggregated), we treat that
 * value as both the 7‑day APR and the APY.
 */
export const fetchPendlePositions: FetchPositions = async ({ address, pricesUSD }) => {
  let json: AnyObj;
  try {
    const { data, status } = await axios.get(`${PENDLE_POSITIONS_API}/${address.toLowerCase()}`, {
      headers: { accept: "application/json" },
    });

    if (status !== HttpStatusCode.Ok) return [];

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
  const rewardsCache: Record<string, any> = {};

  // Fetch claimable rewards for a user on a specific chain
  async function getClaimableRewards(chainId: number, userAddress: string): Promise<any | undefined> {
    const cacheKey = `${chainId}-${userAddress}`;
    if (cacheKey in rewardsCache) return rewardsCache[cacheKey];

    // Try multiple possible endpoints for rewards
    const possibleEndpoints = [
      `${PENDLE_REWARDS_BASE}/${chainId}/users/${userAddress.toLowerCase()}/rewards`,
      `${PENDLE_REWARDS_BASE}/${chainId}/users/${userAddress.toLowerCase()}/claimable`,
      `${PENDLE_REWARDS_BASE}/${chainId}/rewards/${userAddress.toLowerCase()}`,
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        const { data, status } = await axios.get(endpoint, {
          headers: { accept: "application/json" },
        });

        if (status === HttpStatusCode.Ok && data) {
          rewardsCache[cacheKey] = data;
          return data;
        }
      } catch {
        // Continue to next endpoint
      }
    }

    rewardsCache[cacheKey] = undefined;
    return undefined;
  }

  // Fetch APY metrics for a given market (impliedApy, ytFloatingApy, aggregatedApy)
  async function getMarketData(marketId: string): Promise<any | undefined> {
    if (marketId in marketDataCache) return marketDataCache[marketId];
    const [chainIdStr, marketAddr] = marketId.split("-");
    if (!chainIdStr || !marketAddr) {
      marketDataCache[marketId] = undefined;
      return undefined;
    }

    try {
      const { data, status } = await axios.get(`${PENDLE_MARKET_DATA_BASE}/${chainIdStr}/markets/${marketAddr}/data`, {
        headers: { accept: "application/json" },
      });

      if (status === HttpStatusCode.Ok) {
        marketDataCache[marketId] = data;
        return data;
      }
    } catch {
      /* empty */
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

    try {
      const { data, status } = await axios.get(`${PENDLE_MARKET_DETAILS_BASE}/${chainIdStr}/markets/${marketAddr}`, {
        headers: { accept: "application/json" },
      });

      if (status === HttpStatusCode.Ok) {
        marketDetailsCache[marketId] = data;
        return data;
      }
    } catch {
      /* empty */
    }

    marketDetailsCache[marketId] = undefined;
    return undefined;
  }

  // Calculate claimable rewards for a specific position
  function calculateClaimableRewards(
    chainRewards: any,
    marketId: string,
    positionKind: "pt" | "yt" | "lp",
    pricesUSD: Prices,
    legData?: any
  ): { claimableRewards?: string; claimableRewardsValueUSD?: number } {
    
    // Token symbol to price key mapping
    const tokenPriceMapping: Record<string, keyof Prices> = {
      'PENDLE': 'pendle',
      'ETH': 'eth',
      'WETH': 'eth',
      'BTC': 'btc',
      'WBTC': 'btc',
      'SOL': 'sol',
      'SPK': 'spk',
      'USDE': 'usde'
    };

    const rewardTokens: string[] = [];
    let totalValueUSD = 0;

    // First, try to get rewards from the leg data (more likely to be available)
    if (legData) {
      const possibleRewardFields = [
        'claimableRewards',
        'pendingRewards', 
        'rewards',
        'claimable',
        'earned'
      ];

      for (const field of possibleRewardFields) {
        const rewardData = legData[field];
        if (rewardData) {
          // Handle different reward data structures
          if (Array.isArray(rewardData)) {
            for (const reward of rewardData) {
              const amount = toNumber(reward?.amount || reward?.balance);
              const tokenSymbol = reward?.token || reward?.symbol;
              
              if (amount && amount > 0 && tokenSymbol) {
                const formattedAmount = amount.toFixed(4);
                rewardTokens.push(`${formattedAmount} ${tokenSymbol}`);
                
                const priceKey = tokenPriceMapping[tokenSymbol.toUpperCase()];
                if (priceKey && pricesUSD[priceKey] > 0) {
                  totalValueUSD += amount * pricesUSD[priceKey];
                }
              }
            }
          } else if (typeof rewardData === 'object' && rewardData !== null) {
            // Handle single reward object
            const amount = toNumber(rewardData.amount || rewardData.balance);
            const tokenSymbol = rewardData.token || rewardData.symbol;
            
            if (amount && amount > 0 && tokenSymbol) {
              const formattedAmount = amount.toFixed(4);
              rewardTokens.push(`${formattedAmount} ${tokenSymbol}`);
              
              const priceKey = tokenPriceMapping[tokenSymbol.toUpperCase()];
              if (priceKey && pricesUSD[priceKey] > 0) {
                totalValueUSD += amount * pricesUSD[priceKey];
              }
            }
          }
        }
      }
    }

    // If no rewards found in leg data, try chainRewards data
    if (rewardTokens.length === 0 && chainRewards?.rewards && Array.isArray(chainRewards.rewards)) {
      // Find rewards for this specific market
      const marketRewards = chainRewards.rewards.filter((reward: any) => {
        const rewardMarketId = reward?.marketId || reward?.market;
        return rewardMarketId === marketId;
      });

      for (const reward of marketRewards) {
        // Check if this reward applies to the current position type
        const rewardType = reward?.type?.toLowerCase() || "";
        if (rewardType && !rewardType.includes(positionKind)) {
          continue; // Skip rewards that don't apply to this position type
        }

        const amount = toNumber(reward?.amount || reward?.claimable);
        const tokenSymbol = reward?.tokenSymbol || reward?.symbol;

        if (!amount || amount <= 0 || !tokenSymbol) continue;

        // Format the reward amount
        const formattedAmount = amount.toFixed(4);
        rewardTokens.push(`${formattedAmount} ${tokenSymbol}`);

        // Calculate USD value if price is available
        const priceKey = tokenPriceMapping[tokenSymbol.toUpperCase()];
        if (priceKey && pricesUSD[priceKey] > 0) {
          totalValueUSD += amount * pricesUSD[priceKey];
        }
      }
    }

    if (rewardTokens.length === 0) {
      return { claimableRewards: undefined, claimableRewardsValueUSD: undefined };
    }

    const claimableRewards = rewardTokens.join(" + ");
    const claimableRewardsValueUSD = totalValueUSD > 0 ? totalValueUSD : undefined;

    return { claimableRewards, claimableRewardsValueUSD };
  }

  // Load active markets for a given chain and populate marketMetaCache
  async function loadMarketMeta(chainId: number) {
    if (activeMarketsFetched[chainId]) return;
    try {
      const { data, status } = await axios.get(`https://api-v2.pendle.finance/core/v1/${chainId}/markets/active`, {
        headers: { accept: "application/json" },
      });
      if (status === HttpStatusCode.Ok) {
        const { markets } = data;
        if (Array.isArray(markets)) {
          for (const m of markets) {
            if (m?.address && m?.name && m?.expiry) {
              const key = `${chainId}-${m.address}`;
              marketMetaCache[key] = {
                name: m.name,
                expiry: m.expiry,
              };
            }
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

    // Fetch claimable rewards for this chain
    const chainRewards = typeof chainId === "number" ? await getClaimableRewards(chainId, address) : undefined;

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
        const activeBI = toBigIntOrZero(leg.activeBalance);
        if (valuation <= 0 && balanceBI === 0n && activeBI === 0n) continue;

        const asset = assetLabel(kind, marketId);

        let apr7d: number | undefined;

        // Derive yields from marketData: use impliedApy for PT,
        // ytFloatingApy for YT, aggregatedApy for LP.
        if (marketData) {
          if (kind === "pt") {
            const implied = toNumber(marketData.impliedApy);
            if (implied !== undefined) {
              apr7d = implied;
            }
          } else if (kind === "yt") {
            const ytFloat = toNumber(marketData.ytFloatingApy);
            if (ytFloat !== undefined) {
              apr7d = ytFloat;
            }
          } else if (kind === "lp") {
            const agg = toNumber(marketData.aggregatedApy);
            if (agg !== undefined) {
              apr7d = agg;
            }
          }
        }

        // Build a details URL pointing to the Pendle app.  Use the market
        // address directly and append the chain ID as a query parameter.  This
        // mirrors the structure used on pendle.finance (e.g.
        // markets/<address>?chainId=1).
        let detailsUrl: string | undefined;
        const [chainIdStr, marketAddr] = marketId.split("-");
        if (chainIdStr && marketAddr) {
          detailsUrl = `https://app.pendle.finance/markets/${marketAddr}?chainId=${chainIdStr}`;
        }

        // Calculate claimable rewards for this position
        const { claimableRewards, claimableRewardsValueUSD } = calculateClaimableRewards(
          chainRewards, 
          marketId, 
          kind, 
          pricesUSD,
          leg
        );

        out.push({
          protocol: "pendle",
          chain,
          address,
          asset,
          marketProtocol: protocolName,
          apr7d,
          lifetimeAPR: 0,
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
