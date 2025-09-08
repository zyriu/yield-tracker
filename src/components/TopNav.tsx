import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "./ui/button";

import { arbitrumClient, mainnetClient } from "@/lib/viem";
import { useUIStore } from "@/store/useUIStore";

export default function TopNav() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openSettings = useUIStore((s) => s.openSettings);
  const location = useLocation();

  // Block numbers for Ethereum, Arbitrum and Hyperliquid
  const { data: ethBlock } = useQuery({
    queryKey: ["blockNumber", "ethereum"],
    queryFn: async () => {
      const num = await mainnetClient.getBlockNumber();
      return typeof num === "bigint" ? Number(num) : Number(num ?? 0);
    },
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const { data: arbBlock } = useQuery({
    queryKey: ["blockNumber", "arbitrum"],
    queryFn: async () => {
      const num = await arbitrumClient.getBlockNumber();
      return typeof num === "bigint" ? Number(num) : Number(num ?? 0);
    },
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg">
      <div className="grid grid-cols-3 items-center h-16 w-full">
        <div className="flex justify-start items-center pl-2">
          <Button onClick={toggleSidebar} aria-label="Toggle sidebar" className="p-2">
            ☰
          </Button>
        </div>
        <div className="flex justify-center items-center">
          <nav className="flex gap-4">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-md transition-colors ${
                location.pathname === "/" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/yield" 
              className={`px-4 py-2 rounded-md transition-colors ${
                location.pathname === "/yield" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              Yield
            </Link>
          </nav>
        </div>
        <div className="flex justify-end items-center pr-2 gap-4">
          <div className="flex gap-3 text-xs text-text-muted">
            <span>ETH: {ethBlock !== undefined && ethBlock > 0 ? ethBlock : "-"}</span>
            <span>ARB: {arbBlock !== undefined && arbBlock > 0 ? arbBlock : "-"}</span>
          </div>
          <Button onClick={openSettings} aria-label="Open settings" className="p-2">
            <Settings className="h-4 w-4" />
            <span className="ml-2">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
