import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select } from "./ui/select";

import { adapters, fetchPositionsForAddress } from "@/adapters";
import { getPricesUSD } from "@/lib/prices";
import { useSessionStore } from "@/store/useSessionStore";
import { formatPct, formatUSD } from "@/utils/format";

const fetchAllPositions = async (addresses: string[]) => {
  const protocols = Object.keys(adapters);
  const res = await Promise.all(addresses.map((addr) => fetchPositionsForAddress(addr, protocols)));
  return res.flat();
};

export default function PortfolioSummaryCard() {
  // Gather all tracked addresses and RPC URL
  const addresses = useSessionStore((s) => s.addresses.map((a) => a.address));
  const rpc = useSessionStore((s) => s.rpcUrl);

  // Query all positions for the tracked addresses
  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ["portfolio-summary", addresses, rpc],
    queryFn: () => fetchAllPositions(addresses),
    enabled: addresses.length > 0,
    staleTime: 60_000, // cache positions for 1 minute
    cacheTime: 120_000,
  });

  // Fetch USDe, BTC, ETH and SOL prices from CoinGecko using a single call.
  // This hook returns a price map keyed by asset symbol. If the fetch fails
  // or is still loading, the values will be undefined.
  const { data: priceData, isLoading: pricesLoading } = useQuery({
    queryKey: ["coingecko-prices"],
    queryFn: getPricesUSD,
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    cacheTime: 1000 * 60 * 60 * 6,
  });

  // State for selected denomination (usd, btc, eth or sol)
  const [currency, setCurrency] = useState<"usd" | "btc" | "eth" | "sol">("usd");

  // Sum the USD value of all positions
  const totalUSD = useMemo(() => {
    if (!positions) return 0;
    return positions.reduce((acc, p) => acc + (p.valueUSD || 0), 0);
  }, [positions]);

  // Calculate weighted average yield and nominal yield (in USD)
  const { weightedYield, nominalYieldUSD } = useMemo(() => {
    if (!positions || positions.length === 0) return { weightedYield: 0, nominalYieldUSD: 0 };
    let weightedSum = 0;
    let nominalSum = 0;
    positions.forEach((p) => {
      const val = p.valueUSD || 0;
      // Determine the position's APR/APY (prefer 30d APY, then 30d APR, then 7d APR)
      let apy = p.apy30d ?? p.apr30d ?? p.apr7d ?? 0;
      // Treat negative yields (e.g. YT tokens) as zero
      if (apy < 0) apy = 0;
      weightedSum += val * apy;
      nominalSum += val * apy;
    });
    // Divide by totalUSD so zero‑yield positions still contribute to the denominator
    const weightedYield = totalUSD > 0 ? weightedSum / totalUSD : 0;
    return { weightedYield, nominalYieldUSD: nominalSum };
  }, [positions, totalUSD]);

  // Determine conversion price based on selected currency
  let denomPrice: number | null = 1;
  if (currency === "btc") denomPrice = priceData?.btc ?? null;
  if (currency === "eth") denomPrice = priceData?.eth ?? null;
  if (currency === "sol") denomPrice = priceData?.sol ?? null;

  // Convert total and nominal yields into the selected currency
  const totalInSelected = denomPrice && denomPrice > 0 ? totalUSD / denomPrice : null;
  const nominalInSelected = denomPrice && denomPrice > 0 ? nominalYieldUSD / denomPrice : null;

  // Monthly yield simply divides annual nominal yield by 12
  const monthlyYieldInSelected = nominalInSelected !== null ? nominalInSelected / 12 : null;

  // Format a value based on selected currency
  function formatValue(val: number | null): string {
    if (val === null) return "-";
    if (currency === "usd") return formatUSD(val);
    if (currency === "btc") return `${val.toFixed(4)} BTC`;
    if (currency === "eth") return `${val.toFixed(3)} ETH`;
    if (currency === "sol") return `${val.toFixed(2)} SOL`;
    return val.toString();
  }

  const isLoading = positionsLoading || pricesLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Summary</CardTitle>
          <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap">
            <span className="text-xs text-text-muted">Denominator</span>
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "usd" | "btc" | "eth" | "sol")}
            >
              <option value="usd">USD</option>
              <option value="btc">BTC</option>
              <option value="eth">ETH</option>
              <option value="sol">SOL</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-baseline animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-4 bg-white/10 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-text-muted">Total Value</span>
              <span className="text-base font-semibold">{formatValue(totalInSelected)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-text-muted">Average APY</span>
              <span className="text-sm font-semibold">{formatPct(weightedYield)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-text-muted">Nominal Yield</span>
              <span className="text-sm font-semibold">{formatValue(nominalInSelected)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-text-muted">Monthly Yield</span>
              <span className="text-sm font-semibold">{formatValue(monthlyYieldInSelected)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
