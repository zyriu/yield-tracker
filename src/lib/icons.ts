import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const IDS = "arbitrum,ethereum,hyperliquid";

export const getIcons = () => {
  const { data: icons } = useQuery({
    queryKey: ["icons"],
    queryFn: async () => {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${IDS}&per_page=250&page=1`
      );

      return {
        ethereum: data[0]?.image || undefined,
        hyperliquid: data[1]?.image || undefined,
        arbitrum: data[2]?.image || undefined,
      };
    },
    staleTime: Infinity,
  });

  return icons;
};
