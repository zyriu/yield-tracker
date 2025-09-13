import axios, { HttpStatusCode } from "axios";
import { Abi, Address, formatUnits } from "viem";

import type { FetchPositions, Position } from "./types";

import { abis, getClientForChain, multicall } from "@/lib/web3";
import { ChainId, CHAINS } from "@/lib/web3/chains";

const erc20 = abis.erc20 as Abi;

// Dashboard positions endpoint
const PENDLE_POSITIONS_API = "https://api-v2.pendle.finance/core/v1/dashboard/positions/database";

// Base for market data (used to fetch APY metrics)
const PENDLE_MARKET_DATA_BASE = "https://api-v2.pendle.finance/core/v2";

// Base for market details (returns protocol and other info)
const PENDLE_MARKET_DETAILS_BASE = "https://api-v2.pendle.finance/core/v1";

type AnyObj = Record<string, any>;

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

  for (const chainBucket of positionsArr) {
    try {
      const chainId: ChainId | undefined = toNumber(chainBucket?.chainId) as ChainId;
      const chain = chainId && CHAINS[chainId] ? CHAINS[chainId] : "skip";

      if (chain === "skip") continue;

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

          let claimableRewards = "";
          let claimableRewardsValueUSD = 0;

          const [claimable] = leg.claimTokenAmounts;
          if (claimable) {
            const { token, amount: rawAmount } = claimable;
            const [id, tokenAddress] = token.split("-");

            const client = getClientForChain(Number(id));

            // TODO hyperevm client doesn't support multicall yet
            if (id !== "999" && client) {
              const blockNumber = await client.getBlockNumber();
              const [decimals, rawSymbol] = (await multicall(client, [
                { address: tokenAddress as Address, abi: erc20, functionName: "decimals", blockNumber },
                { address: tokenAddress as Address, abi: erc20, functionName: "symbol", blockNumber },
              ])) as [number, string];

              const amount = Number(formatUnits(rawAmount, decimals));
              const symbol = rawSymbol.replace("SY-", "");
              claimableRewards = `${amount.toFixed(2)} ${symbol}`;
              claimableRewardsValueUSD = amount * pricesUSD[symbol.toLowerCase() as keyof typeof pricesUSD] || 0;
            }
          }

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
    } catch (err) {
      console.error(err);
    }
  }

  return out;
};
