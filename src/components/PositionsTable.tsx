import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Select } from "./ui/select";

import { adapters, fetchPositionsForAddress } from "@/adapters";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { formatUSD, formatPct, shortAddress } from "@/utils/format";

const fetchAll = async (addresses: string[]) => {
  const protocols = Object.keys(adapters);
  const res = await Promise.all(
    addresses.map((addr) => fetchPositionsForAddress(addr, protocols))
  );
  return res.flat();
};

export default function PositionsTable() {
  const addressItems = useSessionStore((s) => s.addresses);
  const addresses = addressItems.map((a) => a.address);
  const rpc = useSessionStore((s) => s.rpcUrl);

  const groupMode = useUIStore((s) => s.groupMode);
  const setGroupMode = useUIStore((s) => s.setGroupMode);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["positions", addresses, rpc],
    queryFn: () => fetchAll(addresses),
    enabled: addresses.length > 0,
  });

  const labelFor = useMemo(
    () =>
      Object.fromEntries(
        addressItems.map((a) => [a.address.toLowerCase(), a.label] as const)
      ),
    [addressItems]
  );
  const displayOwner = (addr: string) =>
    labelFor[addr.toLowerCase()] || shortAddress(addr);

  const grouped = useMemo(() => {
    if (!data) return [];
    if (groupMode === "protocol") {
      const groups: Record<
        string,
        { title: string; total: number; rows: typeof data }
      > = {};
      for (const p of data) {
        const key = p.protocol;
        if (!groups[key])
          groups[key] = { title: p.protocol, total: 0, rows: [] as any };
        groups[key].rows.push(p);
        groups[key].total += p.valueUSD || 0;
      }
      return Object.values(groups).sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    } else {
      const groups: Record<
        string,
        { title: string; total: number; rows: typeof data }
      > = {};
      for (const p of data) {
        const title =
          labelFor[p.address.toLowerCase()] || shortAddress(p.address);
        const key = p.address.toLowerCase();
        if (!groups[key])
          groups[key] = { title, total: 0, rows: [] as any };
        groups[key].rows.push(p);
        groups[key].total += p.valueUSD || 0;
      }
      return Object.values(groups).sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    }
  }, [data, groupMode, labelFor]);

  // Column widths for: owner/protocol, asset, chain, 7d APR, 30d APR, 30d APY, value, link
  const Cols = () => (
    <colgroup>
      <col style={{ width: "18%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "22%" }} />
      <col style={{ width: "10%" }} />
    </colgroup>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full gap-3">
          <CardTitle>Your Positions</CardTitle>
          <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap">
            <span className="text-xs text-text-muted">Group by</span>
            <Select
              value={groupMode}
              onChange={(e) =>
                setGroupMode(
                  (e.target.value as "protocol" | "wallet") ?? "protocol"
                )
              }
              className="min-w-[140px]"
            >
              <option value="protocol">Protocol</option>
              <option value="wallet">Wallet</option>
            </Select>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-6"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingSkeleton />}
        {isError && (
          <p className="text-sm text-red-400">
            {(error as Error)?.message ?? "Error"}
          </p>
        )}
        {!isLoading && !isError && (!data || data.length === 0) && (
          <EmptyState
            title="No positions found"
            hint="Add an address to start tracking."
          />
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="space-y-5">
            {grouped.map((g, gi) => (
              <div
                key={gi}
                className="rounded-lg border border-white/10 bg-white/5"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm font-semibold capitalize">
                    {g.title}
                  </div>
                  <div className="text-sm text-text-muted">
                    Total:{" "}
                    <span className="font-medium">{formatUSD(g.total)}</span>
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
                            <th className="py-2 px-3">Asset</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2 px-3">Protocol</th>
                            <th className="py-2 px-3">Asset</th>
                          </>
                        )}
                        <th className="py-2 px-3">Chain</th>
                        <th className="py-2 px-3">7d APR</th>
                        <th className="py-2 px-3">30d APR</th>
                        <th className="py-2 px-3">30d APY</th>
                        <th className="py-2 px-3">Value</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((p, i) => (
                        <tr key={i} className="border-t border-white/10">
                          {groupMode === "protocol" ? (
                            <td className="py-2 px-3">{displayOwner(p.address)}</td>
                          ) : (
                            <td className="py-2 px-3 capitalize">{p.protocol}</td>
                          )}
                          <td className="py-2 px-3 truncate">{p.asset}</td>
                          <td className="py-2 px-3 capitalize">{p.chain}</td>
                          <td className="py-2 px-3">
                            {p.apr7d !== undefined ? formatPct(p.apr7d) : "-"}
                          </td>
                          <td className="py-2 px-3">
                            {p.apr30d !== undefined ? formatPct(p.apr30d) : "-"}
                          </td>
                          <td className="py-2 px-3">
                            {p.apy30d !== undefined ? formatPct(p.apy30d) : "-"}
                          </td>
                          <td className="py-2 px-3 tabular-nums">
                            {formatUSD(p.valueUSD)}
                          </td>
                          <td className="py-2 px-3">
                            {p.detailsUrl && (
                              <a
                                href={p.detailsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand hover:underline"
                              >
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="text-right text-sm text-text-muted">
              Grand Total:{" "}
              <span className="font-medium">
                {formatUSD(grouped.reduce((acc, g) => acc + (g.total || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
