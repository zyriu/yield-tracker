import { useState } from "react";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";

export default function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);

  const rpcUrl = useSessionStore((s) => s.rpcUrl);
  const setRPC = useSessionStore((s) => s.setRPC);
  const wc = useSessionStore((s) => s.wcProjectId);
  const setWC = useSessionStore((s) => s.setWC);
  const [rpcErr, setRpcErr] = useState<string | null>(null);

  const validateRpc = (v: string) => {
    if (!v) return null;
    try {
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol)) return "RPC must be http(s) URL";
      return null;
    } catch {
      return "Invalid RPC URL";
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="ml-auto h-full w-80 bg-bg border-l border-white/10 p-4">
        <div className="flex items-center justify-between p-3 text-xs text-text-muted mb-3">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={close} aria-label="Close sidebar" className="text-2xl">
            &times;
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <Label htmlFor="rpc">Ethereum RPC URL</Label>
            <Input
              id="rpc"
              placeholder="https://mainnet.infura.io/v3/…"
              value={rpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setRPC(v);
                setRpcErr(validateRpc(v));
              }}
            />
            <p className="mt-1 text-xs text-text-muted">
              Used for reads—stored locally in your browser.
            </p>
            {rpcErr && <p className="mt-1 text-xs text-red-400">{rpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="wc">WalletConnect Project ID (optional)</Label>
            <Input
              id="wc"
              placeholder="xxxx…"
              value={wc || ""}
              onChange={(e) => setWC(e.target.value || undefined)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
