import { clsx } from "clsx";
import { PropsWithChildren } from "react";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("rounded-lg border border-white/10 bg-white/5", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("px-4 py-3 border-b border-white/10", className)}>{children}</div>;
}

export function CardTitle({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <h3 className={clsx("text-base font-semibold whitespace-nowrap", className)}>{children}</h3>
  );
}

export function CardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("p-4", className)}>{children}</div>;
}
