import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select } from "./ui/select";

import { adapters, fetchPositionsForAddress } from "@/adapters";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { formatPct, formatUSD, shortAddress } from "@/utils/format";

// Helper to fetch positions across multiple protocols for all addresses
const fetchAll = async (addresses: string[]) => {
  const protocols = Object.keys(adapters);
  const res = await Promise.all(addresses.map((addr) => fetchPositionsForAddress(addr, protocols)));
  return res.flat();
};

// Map each chain to its corresponding CoinGecko ID for icon fetching
const chainToCoingeckoId: Record<string, string> = {
  ethereum: "ethereum",
  arbitrum: "arbitrum",
  hyperliquid: "hyperliquid",
};

// Dashboard URLs for protocol names
const protocolLinks: Record<string, string> = {
  pendle: "https://app.pendle.finance",
  ethena: "https://app.ethena.fi",
  spark: "https://app.spark.fi",
  sky: "https://app.sky.money",
};

export default function PositionsTable() {
  const addressItems = useSessionStore((s) => s.addresses);
  const addresses = addressItems.map((a) => a.address);
  const rpc = useSessionStore((s) => s.rpcUrl);

  const groupMode = useUIStore((s) => s.groupMode);
  const setGroupMode = useUIStore((s) => s.setGroupMode);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["positions", addresses, rpc],
    queryFn: () => fetchAll(addresses),
    enabled: addresses.length > 0,
  });

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
        groups[key].total += p.valueUSD || 0;
      }
      return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const groups: Record<string, { title: string; total: number; rows: typeof data }> = {};
      for (const p of data) {
        const title = labelFor[p.address.toLowerCase()] || shortAddress(p.address);
        const key = p.address.toLowerCase();
        if (!groups[key]) groups[key] = { title, total: 0, rows: [] as any };
        groups[key].rows.push(p);
        groups[key].total += p.valueUSD || 0;
      }
      return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [data, groupMode, labelFor]);

  // State for chain icons fetched from CoinGecko
  const [chainIcons, setChainIcons] = useState<Record<string, string>>({});

  // Fetch icons when new chains appear in the data
  useEffect(() => {
    const uniqueChains = Array.from(new Set(data?.map((p) => p.chain) || []));
    uniqueChains.forEach((chain) => {
      if (chainIcons[chain]) return;
      const id = chainToCoingeckoId[chain];
      if (!id) return;
      fetch(`https://api.coingecko.com/api/v3/coins/${id}`)
        .then((res) => res.json())
        .then((json) => {
          const icon = json?.image?.small || json?.image?.thumb || json?.image?.large || "";
          if (icon) {
            setChainIcons((prev) => ({ ...prev, [chain]: icon }));
          }
        })
        .catch(() => {
          // ignore errors
        });
    });
  }, [data, chainIcons]);

  // Column widths: owner/protocol, asset, source, chain, APY, value, current yield
  const Cols = () => (
    <colgroup>
      <col style={{ width: "12%" }} />
      <col style={{ width: "20%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "18%" }} />
      <col style={{ width: "18%" }} />
      <col style={{ width: "10%" }} />
    </colgroup>
  );

  // Choose an APY value in order of preference
  const getApy = (p: any) => p.apy30d ?? p.apr30d ?? p.apr7d;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full gap-3">
          <CardTitle>Positions</CardTitle>
          <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap">
            <span className="text-xs text-text-muted">Group by</span>
            <Select
              value={groupMode}
              onChange={(e) =>
                setGroupMode((e.target.value as "protocol" | "wallet") ?? "protocol")
              }
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
        {isLoading && <LoadingSkeleton />}
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
                  <table className="w-full text-sm table-fixed">
                    <Cols />
                    <thead className="sticky top-0 bg-bg">
                      <tr className="text-left">
                        {groupMode === "protocol" ? (
                          <>
                            <th className="py-2 px-3">Wallet</th>
                            <th className="py-2 px-3 text-center">Asset</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2 px-3">Protocol</th>
                            <th className="py-2 px-3 text-center">Asset</th>
                          </>
                        )}
                        <th className="py-2 px-3 text-center">Source</th>
                        <th className="py-2 px-3 text-center">Chain</th>
                        <th className="py-2 px-3 text-center">APY</th>
                        <th className="py-2 px-3 text-center">Value</th>
                        <th className="py-2 px-3 text-right">Current yield</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((p, i) => (
                        <tr key={i} className="border-t border-white/10">
                          {groupMode === "protocol" ? (
                            <td className="py-2 px-3">{displayOwner(p.address)}</td>
                          ) : (
                            <td className="py-2 px-3 capitalize">
                              {protocolLinks[p.protocol] ? (
                                <a
                                  href={protocolLinks[p.protocol]}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand hover:underline capitalize"
                                >
                                  {p.protocol}
                                </a>
                              ) : (
                                p.protocol
                              )}
                            </td>
                          )}
                          <td className="py-2 px-3 text-center truncate">{p.asset}</td>
                          <td className="py-2 px-3 text-center">{p.marketProtocol ?? "-"}</td>
                          <td className="py-2 px-3 text-center capitalize">
                            {chainIcons[p.chain] ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-white/10 rounded-full">
                                <img src={chainIcons[p.chain]} alt={p.chain} className="w-4 h-4" />
                              </div>
                            ) : (
                              p.chain
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {(() => {
                              const apy = getApy(p);
                              if (apy === undefined) return "-";
                              const isYT = p.asset.startsWith("YT-");
                              const colorClass =
                                isYT && apy <= -0.99
                                  ? "text-red-500"
                                  : isYT && apy < 0
                                    ? "text-orange-500"
                                    : "";
                              return <span className={colorClass}>{formatPct(apy)}</span>;
                            })()}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums">
                            {formatUSD(p.valueUSD)}
                          </td>
                          <td className="py-2 px-3 text-right">{p.claimableRewards ?? "-"}</td>
                        </tr>
                      ))}
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
