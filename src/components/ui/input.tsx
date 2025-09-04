import { clsx } from "clsx";
import { forwardRef, InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input
            ref={ref}
            className={clsx(
                "w-full rounded-xl bg-bg-muted border border-white/10 px-3 py-2 text-sm text-white",
                "placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/60",
                className
            )}
            {...props}
        />
    )
);
Input.displayName = "Input";
