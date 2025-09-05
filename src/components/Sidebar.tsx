import { clsx } from "clsx";
import { useRef, useState } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { shortAddress } from "@/utils/format";

export default function Sidebar() {
  const open = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const addresses = useSessionStore((s) => s.addresses);
  const addAddress = useSessionStore((s) => s.addAddress);
  const removeAddress = useSessionStore((s) => s.removeAddress);
  const setAddressLabel = useSessionStore((s) => s.setAddressLabel);

  const refAddr = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>("");

  const startEdit = (id: string, current?: string) => {
    setEditingId(id);
    setEditingVal(current || "");
  };
  const commitEdit = () => {
    if (!editingId) return;
    setAddressLabel(editingId, editingVal.trim() || undefined);
    setEditingId(null);
    setEditingVal("");
  };

  return (
    <aside
      className={`${
        open ? "w-80" : "w-0"
      } fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-bg-muted`}
    >
      {open && (
        <div className="flex items-center justify-between p-3 text-xs text-text-muted m-3">
          <h2 className="text-lg font-semibold text-white">Tracked Addresses</h2>
          <button onClick={toggleSidebar} aria-label="Close sidebar" className="text-xl">
            &times;
          </button>
        </div>
      )}

      <div className={clsx("px-3 space-y-2", open ? "block" : "hidden")}>
        <Input ref={refAddr} placeholder="0x…" aria-label="Address" />
        <Input ref={refLabel} placeholder="Label (optional)" aria-label="Label" />
        <Button
          onClick={() => {
            const addr = refAddr.current?.value?.trim() || "";
            const label = refLabel.current?.value?.trim() || undefined;
            setErr(null);
            try {
              addAddress(addr, label);
              if (refAddr.current) refAddr.current.value = "";
              if (refLabel.current) refLabel.current.value = "";
            } catch (e: any) {
              setErr(e?.message ?? "Invalid address");
            }
          }}
          className="w-full"
        >
          Add
        </Button>
        {err && <p className="text-xs text-red-400">{err}</p>}
      </div>

      <div className={clsx("px-2 mt-3", open ? "block" : "hidden")}>
        {addresses.length === 0 && (
          <div className="text-xs text-text-muted px-2 py-2">None yet</div>
        )}
        <ul className="space-y-2">
          {addresses.map((a) => {
            const displayTop = a.label ? a.label : shortAddress(a.address);
            const displayBottom = a.label ? shortAddress(a.address) : null;

            const isEditing = editingId === a.id;

            return (
              <li
                key={a.id}
                className="rounded-md px-3 py-2 bg-white/5 border border-white/10"
                title={a.address}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {!isEditing ? (
                      <>
                        <div
                          className="text-sm font-semibold truncate cursor-pointer"
                          onClick={() => startEdit(a.id, a.label)}
                          title={displayTop || undefined}
                        >
                          {displayTop}
                        </div>
                        {displayBottom && (
                          <div className="text-xs text-text-muted font-mono">{displayBottom}</div>
                        )}
                      </>
                    ) : (
                      <Input
                        autoFocus
                        value={editingVal}
                        onChange={(e) => setEditingVal(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditingVal("");
                          }
                        }}
                        placeholder="Label"
                      />
                    )}
                  </div>
                  <Button
                    onClick={() => removeAddress(a.id)}
                    className="bg-red-500/20 border-red-500/40"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
