export const shortAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

export const formatUSD = (n: number) =>
    Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

export const formatPct = (n: number) =>
    Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(n);
