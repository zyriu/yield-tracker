import type { FetchPositions } from "./types";

const BLOCKS_7D = 50_400n;
const BLOCKS_30D = 216_000n;

async function getSpkPriceUSD(): Promise<number | undefined> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=spark&vs_currencies=usd", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as any;
    const price = json?.spark?.usd;
    return typeof price === "number" ? price : undefined;
  } catch {
    return undefined;
  }
}

export const fetchSparkPositions: FetchPositions = async ({ address }) => {
  return [];
  /*
  const out: Position[] = [];
  try {
    const user = address as `0x${string}`;

    // Fetch current staked balance, earned rewards, token decimals/symbols
    const results = await multicall([
      {
        address: SPK_FARM,
        abi: STAKING_REWARDS_ABI,
        functionName: "balanceOf",
        args: [user],
      },
      {
        address: SPK_FARM,
        abi: STAKING_REWARDS_ABI,
        functionName: "earned",
        args: [user],
      },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "decimals" },
      { address: USDS_TOKEN, abi: ERC20_ABI, functionName: "symbol" },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "decimals" },
      { address: SPK_TOKEN, abi: ERC20_ABI, functionName: "symbol" },
    ]);

    const rawDeposit = results[0] as bigint | null;
    const rawEarned = results[1] as bigint | null;
    const usdsDecimals = results[2] as number | null;
    const usdsSymbol = results[3] as string | null;
    const spkDecimals = results[4] as number | null;
    const spkSymbol = results[5] as string | null;

    // If the user has no staked USDS, return early
    if (!rawDeposit || rawDeposit === 0n) return out;

    // Convert staked USDS to a human‑readable amount; treat 1 USDS = 1 USD
    const depositAmount = Number(formatUnits(rawDeposit, usdsDecimals ?? 18));
    const valueUSD = depositAmount;

    // Format claimable SPK rewards, if any
    let claimable: string | undefined;
    const currentEarnedFloat =
      rawEarned && rawEarned > 0n ? Number(formatUnits(rawEarned, spkDecimals ?? 18)) : 0;
    if (currentEarnedFloat > 0) {
      const symbol = spkSymbol || "SPK";
      claimable = `${currentEarnedFloat.toFixed(6)} ${symbol}`;
    }

    // Initialise yield metrics
    let apr7d: number | undefined;
    let apy: number | undefined;

    try {
      // Get SPK price; bail out if missing
      const spkPrice = await getSpkPriceUSD();
      if (spkPrice !== undefined && spkPrice > 0) {
        // Current block number
        const latest = await publicClient.getBlockNumber();

        // Calculate block numbers 7 and 30 days ago
        const past7 = latest > BLOCKS_7D ? latest - BLOCKS_7D : 0n;
        const past30 = latest > BLOCKS_30D ? latest - BLOCKS_30D : 0n;

        // Read past balances and rewards at those block numbers
        const pastDeposit7Raw = (await publicClient.readContract({
          address: SPK_FARM,
          abi: STAKING_REWARDS_ABI,
          functionName: "balanceOf",
          args: [user],
          blockNumber: past7,
        })) as bigint;
        const pastRewards7Raw = (await publicClient.readContract({
          address: SPK_FARM,
          abi: STAKING_REWARDS_ABI,
          functionName: "earned",
          args: [user],
          blockNumber: past7,
        })) as bigint;

        const pastDeposit30Raw = (await publicClient.readContract({
          address: SPK_FARM,
          abi: STAKING_REWARDS_ABI,
          functionName: "balanceOf",
          args: [user],
          blockNumber: past30,
        })) as bigint;
        const pastRewards30Raw = (await publicClient.readContract({
          address: SPK_FARM,
          abi: STAKING_REWARDS_ABI,
          functionName: "earned",
          args: [user],
          blockNumber: past30,
        })) as bigint;

        // Convert past deposits to floats (USDS is stable)
        const depositPast7 = Number(formatUnits(pastDeposit7Raw, usdsDecimals ?? 18));
        const depositPast30 = Number(formatUnits(pastDeposit30Raw, usdsDecimals ?? 18));

        // Compute 7‑day reward delta and APR
        if (depositPast7 > 0) {
          const rewardDelta7Raw = rawEarned && pastRewards7Raw ? rawEarned - pastRewards7Raw : 0n;
          const rewardDelta7Float = Number(formatUnits(rewardDelta7Raw, spkDecimals ?? 18));
          const rewardValue7USD = rewardDelta7Float * spkPrice;
          const r7 = rewardValue7USD / depositPast7;
          apr7d = r7 * (365 / 7);

          // Also compute APY using 7‑day if 30‑day unavailable (fallback)
          apy = Math.pow(1 + r7, 365 / 7) - 1;
        }

        // Compute 30‑day reward delta for APY if data is available
        if (depositPast30 > 0) {
          const rewardDelta30Raw =
            rawEarned && pastRewards30Raw ? rawEarned - pastRewards30Raw : 0n;
          const rewardDelta30Float = Number(formatUnits(rewardDelta30Raw, spkDecimals ?? 18));
          const rewardValue30USD = rewardDelta30Float * spkPrice;
          const r30 = rewardValue30USD / depositPast30;
          apy = Math.pow(1 + r30, 365 / 30) - 1;
        }
      }
    } catch {
      // Leave APR/APY undefined if RPC lacks archival data or price fetch fails
    }

    out.push({
      protocol: "spark",
      chain: "ethereum",
      address,
      asset: usdsSymbol || "USDS",
      valueUSD,
      claimableRewards: claimable,
      apr7d,
      apy,
      detailsUrl: "https://app.spark.fi/farms",
    });
  } catch {
    // Swallow errors and return empty list if any call fails
  }
  return out;
*/
};
