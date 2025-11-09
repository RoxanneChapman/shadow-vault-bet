// Contract addresses - Update after deployment
// For local hardhat network (chainId: 31337)
export const CONTRACT_ADDRESS_LOCAL = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Update after deployment

// For Sepolia testnet (chainId: 11155111)
export const CONTRACT_ADDRESS_SEPOLIA = '0xD503e539e1250e13006446dAbBFe461998FB285f'; // Update after deployment

// Get contract address based on chain ID
export function getContractAddress(chainId: number): `0x${string}` {
  if (chainId === 31337 || chainId === 1337) {
    return CONTRACT_ADDRESS_LOCAL as `0x${string}`;
  } else if (chainId === 11155111) {
    return CONTRACT_ADDRESS_SEPOLIA as `0x${string}`;
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

// Contract ABI - Generated from contract compilation
export const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
      { indexed: true, internalType: "address", name: "participant", type: "address" }
    ],
    name: "BetPlaced",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      { indexed: false, internalType: "uint256", name: "endTime", type: "uint256" }
    ],
    name: "RoundCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
      { indexed: false, internalType: "bool", name: "winner", type: "bool" },
      { indexed: false, internalType: "uint256", name: "yesAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "noAmount", type: "uint256" }
    ],
    name: "RoundResolved",
    type: "event"
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "endTime", type: "uint256" }
    ],
    name: "createRound",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "getNoAmount",
    outputs: [{ internalType: "euint32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "getRoundInfo",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "bool", name: "resolved", type: "bool" },
      { internalType: "uint256", name: "participantCount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "getTotalAmount",
    outputs: [{ internalType: "euint32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "getYesAmount",
    outputs: [{ internalType: "euint32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "roundId", type: "uint256" },
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "hasParticipated",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "roundId", type: "uint256" },
      { internalType: "externalEbool", name: "choice", type: "bytes32" },
      { internalType: "externalEuint32", name: "encryptedAmount", type: "bytes32" },
      { internalType: "bytes", name: "inputProof", type: "bytes" }
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "protocolId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "roundId", type: "uint256" },
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "authorizeParticipant",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "makeAmountsPublic",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "roundId", type: "uint256" },
      { internalType: "uint256", name: "rewardAmount", type: "uint256" },
      { internalType: "uint256", name: "userBetAmountInUnits", type: "uint256" },
      { internalType: "bool", name: "userChoice", type: "bool" },
      { internalType: "bool", name: "winningSide", type: "bool" },
      { internalType: "uint256", name: "winningSideTotalInUnits", type: "uint256" }
    ],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "getRoundTotalPool",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "roundId", type: "uint256" },
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "getUserBet",
    outputs: [
      { internalType: "uint256", name: "ethAmount", type: "uint256" },
      { internalType: "bool", name: "hasClaimed", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "resolveRound",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "roundCounter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "rounds",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "bool", name: "resolved", type: "bool" },
      { internalType: "euint32", name: "totalAmount", type: "bytes32" },
      { internalType: "euint32", name: "yesAmount", type: "bytes32" },
      { internalType: "euint32", name: "noAmount", type: "bytes32" },
      { internalType: "uint256", name: "participantCount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;


