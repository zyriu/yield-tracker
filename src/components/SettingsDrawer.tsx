import { useState } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";


export default function SettingsDrawer() {
  const open = useUIStore(s => s.settingsOpen);
  const close = useUIStore(s => s.closeSettings);

  const rpcUrl = useSessionStore(s => s.rpcUrl);
  const setRPC = useSessionStore(s => s.setRPC);
  const wc = useSessionStore(s => s.wcProjectId);
  const setWC = useSessionStore(s => s.setWC);
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
      <div className="w-full" onClick={close} />
      <div className="ml-auto h-full w-[420px] bg-bg border-l border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-3">Settings</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rpc">Ethereum RPC URL</Label>
            <Input
              id="rpc"
              placeholder="https://mainnet.infura.io/v3/…"
              value={rpcUrl}
              onChange={e => {
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
              onChange={e => setWC(e.target.value || undefined)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={close}>Close</Button>
        </div>
      </div>
    </div>
  );
}
