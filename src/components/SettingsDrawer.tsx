import { useState } from "react";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";

export default function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);

  const mainnetRpcUrl = useSessionStore((s) => s.mainnetRpcUrl);
  const setMainnetRPC = useSessionStore((s) => s.setMainnetRPC);
  const [mainnetRpcErr, setMainnetRpcErr] = useState<string | null>(null);

  const arbitrumRpcUrl = useSessionStore((s) => s.arbitrumRpcUrl);
  const setArbitrumRPC = useSessionStore((s) => s.setArbitrumRPC);
  const [arbitrumRpcErr, setArbitrumRpcErr] = useState<string | null>(null);

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
        <div className="space-y-2">
          <div>
            <Label htmlFor="rpc">Ethereum RPC URL</Label>
            <Input
              id="rpc"
              placeholder="https://eth.llamarpc.com"
              value={mainnetRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setMainnetRPC(v);
                setMainnetRpcErr(validateRpc(v));
              }}
            />
            {mainnetRpcErr && <p className="mt-1 text-xs text-red-400">{mainnetRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="rpc">Arbitrum RPC URL</Label>
            <Input
              id="rpc"
              placeholder="https://arbitrum-one.public.blastapi.io"
              value={arbitrumRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setArbitrumRPC(v);
                setArbitrumRpcErr(validateRpc(v));
              }}
            />
            <p className="mt-1 text-xs text-text-muted">Used for reads—stored locally in your browser.</p>
            {arbitrumRpcErr && <p className="mt-1 text-xs text-red-400">{arbitrumRpcErr}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
