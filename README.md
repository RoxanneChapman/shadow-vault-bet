# Encrypted Bet 🔐

Anonymous YES/NO betting platform with Fully Homomorphic Encryption (FHE). This platform enables users to create betting rounds and place bets with encrypted amounts and choices, ensuring complete privacy until the round resolution.

## 📖 Table of Contents

- [Demo Video](#-demo-video)
- [Features](#-features)
- [Contract Addresses](#-contract-addresses)
- [Online Testing](#-online-testing)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Usage](#usage)
- [Contract Details](#-contract-details)
- [Encryption & Decryption Logic](#-encryption--decryption-logic)
- [Frontend Features](#frontend-features)
- [Testing](#testing)
- [Deployment](#-deployment)
- [Technical Stack](#-technical-stack)
- [Security Considerations](#-security-considerations)

## 📺 Demo Video

Watch the project demonstration:
- **Video File**: [encrypted-bet.mp4](./encrypted-bet.mp4)
- **Online Demo**: [Vercel Live Demo](https://encrypted-bet.vercel.app) *(Add your Vercel deployment URL here)*

## 🚀 Features

- **Encrypted Betting**: All bet amounts and choices are encrypted using FHE (Fully Homomorphic Encryption)
- **Anonymous Participation**: Users' betting choices remain hidden until resolution
- **Automatic Payouts**: Winners can claim their share of the pool after round resolution
- **Transparent Resolution**: After round end, all bets are decrypted and visible to all participants
- **Round Management**: Create rounds with custom names and end times
- **Real-time Updates**: View active betting rounds with live participant counts

## Project Structure

```
encrypted-bet/
├── contracts/          # Solidity smart contracts
│   └── EncryptedBet.sol # Main betting contract
├── test/               # Contract tests
│   ├── EncryptedBet.ts
│   └── EncryptedBetSepolia.ts
├── tasks/              # Hardhat tasks for interaction
│   └── EncryptedBet.ts
├── deploy/             # Deployment scripts
│   └── deploy.ts
└── ui/                 # Frontend React application
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── config/
    │   ├── hooks/
    │   └── lib/
    └── public/
```

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- Hardhat node or access to Sepolia testnet

## Installation

### Contract Project (Root)

```bash
cd encrypted-bet
npm install
```

### Frontend Project

```bash
cd ui
npm install
```

## Development

### 1. Run Tests (Local Mock Mode - Recommended)

**Important**: When running tests with the `hardhat` network (default), the FHEVM Hardhat plugin automatically uses **mock mode**. This means:
- ✅ No connection to `relayer.testnet.zama.cloud` is needed
- ✅ Tests run completely locally
- ✅ Fast execution without external dependencies

```bash
# Run tests with local mock mode (default)
npx hardhat test

# This automatically uses mock mode - no relayer connection required
```

### 2. Start Local Hardhat Node (for deployment)

If you want to deploy contracts to a local node:

```bash
# Start a local FHEVM-ready Hardhat node
npx hardhat node
```

### 3. Deploy Contracts

In a new terminal:

```bash
# Deploy to local node (uses mock mode automatically)
npx hardhat deploy --network localhost
```

### 4. Run Sepolia Tests (requires relayer)

Only use this if you need to test on Sepolia testnet with real relayer:

```bash
# Sepolia tests (requires deployed contracts and relayer connection)
npx hardhat test --network sepolia
```

### 4. Start Frontend

```bash
cd ui
npm run dev
```

## Usage

### Creating a Betting Round

```bash
npx hardhat --network localhost task:bet:create \
  --name "Will Bitcoin hit $100k?" \
  --end-time 1734567890 \
  --amount 100 \
  --choice yes
```

### Placing a Bet

```bash
npx hardhat --network localhost task:bet:place \
  --round-id 0 \
  --amount 50 \
  --choice no \
  --value 0.1
```

### Viewing Round Information

```bash
npx hardhat --network localhost task:bet:info --round-id 0
```

### Listing All Rounds

```bash
npx hardhat --network localhost task:bet:list
```

## 📋 Contract Details

### EncryptedBet Contract

The main contract ([`contracts/EncryptedBet.sol`](./contracts/EncryptedBet.sol)) handles encrypted betting using Zama's FHE (Fully Homomorphic Encryption) technology.

**Key Contract File**: [`contracts/EncryptedBet.sol`](./contracts/EncryptedBet.sol)

#### Contract Overview

- **Round Creation**: Creators can set name, end time, and initialize encrypted storage
- **Bet Placement**: Users place bets with encrypted amounts and choices (YES/NO)
- **Round Resolution**: After end time, rounds can be resolved and amounts decrypted
- **Reward Claiming**: Winners can claim their proportional share of the pool
- **Encrypted Storage**: All amounts and choices stored as encrypted FHE types (`euint32`, `ebool`)

### 🔐 Encryption & Decryption Logic

#### Data Encryption (Frontend → Contract)

When a user places a bet, the frontend encrypts the data using Zama FHEVM SDK:

**1. Encryption Process** (`ui/src/hooks/useEncryptedBet.ts`):
```typescript
// Create encrypted input
const input = instance.createEncryptedInput(contractAddress, userAddress);
input.add32(betAmount);        // Encrypt amount as euint32
input.addBool(choice);         // Encrypt choice as ebool (YES=true, NO=false)
const encrypted = await input.encrypt();

// Submit to contract
await contract.placeBet(
  roundId,
  encrypted.handles[1],        // ebool handle (choice)
  encrypted.handles[0],        // euint32 handle (amount)
  encrypted.inputProof         // Proof for validation
);
```

**2. Contract-side Processing** (`contracts/EncryptedBet.sol`):
```solidity
// Convert external encrypted inputs to internal FHE types
euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
ebool betChoice = FHE.fromExternal(choice, inputProof);

// Homomorphic operations on encrypted data
round.totalAmount = FHE.add(round.totalAmount, amount);

// Conditional addition based on encrypted choice
euint32 yesAmountIncrement = FHE.select(betChoice, amount, FHE.asEuint32(0));
euint32 noAmountIncrement = FHE.select(betChoice, FHE.asEuint32(0), amount);

round.yesAmount = FHE.add(round.yesAmount, yesAmountIncrement);
round.noAmount = FHE.add(round.noAmount, noAmountIncrement);
```

#### Data Decryption (Contract → Frontend)

After a round is resolved, encrypted amounts become publicly decryptable:

**1. Resolution** (`contracts/EncryptedBet.sol`):
```solidity
function resolveRound(uint256 roundId) external {
    // Make all encrypted amounts publicly decryptable
    FHE.makePubliclyDecryptable(round.totalAmount);
    FHE.makePubliclyDecryptable(round.yesAmount);
    FHE.makePubliclyDecryptable(round.noAmount);
}
```

**2. Decryption Process** (`ui/src/hooks/useEncryptedBet.ts`):
```typescript
// Generate keypair for decryption
const keypair = instance.generateKeypair();

// Create EIP-712 signature for decryption request
const eip712 = instance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  startTimeStamp,
  durationDays
);

const signature = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message
);

// Request decryption from Zama Relayer
const result = await instance.userDecrypt(
  [{ handle: encryptedHandle, contractAddress }],
  keypair.privateKey,
  keypair.publicKey,
  signature.replace('0x', ''),
  [contractAddress],
  userAddress,
  startTimeStamp,
  durationDays
);

// Extract decrypted value
const decryptedValue = result[encryptedHandle];
```

### 🔑 Key Functions

#### Round Management
- `createRound(string name, uint256 endTime)`: Create a new betting round with encrypted storage initialized to zero
- `getRoundInfo(uint256 roundId)`: Get public round information (name, creator, end time, participant count)

#### Betting
- `placeBet(uint256 roundId, externalEbool choice, externalEuint32 encryptedAmount, bytes inputProof)`: Place a bet with encrypted amount and choice
- `hasParticipated(uint256 roundId, address participant)`: Check if an address has participated in a round

#### Round Resolution
- `resolveRound(uint256 roundId)`: Resolve a round and make encrypted amounts publicly decryptable
- `makeAmountsPublic(uint256 roundId)`: Alternative function to make amounts publicly decryptable (must be called after resolution)

#### Rewards
- `claimReward(uint256 roundId, uint256 rewardAmount, ...)`: Claim reward for winning bets
- `getUserBet(uint256 roundId, address participant)`: Get user's bet information
- `getRoundTotalPool(uint256 roundId)`: Get total ETH pool for a round

#### Encrypted Data Queries
- `getTotalAmount(uint256 roundId)`: Get encrypted total amount (returns `euint32` handle)
- `getYesAmount(uint256 roundId)`: Get encrypted YES side amount (returns `euint32` handle)
- `getNoAmount(uint256 roundId)`: Get encrypted NO side amount (returns `euint32` handle)

### 🎯 Homomorphic Operations

The contract performs homomorphic operations on encrypted data:

1. **Encrypted Addition**: `FHE.add(euint32 a, euint32 b)` - Add two encrypted numbers
2. **Encrypted Selection**: `FHE.select(ebool condition, euint32 trueValue, euint32 falseValue)` - Conditional selection on encrypted data
3. **External Input Conversion**: `FHE.fromExternal(externalEuint32, bytes proof)` - Convert external encrypted input to internal FHE type
4. **Public Decryption**: `FHE.makePubliclyDecryptable(euint32)` - Make encrypted value publicly decryptable

### 📊 Data Flow

1. **Bet Placement**:
   - User inputs bet amount (ETH) and choice (YES/NO)
   - Frontend encrypts amount and choice using FHEVM SDK
   - Encrypted data + proof sent to contract via `placeBet()`
   - Contract validates proof and performs homomorphic addition

2. **Round Resolution**:
   - After end time, anyone can call `resolveRound()`
   - Contract makes all encrypted amounts publicly decryptable
   - Winners determined by comparing decrypted YES/NO amounts

3. **Reward Claiming**:
   - Frontend decrypts amounts to calculate user's reward
   - User calls `claimReward()` with calculated reward amount
   - Contract verifies calculation and transfers ETH to winner

## Frontend Features

- Wallet connection via RainbowKit
- Round creation interface
- Betting round lobby
- Place bet interface
- Round details view
- Timer countdown for active rounds

## 📍 Contract Addresses

### Deployed Contracts

**Local Hardhat Network (Chain ID: 31337)**
- **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **RPC URL**: `http://127.0.0.1:8545`
- **Network**: Local development network

**Sepolia Testnet (Chain ID: 11155111)**
- **Contract Address**: `0xD503e539e1250e13006446dAbBFe461998FB285f`
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY`
- **Etherscan**: [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xD503e539e1250e13006446dAbBFe461998FB285f)
- **Network**: Sepolia Test Network

### Frontend Configuration

Contract addresses are configured in `ui/src/config/contracts.ts`. The frontend automatically selects the correct contract address based on the connected network's chain ID.

```typescript
// Local network (Chain ID: 31337)
export const CONTRACT_ADDRESS_LOCAL = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Sepolia testnet (Chain ID: 11155111)
export const CONTRACT_ADDRESS_SEPOLIA = '0xD503e539e1250e13006446dAbBFe461998FB285f';
```

## 🌐 Online Testing

### Vercel Deployment

**Live Demo**: [https://encrypted-bet.vercel.app](https://encrypted-bet.vercel.app)

*(Note: Replace with your actual Vercel deployment URL)*

The frontend is deployed on Vercel and connected to Sepolia testnet. Make sure you:
1. Have MetaMask or another Web3 wallet installed
2. Connect to Sepolia testnet
3. Have Sepolia test ETH for gas fees (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### Network Configuration

Default networks:
- **Local Hardhat**: Chain ID 31337, RPC http://127.0.0.1:8545
- **Sepolia Testnet**: Chain ID 11155111, RPC https://sepolia.infura.io/v3/YOUR_KEY

## Testing

### Local Mock Mode Tests (Recommended)

**These tests use mock mode automatically - no relayer connection needed:**

```bash
# Run all local tests (uses mock mode)
npx hardhat test

# Run specific test files
npx hardhat test test/EncryptedBet.ts
```

The tests automatically check if they're running in mock mode using `fhevm.isMock`. If not in mock mode (e.g., Sepolia), the tests will be skipped.

### Sepolia Network Tests

**Warning**: These tests require:
- Deployed contracts on Sepolia
- Connection to `relayer.testnet.zama.cloud`
- Valid testnet credentials

```bash
npx hardhat test test/EncryptedBetSepolia.ts --network sepolia
```

**Note**: For local development, always use the default `hardhat` network which automatically uses mock mode without requiring relayer connection.

## 🚀 Deployment

### Local Network

```bash
# Start local Hardhat node (Terminal 1)
npx hardhat node

# Deploy to local network (Terminal 2)
npx hardhat deploy --network localhost
```

**Deployed Contract**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Sepolia Testnet

**Prerequisites:**
1. Get Sepolia test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Set up environment variables (do not commit to repository):

```bash
# Set environment variables (PowerShell)
$env:PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
$env:INFURA_API_KEY="YOUR_INFURA_API_KEY"

# Deploy
npx hardhat deploy --network sepolia
```

**Deployed Contract**: `0xD503e539e1250e13006446dAbBFe461998FB285f`  
**Transaction Hash**: `0x743be93960684303041d1eb6ff433711dfc7407a00c45ba696eb012c10edd5b2`  
**Etherscan**: [View Deployment](https://sepolia.etherscan.io/tx/0x743be93960684303041d1eb6ff433711dfc7407a00c45ba696eb012c10edd5b2)

### Frontend Deployment (Vercel)

**Deploy to Vercel:**

1. **Connect Repository**:
   - Push code to GitHub
   - Connect repository to Vercel
   - Set root directory to `ui/`

2. **Build Configuration**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables** (if needed):
   - `VITE_CHAIN_ID=11155111` (for Sepolia)
   - Other environment variables as required

4. **Deploy**:
   - Vercel will automatically deploy on push to main branch
   - Or manually deploy via Vercel dashboard

**Live Demo**: [https://encrypted-bet.vercel.app](https://encrypted-bet.vercel.app)  
*(Note: Update with your actual Vercel deployment URL)*

## 📚 Technical Stack

### Smart Contracts
- **Solidity**: ^0.8.24
- **FHE Library**: @fhevm/solidity
- **FHE Configuration**: SepoliaConfig (for Sepolia testnet)

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Web3**: Wagmi + Ethers.js v6
- **FHE SDK**: @zama-fhe/relayer-sdk
- **UI Components**: shadcn/ui + Tailwind CSS
- **Wallet**: RainbowKit (MetaMask support)

### Development
- **Blockchain Framework**: Hardhat
- **Testing**: Mocha + Chai
- **Type Generation**: TypeChain

## 🔒 Security Considerations

1. **Encryption**: All bet amounts and choices are encrypted using FHE before submission
2. **Privacy**: User choices remain hidden until round resolution
3. **Validation**: All encrypted inputs are validated with cryptographic proofs
4. **Reward Calculation**: Rewards are calculated off-chain but verified on-chain
5. **Access Control**: Only round creators can resolve rounds, only participants can claim rewards

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- [Zama](https://www.zama.ai/) for FHE technology and FHEVM
- [Hardhat](https://hardhat.org/) for development framework
- [Wagmi](https://wagmi.sh/) for React Hooks for Ethereum


