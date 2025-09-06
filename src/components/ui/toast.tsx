import { useEffect, useState } from "react";

type Toast = { id: number; message: string };
let pushRef: ((_: string) => void) | null = null;

export const pushToast = (message: string) => pushRef?.(message);

export const Toasts = () => {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushRef = (m: string) => setItems((prev) => [...prev, { id: Date.now() + Math.random(), message: m }]);
    return () => {
      pushRef = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="rounded-xl bg-red-950 border border-white/20 p-6 text-sm"
          onAnimationEnd={() => setItems((i) => i.filter((x) => x.id !== t.id))}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};
