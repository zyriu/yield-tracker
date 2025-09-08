import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useMemo } from "react";

import EmptyState from "./EmptyState";

import { adapters, fetchPositionsForAddress } from "@/adapters";
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";
import { getIcons, getPricesUSD } from "@/lib/coingecko";
import { useSessionStore, useUIStore } from "@/store";
import { formatPct, formatUSD, shortAddress } from "@/utils/format";

export default function PositionsTable() {
  const addressItems = useSessionStore((s) => s.addresses);
  const addresses = addressItems.map((a) => a.address);

  const groupMode = useUIStore((s) => s.groupMode);
  const setGroupMode = useUIStore((s) => s.setGroupMode);

  // Excluded positions for portfolio summary
  const excludedPositions = useUIStore((s) => s.excludedPositions);
  const togglePositionExcluded = useUIStore((s) => s.togglePositionExcluded);

  // Helper to build a stable ID for each position
  const generateId = (p: any): string =>
    [p.protocol, p.chain, p.address?.toLowerCase?.(), p.asset, p.marketProtocol ?? ""].join(":");

  const { pricesUSD, isLoading: pricesLoading } = getPricesUSD();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["positions", addresses],
    queryFn: async () => {
      const protocols = Object.keys(adapters);
      const res = await Promise.all(addresses.map((addr) => fetchPositionsForAddress(addr, protocols, pricesUSD!)));
      return res.flat();
    },
    enabled: addresses.length > 0 && !pricesLoading,
    staleTime: 60_000,
  });

  const icons = getIcons();

  const labelFor = useMemo(
    () => Object.fromEntries(addressItems.map((a) => [a.address.toLowerCase(), a.label] as const)),
    [addressItems]
  );
  const displayOwner = (addr: string) => labelFor[addr.toLowerCase()] || shortAddress(addr);

  // Group positions either by protocol or by wallet address
  const grouped = useMemo(() => {
    if (!data) return [];

    if (groupMode === "protocol") {
      const groups: Record<string, { title: string; total: number; rows: typeof data }> = {};
      for (const p of data) {
        const key = p.protocol;
        if (!groups[key]) groups[key] = { title: p.protocol, total: 0, rows: [] as any };
        groups[key].rows.push(p);
        const posId = generateId(p);
        if (!excludedPositions?.includes(posId)) {
          groups[key].total += p.valueUSD || 0;
        }
      }

      return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const groups: Record<string, { title: string; total: number; rows: typeof data }> = {};
      for (const p of data) {
        const title = labelFor[p.address.toLowerCase()] || shortAddress(p.address);
        const key = p.address.toLowerCase();
        if (!groups[key]) groups[key] = { title, total: 0, rows: [] as any };
        groups[key].rows.push(p);
        const posId = generateId(p);
        if (!excludedPositions?.includes(posId)) {
          groups[key].total += p.valueUSD || 0;
        }
      }

      return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [data, groupMode, labelFor, excludedPositions, generateId]);

  // Column widths: include toggle, owner/protocol, asset icon, source, chain, APR, APY, amount, value, claimable
  const Cols = () => (
    <colgroup>
      <col style={{ width: "2%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "16%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "18%" }} />
      <col style={{ width: "18%" }} />
    </colgroup>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full gap-3">
          <CardTitle>Positions</CardTitle>
          <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap">
            <span className="text-xs text-text-muted">Group by</span>
            <Select
              value={groupMode}
              onChange={(e) => setGroupMode((e.target.value as "protocol" | "wallet") ?? "protocol")}
              className="min-w-[140px]"
            >
              <option value="protocol">Protocol</option>
              <option value="wallet">Wallet</option>
            </Select>
            <Button onClick={() => refetch()} disabled={isFetching} className="px-6">
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="animate-pulse space-y-2">
            <div className="h-8 w-1/3 rounded bg-white/10" />
            <div className="h-5 w-full rounded bg-white/10" />
            <div className="h-5 w-full rounded bg-white/10" />
            <div className="h-5 w-full rounded bg-white/10" />
          </div>
        )}
        {isError && <p className="text-sm text-red-400">{(error as Error)?.message ?? "Error"}</p>}
        {!isLoading && !isError && (!data || data.length === 0) && (
          <EmptyState title="No positions found" hint="Add an address to start tracking." />
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="space-y-5">
            {grouped.map((g, gi) => (
              <div key={gi} className="rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm font-semibold capitalize">{g.title}</div>
                  <div className="text-sm font-medium text-white">
                    Total: <span className="font-semibold">{formatUSD(g.total)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <Cols />
                    <thead className="sticky top-0 bg-bg">
                      <tr className="text-left">
                        <th className="py-2 px-3"></th>
                        {groupMode === "protocol" ? (
                          <>
                            <th className="py-2 px-3 text-center">Wallet</th>
                            <th className="py-2 px-3 text-center">Asset</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2 px-3 text-center">Protocol</th>
                            <th className="py-2 px-3 text-center">Asset</th>
                          </>
                        )}
                        <th className="py-2 px-3 text-center">Source</th>
                        <th className="py-2 px-3 text-center">Chain</th>
                        <th className="py-2 px-3 text-center">APR (7d)</th>
                        <th className="py-2 px-3 text-center">Lifetime APR</th>
                        <th className="py-2 px-3 text-center">Value</th>
                        <th className="py-2 px-3 text-right">Claimable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((p, i) => {
                        const posId = generateId(p);
                        const isExcluded = excludedPositions?.includes(posId);

                        return (
                          <tr key={i} className={`border-t border-white/10 ${isExcluded ? "opacity-50" : ""}`}>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => togglePositionExcluded(posId)}
                                aria-label="toggle position"
                                className="p-1"
                              >
                                {isExcluded ? (
                                  <EyeOff className="h-4 w-4 text-red-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-green-400" />
                                )}
                              </button>
                            </td>
                            {groupMode === "protocol" ? (
                              <td className="py-2 px-3 text-center">{displayOwner(p.address)}</td>
                            ) : (
                              <td className="py-2 px-3 capitalize text-center">{p.protocol}</td>
                            )}
                            {/* Asset */}
                            <td className="py-2 px-3 text-center">{p.asset}</td>
                            {/* Source */}
                            <td className="py-2 px-3 text-center">{p.marketProtocol ?? "-"}</td>
                            {/* Chain */}
                            <td className="py-2 px-3 text-center capitalize">
                              {(icons as { [_: string]: string })[p.chain] ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 bg-white/10 rounded-full">
                                  <img
                                    src={(icons as { [_: string]: string })[p.chain]}
                                    alt={p.chain}
                                    className="w-4 h-4"
                                  />
                                </div>
                              ) : (
                                p.chain
                              )}
                            </td>
                            {/* 7‑day APR */}
                            <td className="py-2 px-3 text-center">
                              {(() => {
                                const apr = p.apr7d;
                                if (apr === undefined) return "-";
                                const isNeg = apr < 0;
                                const colorClass =
                                  isNeg && apr <= -0.99 ? "text-red-500" : isNeg ? "text-orange-500" : "";
                                return <span className={colorClass}>{formatPct(apr)}</span>;
                              })()}
                            </td>
                            {/* Lifetime APR */}
                            <td className="py-2 px-3 text-center">-</td>
                            {/* Value */}
                            <td className="py-2 px-3 text-center tabular-nums">{formatUSD(p.valueUSD)}</td>
                            {/* Claimable */}
                            <td className="py-2 px-3 text-right">
                              {p.claimableRewards ? (
                                <>
                                  {p.claimableRewards}
                                  {p.claimableRewardsValueUSD !== undefined && p.claimableRewardsValueUSD > 0 && (
                                    <> ({formatUSD(p.claimableRewardsValueUSD)})</>
                                  )}
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
