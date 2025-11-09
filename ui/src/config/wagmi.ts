import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

// Define local hardhat network
const hardhatNetwork = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: 'Encrypted Bet',
  projectId: '88306a972a77389d91871e08d26516af', // Get from https://cloud.walletconnect.com
  chains: [hardhatNetwork, sepolia],
  ssr: false,
});


