import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { pushToast } from "@/components/ui/toast";

const IDS = "ethena-usde,bitcoin,ethereum,solana,spark";

export const getPricesUSD = () => {
  const { data: pricesUSD, isLoading } = useQuery({
    queryKey: ["coingecko-prices"],
    queryFn: async () => {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS}&vs_currencies=usd`;
        const { data } = await axios.get(url, { headers: { accept: "application/json" } });

        // Extract prices, defaulting to 0 for missing values
        return {
          usde: Number(data?.["ethena-usde"]?.usd) || 0,
          btc: Number(data?.bitcoin?.usd) || 0,
          eth: Number(data?.ethereum?.usd) || 0,
          sol: Number(data?.solana?.usd) || 0,
          spark: Number(data?.spark?.usd) || 0,
        };
      } catch (err) {
        // On error, return cached values if available; otherwise fall back to zeros
        pushToast(`error fetching prices: ${err}`);

        return { usde: 0, btc: 0, eth: 0, sol: 0, spark: 0 };
      }
    },
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });

  return { pricesUSD, isLoading };
};
