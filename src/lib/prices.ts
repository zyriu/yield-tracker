// Cached price map and timestamp for multi‑asset quotes from CoinGecko. Each entry
// stores the last fetch time and the associated USD prices for USDe, BTC, ETH and SOL.
let multiPriceCache: {
  data: { usde: number; btc: number; eth: number; sol: number };
  at: number;
} | null = null;
const PRICE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export async function getPricesUSD(): Promise<{
  usde: number;
  btc: number;
  eth: number;
  sol: number;
}> {
  const now = Date.now();
  // Return cached prices if still valid
  if (multiPriceCache && now - multiPriceCache.at < PRICE_TTL) {
    return multiPriceCache.data;
  }
  try {
    const ids = "ethena-usde,bitcoin,ethereum,solana";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    if (!resp.ok) throw new Error(`CG ${resp.status}`);
    const json = (await resp.json()) as any;
    // Extract prices, defaulting to 0 for missing values
    const prices = {
      usde: Number(json?.["ethena-usde"]?.usd) || 0,
      btc: Number(json?.bitcoin?.usd) || 0,
      eth: Number(json?.ethereum?.usd) || 0,
      sol: Number(json?.solana?.usd) || 0,
    };
    multiPriceCache = { data: prices, at: now };
    return prices;
  } catch {
    // On error, return cached values if available; otherwise fall back to zeros
    if (multiPriceCache) return multiPriceCache.data;
    return { usde: 0, btc: 0, eth: 0, sol: 0 };
  }
}
