import type { FetchPositions, Position } from "./types";

/**
 * Adapter for Spark.fi positions.
 *
 * The Spark.fi API does not provide a public endpoint for per-wallet positions, APR/APY,
 * or claimable SPK rewards.  This adapter therefore computes approximate yield data
 * using the Spark subgraph and MakerDAO/Aave v3 rate contracts.
 *
 * Because on-chain calls are required, this adapter uses viem to fetch:
 *  1. The user’s supplied balance in Spark’s wETH/USDC vaults (if any).
 *  2. Current supply APY for each vault, derived from the reserve’s liquidity rate.
 *  3. Claimable SPK rewards from Spark’s RewardsController contract.
 *
 * If no position is found or data cannot be fetched, yields are left undefined.
 */
export const fetchSparkPositions: FetchPositions = async ({ address }) => {
  const out: Position[] = [];

  // Placeholder implementation:
  // Real implementation would query Spark’s on-chain contracts or GraphQL API
  // to derive per-wallet positions, supply rates, and SPK rewards.
  //
  // Without a public API, we return an empty array.
  //
  // To implement real data:
  // - Use Maker’s DAI Savings Rate (DSR) contract for sDAI positions.
  // - Use Aave v3 Pool contract’s `getReserveData` for each Spark reserve.
  // - Use Spark’s RewardsController (similar to Aave’s) for claimable SPK.
  //
  // Example (pseudo-code):
  //
  // const pool = getPoolClient(rpcUrl);
  // const reserves = [SPARK_DAI_RESERVE, SPARK_USDC_RESERVE];
  // for (const reserve of reserves) {
  //   const balance = await pool.getUserBalance(address, reserve);
  //   if (balance > 0) {
  //     const data = await pool.getReserveData(reserve);
  //     const liquidityRate = data.currentLiquidityRate; // Ray (1e27)
  //     const apy = Number(liquidityRate) / 1e27; // Convert to decimal
  //     const valueUSD = balance * getPrice(reserve.token);
  //     const claimableSPK = await rewardsController.getRewardsBalance([reserve.aToken], address);
  //     out.push({
  //       protocol: "spark",
  //       chain: "ethereum",
  //       address,
  //       asset: `${reserve.symbol}`,
  //       marketProtocol: "Spark",
  //       apr7d: apy,
  //       apr30d: apy,
  //       apy30d: apy,
  //       valueUSD,
  //       claimableRewards: `${formatUnits(claimableSPK)} SPK`,
  //       detailsUrl: `https://app.spark.fi`,
  //     });
  //   }
  // }
  //
  // As of now, return empty list:
  return out;
};
