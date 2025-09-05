import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select } from "./ui/select";

import { adapters, fetchPositionsForAddress } from "@/adapters";
import { useSessionStore } from "@/store/useSessionStore";
import { formatPct, formatUSD } from "@/utils/format";

/**
 * Fetch positions across all protocols for an array of wallet addresses.
 */
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
  const { data } = useQuery({
    queryKey: ["portfolio-summary", addresses, rpc],
    queryFn: () => fetchAllPositions(addresses),
    enabled: addresses.length > 0,
  });

  // Fetch BTC and SOL prices from CoinGecko (denominated in USD)
  const [prices, setPrices] = useState<{ btc: number | null; sol: number | null }>({
    btc: null,
    sol: null,
  });

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=usd")
      .then((res) => res.json())
      .then((json) => {
        setPrices({
          btc: json?.bitcoin?.usd ?? null,
          sol: json?.solana?.usd ?? null,
        });
      })
      .catch(() => {
        // ignore network errors
      });
  }, []);

  // State for selected denomination (usd, btc or sol)
  const [currency, setCurrency] = useState<"usd" | "btc" | "sol">("usd");

  // Sum the USD value of all positions
  const totalUSD = useMemo(() => {
    if (!data) return 0;
    return data.reduce((acc, p) => acc + (p.valueUSD || 0), 0);
  }, [data]);

  // Calculate weighted average yield and nominal yield (in USD)
  const { weightedYield, nominalYieldUSD } = useMemo(() => {
    if (!data || data.length === 0) return { weightedYield: 0, nominalYieldUSD: 0 };
    let weightedSum = 0;
    let nominalSum = 0;
    data.forEach((p) => {
      const val = p.valueUSD || 0;
      const apy = p.apy30d ?? p.apr30d ?? p.apr7d ?? 0;
      weightedSum += val * apy;
      nominalSum += val * apy;
    });
    return {
      weightedYield: totalUSD > 0 ? weightedSum / totalUSD : 0,
      nominalYieldUSD: nominalSum,
    };
  }, [data, totalUSD]);

  // Determine conversion price based on selected currency
  let denomPrice: number | null = 1;
  if (currency === "btc") denomPrice = prices.btc;
  if (currency === "sol") denomPrice = prices.sol;

  // Convert total and nominal yields into the selected currency
  const totalInSelected = denomPrice && denomPrice > 0 ? totalUSD / denomPrice : null;
  const nominalInSelected = denomPrice && denomPrice > 0 ? nominalYieldUSD / denomPrice : null;

  // Monthly yield simply divides annual nominal yield by 12
  const monthlyYieldInSelected = nominalInSelected !== null ? nominalInSelected / 12 : null;

  // Format a value based on selected currency
  function formatValue(val: number | null): string {
    if (val === null) return "-";
    if (currency === "usd") return formatUSD(val);
    if (currency === "btc") return `${val.toFixed(6)} BTC`;
    if (currency === "sol") return `${val.toFixed(6)} SOL`;
    return val.toString();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Summary</CardTitle>
          <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap">
            <span className="text-xs text-text-muted">Denominator</span>
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "usd" | "btc" | "sol")}
            >
              <option value="usd">USD</option>
              <option value="btc">BTC</option>
              <option value="sol">SOL</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
