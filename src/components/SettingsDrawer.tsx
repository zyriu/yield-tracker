import { useState } from "react";
import { arbitrum, base, berachain, bsc, mainnet, mantle, optimism, sonic } from "viem/chains";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";

export default function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);

  const mainnetRpcUrl = useSessionStore((s) => s.ethereumRpcUrl);
  const setMainnetRPC = useSessionStore((s) => s.setEthereumRPC);
  const [mainnetRpcErr, setMainnetRpcErr] = useState<string | null>(null);

  const optimismRpcUrl = useSessionStore((s) => s.optimismRpcUrl);
  const setOptimismRPC = useSessionStore((s) => s.setOptimismRPC);
  const [optimismRpcErr, setOptimismRpcErr] = useState<string | null>(null);

  const bnbSmartChainRpcUrl = useSessionStore((s) => s.bnbSmartChainRpcUrl);
  const setBnbSmartChainRPC = useSessionStore((s) => s.setBnbSmartChainRPC);
  const [bnbSmartChainRpcErr, setBnbSmartChainRpcErr] = useState<string | null>(null);

  const sonicRpcUrl = useSessionStore((s) => s.sonicRpcUrl);
  const setSonicRPC = useSessionStore((s) => s.setSonicRPC);
  const [sonicRpcErr, setSonicRpcErr] = useState<string | null>(null);

  const hyperevmRpcUrl = useSessionStore((s) => s.hyperevmRpcUrl);
  const setHyperevmRPC = useSessionStore((s) => s.setHyperevmRPC);
  const [hyperevmRpcErr, setHyperevmRpcErr] = useState<string | null>(null);

  const mantleRpcUrl = useSessionStore((s) => s.mantleRpcUrl);
  const setMantleRPC = useSessionStore((s) => s.setMantleRPC);
  const [mantleRpcErr, setMantleRpcErr] = useState<string | null>(null);

  const baseRpcUrl = useSessionStore((s) => s.baseRpcUrl);
  const setBaseRPC = useSessionStore((s) => s.setBaseRPC);
  const [baseRpcErr, setBaseRpcErr] = useState<string | null>(null);

  const arbitrumRpcUrl = useSessionStore((s) => s.arbitrumRpcUrl);
  const setArbitrumRPC = useSessionStore((s) => s.setArbitrumRPC);
  const [arbitrumRpcErr, setArbitrumRpcErr] = useState<string | null>(null);

  const berachainRpcUrl = useSessionStore((s) => s.berachainRpcUrl);
  const setBerachainRPC = useSessionStore((s) => s.setBerachainRPC);
  const [berachainRpcErr, setBerachainRpcErr] = useState<string | null>(null);

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
            <Label htmlFor="eth-rpc">Ethereum RPC URL</Label>
            <Input
              id="eth-rpc"
              placeholder={mainnet.rpcUrls.default.http[0]}
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
            <Label htmlFor="opt-rpc">Optimism RPC URL</Label>
            <Input
              id="opt-rpc"
              placeholder={optimism.rpcUrls.default.http[0]}
              value={optimismRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setOptimismRPC(v);
                setOptimismRpcErr(validateRpc(v));
              }}
            />
            {optimismRpcErr && <p className="mt-1 text-xs text-red-400">{optimismRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="bsc-rpc">BNB Smart Chain RPC URL</Label>
            <Input
              id="bsc-rpc"
              placeholder={bsc.rpcUrls.default.http[0]}
              value={bnbSmartChainRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setBnbSmartChainRPC(v);
                setBnbSmartChainRpcErr(validateRpc(v));
              }}
            />
            {bnbSmartChainRpcErr && <p className="mt-1 text-xs text-red-400">{bnbSmartChainRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="sonic-rpc">Sonic RPC URL</Label>
            <Input
              id="sonic-rpc"
              placeholder={sonic.rpcUrls.default.http[0]}
              value={sonicRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setSonicRPC(v);
                setSonicRpcErr(validateRpc(v));
              }}
            />
            {sonicRpcErr && <p className="mt-1 text-xs text-red-400">{sonicRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="base-rpc">Hyperevm RPC URL</Label>
            <Input
              id="base-rpc"
              placeholder="https://rpc.hyperliquid.xyz/evm"
              value={hyperevmRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setHyperevmRPC(v);
                setHyperevmRpcErr(validateRpc(v));
              }}
            />
            {hyperevmRpcErr && <p className="mt-1 text-xs text-red-400">{hyperevmRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="sonic-rpc">Mantle RPC URL</Label>
            <Input
              id="mantle-rpc"
              placeholder={mantle.rpcUrls.default.http[0]}
              value={mantleRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setMantleRPC(v);
                setMantleRpcErr(validateRpc(v));
              }}
            />
            {mantleRpcErr && <p className="mt-1 text-xs text-red-400">{mantleRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="base-rpc">Base RPC URL</Label>
            <Input
              id="base-rpc"
              placeholder={base.rpcUrls.default.http[0]}
              value={baseRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setBaseRPC(v);
                setBaseRpcErr(validateRpc(v));
              }}
            />
            {baseRpcErr && <p className="mt-1 text-xs text-red-400">{baseRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="arb-rpc">Arbitrum RPC URL</Label>
            <Input
              id="arb-rpc"
              placeholder={arbitrum.rpcUrls.default.http[0]}
              value={arbitrumRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setArbitrumRPC(v);
                setArbitrumRpcErr(validateRpc(v));
              }}
            />
            {arbitrumRpcErr && <p className="mt-1 text-xs text-red-400">{arbitrumRpcErr}</p>}
          </div>
          <div>
            <Label htmlFor="bera-rpc">Berachain RPC URL</Label>
            <Input
              id="bera-rpc"
              placeholder={berachain.rpcUrls.default.http[0]}
              value={berachainRpcUrl}
              onChange={(e) => {
                const v = e.target.value;
                setBerachainRPC(v);
                setBerachainRpcErr(validateRpc(v));
              }}
            />
            {berachainRpcErr && <p className="mt-1 text-xs text-red-400">{berachainRpcErr}</p>}
          </div>

          <p className="mt-1 text-xs text-text-muted">Used for reads—stored locally in your browser.</p>
        </div>
      </div>
    </div>
  );
}
