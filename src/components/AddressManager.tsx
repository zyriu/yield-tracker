import { useRef, useState } from "react";

import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";

import { useSessionStore } from "@/store/useSessionStore";
import { shortAddress } from "@/utils/format";

export default function AddressManager() {
  const [error, setError] = useState<string | null>(null);
  const addAddress = useSessionStore(s => s.addAddress);
  const removeAddress = useSessionStore(s => s.removeAddress);
  const addresses = useSessionStore(s => s.addresses);

  const refAddr = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracked Addresses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input ref={refAddr} placeholder="0x…" aria-label="Address" />
          <Input ref={refLabel} placeholder="Label (optional)" aria-label="Label" />
          <Button
            onClick={() => {
              const value = refAddr.current?.value?.trim() || "";
              const label = refLabel.current?.value?.trim() || undefined;
              setError(null);
              try {
                addAddress(value, label);
                if (refAddr.current) refAddr.current.value = "";
                if (refLabel.current) refLabel.current.value = "";
              } catch (e: any) {
                setError(e.message ?? "Invalid address");
              }
            }}
          >
            Add
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <ul className="mt-3 space-y-2">
          {addresses.map(a => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-mono">{shortAddress(a.address)}</span>
                {a.label ? <span className="ml-2 text-text-muted">({a.label})</span> : null}
              </div>
              <Button onClick={() => removeAddress(a.id)} className="bg-red-500/20 border-red-500/40">
                Remove
              </Button>
            </li>
          ))}
          {addresses.length === 0 && <p className="text-sm text-text-muted">No addresses yet.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
