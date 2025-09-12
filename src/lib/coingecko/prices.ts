import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { pushToast } from "@/components/ui/toast";

const IDS = "ethena-usde,ethena-staked-usde,bitcoin,ethereum,solana,spark,pendle";

export type Prices = {
  btc: number;
  eth: number;
  pendle: number;
  sol: number;
  spk: number;
  susde: number;
  usde: number;
};

export const getPricesUSD = () => {
  const { data: pricesUSD, isLoading } = useQuery({
    queryKey: ["coingecko", "prices"],
    queryFn: async () => {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS}&vs_currencies=usd`;
        const { data } = await axios.get(url, { headers: { accept: "application/json" } });

        return {
          btc: Number(data?.bitcoin?.usd) || 0,
          eth: Number(data?.ethereum?.usd) || 0,
          pendle: Number(data?.pendle?.usd) || 0,
          sol: Number(data?.solana?.usd) || 0,
          spk: Number(data?.spark?.usd) || 0,
          susde: Number(data?.["ethena-staked-usde"]?.usd) || 0,
          usde: Number(data?.["ethena-usde"]?.usd) || 0,
        } as Prices;
      } catch (err) {
        pushToast(`error fetching prices: ${err}`);

        return { btc: 0, eth: 0, pendle: 0, sol: 0, spk: 0, susde: 0, usde: 0 } as Prices;
      }
    },
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 55 * 5,
  });

  return { pricesUSD, isLoading };
};
