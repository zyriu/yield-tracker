import { clsx } from "clsx";

type Props = { checked: boolean; onChange: (_: boolean) => void; label?: string };

export const Switch = ({ checked, onChange, label }: Props) => (
  <button
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={clsx(
      "inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1",
      checked ? "bg-brand/30" : "bg-bg-muted"
    )}
  >
    <span className={clsx("h-4 w-4 rounded-full", checked ? "bg-brand" : "bg-white/20", "transition-colors")} />
    <span className="text-xs text-text-muted">{label}</span>
  </button>
);
