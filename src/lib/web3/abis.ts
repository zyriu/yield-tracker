export const abis = {
  erc20: [
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
    {
      type: "function",
      name: "decimals",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint8" }],
    },
    {
      type: "function",
      name: "symbol",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string" }],
    },
  ],
  ethereum: {
    ethena: {
      staking: [
        {
          type: "function",
          name: "balanceOf",
          stateMutability: "view",
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
        {
          type: "function",
          name: "convertToAssets",
          stateMutability: "view",
          inputs: [{ name: "shares", type: "uint256" }],
          outputs: [{ type: "uint256" }],
        },
        {
          type: "function",
          name: "decimals",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "uint8" }],
        },
      ],
    },
    spark: {
      rewards: [
        {
          type: "function",
          name: "balanceOf",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
        {
          type: "function",
          name: "earned",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
        {
          type: "event",
          name: "Staked",
          inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "Withdrawn",
          inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "RewardPaid",
          inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "reward", type: "uint256", indexed: false },
          ],
          anonymous: false,
        },
      ],
    },
  },
};
