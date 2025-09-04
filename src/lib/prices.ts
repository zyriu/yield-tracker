let usdeCache: { price: number; at: number } | null = null;
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export async function getUSDePrice(): Promise<number> {
  const now = Date.now();
  if (usdeCache && now - usdeCache.at < TTL_MS) return usdeCache.price;

  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethena-usde&vs_currencies=usd";
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    if (!resp.ok) throw new Error(`CG ${resp.status}`);
    const data = (await resp.json()) as any;
    const price = Number(data?.["ethena-usde"]?.usd);
    if (!isFinite(price) || price <= 0) throw new Error("bad price");
    usdeCache = { price, at: now };
    return price;
  } catch {
    const fallback = 1.0;
    usdeCache = { price: fallback, at: now };
    return fallback;
  }
}
