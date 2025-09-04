import type { FetchPositions, Position } from "./types";

// API: /core/v1/dashboard/positions/database/{user}
const PENDLE_API = "https://api-v2.pendle.finance/core/v1/dashboard/positions/database";

type AnyObj = Record<string, any>;

const CHAIN_MAP: Record<number, Position["chain"] | "skip"> = {
  1: "ethereum",
  42161: "arbitrum",
  // keep others as "skip" for now — we only ingest ETH/ARB from this endpoint
};

function toNumber(x: any): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}
function toBigIntOrZero(x: any): bigint {
  try {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(Math.trunc(x));
    if (typeof x === "string" && x.length > 0) return BigInt(x);
  } catch {}
  return 0n;
}
function shortMarket(marketId: string): string {
  const addr = marketId.split("-")[1] || marketId;
  const core = addr.startsWith("0x") ? addr.slice(2) : addr;
  return core.slice(0, 6);
}
function assetLabel(kind: "pt" | "yt" | "lp", marketId: string): string {
  return `${kind.toUpperCase()}-${shortMarket(marketId)}`;
}

/** ---- Local snapshot storage (browser-only) for Pendle yield calc ---- */
type Snap = { t: number; v: number }; // timestamp ms, valueUSD
type SnapMap = Record<string, Snap[]>; // key -> array sorted asc by t
const LS_KEY = "pendle-snapshots-v1";

function loadSnaps(): SnapMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj ? (obj as SnapMap) : {};
  } catch {
    return {};
  }
}
function saveSnaps(s: SnapMap) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}
function pushSnap(key: string, v: number, now = Date.now()) {
  const s = loadSnaps();
  const arr = s[key] || [];
  // drop duplicates within 3 hours
  const THREE_H = 3 * 60 * 60 * 1000;
  if (arr.length === 0 || now - arr[arr.length - 1].t > THREE_H) {
    arr.push({ t: now, v });
  } else {
    arr[arr.length - 1] = { t: now, v };
  }
  // keep last ~60 days worth (coarse)
  const SIXTY_D = 60 * 24 * 60 * 60 * 1000;
  const cutoff = now - SIXTY_D;
  s[key] = arr.filter((x) => x.t >= cutoff);
  saveSnaps(s);
}
function findSnapshotNear(key: string, targetAgeDays: number, wiggleDays = 2): Snap | undefined {
  const s = loadSnaps();
  const arr = s[key];
  if (!arr || arr.length === 0) return undefined;
  const now = Date.now();
  const targetT = now - targetAgeDays * 24 * 60 * 60 * 1000;
  const minT = now - (targetAgeDays + wiggleDays) * 24 * 60 * 60 * 1000;
  const maxT = now - (targetAgeDays - wiggleDays) * 24 * 60 * 60 * 1000;
  // pick the closest snapshot whose t in [minT, maxT]; fallback to the oldest if still before target
  let best: Snap | undefined;
  let bestDelta = Infinity;
  for (const s of arr) {
    if (s.t < minT || s.t > maxT) continue;
    const d = Math.abs(s.t - targetT);
    if (d < bestDelta) {
      best = s;
      bestDelta = d;
    }
  }
  if (best) return best;
  // fallback: choose the snapshot just before targetT if exists
  let prev: Snap | undefined;
  for (const s0 of arr) {
    if (!prev || (s0.t <= targetT && s0.t > prev.t)) prev = s0;
  }
  return prev;
}
function annualizeSimple(periodReturn: number, days: number): number {
  return periodReturn * (365 / days);
}
function annualizeCompounded(periodReturn: number, days: number): number {
  return Math.pow(1 + periodReturn, 365 / days) - 1;
}

/** ------------------------------------------------------------------- */

export const fetchPendlePositions: FetchPositions = async ({ address }) => {
  const url = `${PENDLE_API}/${address.toLowerCase()}`;
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
  const nowMs = Date.now();

  for (const chainBucket of positionsArr) {
    const chainId = toNumber(chainBucket?.chainId);
    const chain = chainId && CHAIN_MAP[chainId] ? CHAIN_MAP[chainId] : "skip";
    if (chain === "skip") continue;

    const opens: AnyObj[] = Array.isArray(chainBucket?.openPositions)
      ? chainBucket.openPositions
      : [];
    for (const op of opens) {
      const marketId: string = String(op?.marketId || "");

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
        const key = `${address.toLowerCase()}|${marketId}|${kind}`;

        // push current snapshot for later periods
        if (valuation > 0) pushSnap(key, valuation, nowMs);

        // compute 7d / 30d from snapshots if available
        let apr7d: number | undefined;
        let apr30d: number | undefined;
        let apy30d: number | undefined;
        const snap7 = findSnapshotNear(key, 7);
        const snap30 = findSnapshotNear(key, 30);
        if (valuation > 0 && snap7 && snap7.v > 0) {
          const r7 = valuation / snap7.v - 1;
          apr7d = annualizeSimple(r7, 7);
        }
        if (valuation > 0 && snap30 && snap30.v > 0) {
          const r30 = valuation / snap30.v - 1;
          apr30d = annualizeSimple(r30, 30);
          apy30d = annualizeCompounded(r30, 30);
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
