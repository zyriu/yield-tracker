import { clsx } from "clsx";
import { SelectHTMLAttributes } from "react";
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
        {...p}
        className={clsx(
            "w-full rounded-xl bg-bg-muted border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60"
        )}
    />
);
