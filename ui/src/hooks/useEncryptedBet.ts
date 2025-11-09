import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { useEthersSigner } from "./useEthersSigner";
import { useZamaInstance } from "./useZamaInstance";
import { Contract } from "ethers";
import { getContractAddress, CONTRACT_ABI } from "@/config/contracts";
import { useChainId } from "wagmi";

export function useEncryptedBet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const signerPromise = useEthersSigner({ chainId });
  const { instance } = useZamaInstance();
  const client = usePublicClient();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const contractAddress = getContractAddress(chainId);

  const createRound = async (name: string, endTime: number) => {
    if (!signerPromise || !contractAddress) {
      throw new Error("Missing required dependencies");
    }

    try {
      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      console.log('Calling createRound with:', {
        name,
        endTime,
      });

      const tx = await contract.createRound(name, endTime);
      
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      return receipt;
    } catch (error: any) {
      console.error('createRound error:', error);
      
      // Try to extract more error information
      if (error.reason) {
        throw new Error(error.reason);
      } else if (error.data) {
        throw new Error(`Contract error: ${JSON.stringify(error.data)}`);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  };

  const placeBet = async (roundId: number, amount: number, choice: boolean, ethValue: string) => {
    if (!instance || !address || !signerPromise || !contractAddress) {
      throw new Error("Missing required dependencies");
    }

    try {
      const target = contractAddress;
      console.log('Creating encrypted input for placeBet:', {
        target,
        address,
        amount,
        choice,
        ethValue,
      });

      const input = instance.createEncryptedInput(target, address);
      input.add32(amount);
      input.addBool(choice);
      const encrypted = await input.encrypt();

      console.log('Encrypted data for placeBet:', {
        handles: encrypted.handles,
        handlesLength: encrypted.handles?.length,
        proofLength: encrypted.inputProof?.length,
      });

      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      // Convert ethValue string to BigNumber for ethers.js
      // ethValue is already in wei format from parseEther
      const valueBigInt = BigInt(ethValue);

      console.log('Calling placeBet with:', {
        roundId,
        choiceHandle: encrypted.handles[1],
        amountHandle: encrypted.handles[0],
        proofLength: encrypted.inputProof.length,
        value: valueBigInt.toString(),
        valueHex: `0x${valueBigInt.toString(16)}`,
      });

      // Try to estimate gas first to catch errors early
      try {
        const gasEstimate = await contract.placeBet.estimateGas(
          roundId,
          encrypted.handles[1], // ebool handle (choice)
          encrypted.handles[0], // euint32 handle (amount)
          encrypted.inputProof,
          { value: valueBigInt }
        );
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (estimateError: any) {
        console.error('Gas estimation failed:', estimateError);
        // If gas estimation fails, the transaction will likely fail too
        // But we'll still try to send it to get a better error message
      }

      const tx = await contract.placeBet(
        roundId,
        encrypted.handles[1], // ebool handle (choice)
        encrypted.handles[0], // euint32 handle (amount)
        encrypted.inputProof,
        { value: valueBigInt }
      );
      
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      return receipt;
    } catch (error: any) {
      console.error('placeBet error:', error);
      
      // Try to extract more error information
      if (error.reason) {
        throw new Error(error.reason);
      } else if (error.data) {
        // Try to decode custom error if possible
        if (error.data.message) {
          throw new Error(error.data.message);
        }
        throw new Error(`Contract error: ${JSON.stringify(error.data)}`);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  };

  const getRoundInfo = async (roundId: number) => {
    if (!client || !contractAddress) return null;
    return await client.readContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "getRoundInfo",
      args: [BigInt(roundId)],
    });
  };

  const getRoundCount = async () => {
    if (!client || !contractAddress) return 0;
    try {
      const count = await client.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "roundCounter",
      });
      return Number(count);
    } catch (error) {
      console.error("Failed to get round count:", error);
      return 0;
    }
  };

  const getUserBet = async (roundId: number, participant: string) => {
    if (!client || !contractAddress) return null;
    try {
      const result = await client.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getUserBet",
        args: [BigInt(roundId), participant as `0x${string}`],
      });
      return {
        ethAmount: result[0] as bigint,
        hasClaimed: result[1] as boolean,
      };
    } catch (error) {
      console.error("Failed to get user bet:", error);
      return null;
    }
  };

  const getRoundTotalPool = async (roundId: number) => {
    if (!client || !contractAddress) return null;
    try {
      const pool = await client.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getRoundTotalPool",
        args: [BigInt(roundId)],
      });
      return pool as bigint;
    } catch (error) {
      console.error("Failed to get round total pool:", error);
      return null;
    }
  };

  const claimReward = async (
    roundId: number,
    rewardAmount: string,
    userBetAmountInUnits: number,
    userChoice: boolean,
    winningSide: boolean,
    winningSideTotalInUnits: number
  ) => {
    if (!signerPromise || !contractAddress) {
      throw new Error("Missing required dependencies");
    }

    try {
      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      console.log('Claiming reward:', {
        roundId,
        rewardAmount,
        userBetAmountInUnits,
        userChoice,
        winningSide,
        winningSideTotalInUnits,
      });

      const tx = await contract.claimReward(
        roundId,
        rewardAmount,
        userBetAmountInUnits,
        userChoice,
        winningSide,
        winningSideTotalInUnits
      );
      
      console.log('Claim transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Claim transaction confirmed:', receipt);
      return receipt;
    } catch (error: any) {
      console.error('claimReward error:', error);
      
      if (error.reason) {
        throw new Error(error.reason);
      } else if (error.data) {
        if (error.data.message) {
          throw new Error(error.data.message);
        }
        throw new Error(`Contract error: ${JSON.stringify(error.data)}`);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  };

  const resolveRound = async (roundId: number) => {
    if (!signerPromise || !contractAddress) {
      throw new Error("Missing required dependencies");
    }

    try {
      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      console.log('Resolving round:', roundId);

      const tx = await contract.resolveRound(roundId);
      console.log('Resolve transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Resolve transaction confirmed:', receipt);
      // Amounts are now publicly decryptable (done in resolveRound)
      return receipt;
    } catch (error: any) {
      console.error('resolveRound error:', error);
      
      if (error.reason) {
        throw new Error(error.reason);
      } else if (error.data) {
        if (error.data.message) {
          throw new Error(error.data.message);
        }
        throw new Error(`Contract error: ${JSON.stringify(error.data)}`);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  };

  const authorizeParticipant = async (roundId: number, participant: string) => {
    if (!signerPromise || !contractAddress) {
      throw new Error("Missing required dependencies");
    }

    try {
      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      console.log('Authorizing participant:', participant, 'for round:', roundId);

      const tx = await contract.authorizeParticipant(roundId, participant);
      const receipt = await tx.wait();
      console.log('Participant authorized:', receipt);
      return receipt;
    } catch (error: any) {
      console.error('authorizeParticipant error:', error);
      throw error;
    }
  };

  const decryptAmount = async (encryptedHandle: string): Promise<number> => {
    if (!instance || !address || !signerPromise || !contractAddress) {
      throw new Error("Missing required dependencies");
    }

    try {
      // Check if handle is all zeros (empty/uninitialized value)
      const zeroHandle = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (encryptedHandle === zeroHandle || encryptedHandle === '0x0' || !encryptedHandle || encryptedHandle === '0') {
        return 0;
      }

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedHandle,
          contractAddress: contractAddress,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      const signer = await signerPromise;
      // ethers.js v6 signTypedData signature
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = (result as any)[encryptedHandle];
      return Number(decryptedValue || 0);
    } catch (error: any) {
      console.error('Decrypt error:', error);
      throw new Error(`Failed to decrypt: ${error.message || 'Unknown error'}`);
    }
  };

  const getEncryptedAmounts = async (roundId: number) => {
    if (!client || !contractAddress) return null;
    try {
      const [yesAmount, noAmount, totalAmount] = await Promise.all([
        client.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "getYesAmount",
          args: [BigInt(roundId)],
        }),
        client.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "getNoAmount",
          args: [BigInt(roundId)],
        }),
        client.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "getTotalAmount",
          args: [BigInt(roundId)],
        }),
      ]);

      return {
        yesAmount: yesAmount as string,
        noAmount: noAmount as string,
        totalAmount: totalAmount as string,
      };
    } catch (error) {
      console.error("Failed to get encrypted amounts:", error);
      return null;
    }
  };

  const hasParticipated = async (roundId: number, participant: string) => {
    if (!client || !contractAddress) return false;
    try {
      const result = await client.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "hasParticipated",
        args: [BigInt(roundId), participant as `0x${string}`],
      });
      return Boolean(result);
    } catch (error) {
      console.error("Failed to check participation:", error);
      return false;
    }
  };

  return {
    createRound,
    placeBet,
    getRoundInfo,
    getRoundCount,
    resolveRound,
    authorizeParticipant,
    decryptAmount,
    getEncryptedAmounts,
    hasParticipated,
    getUserBet,
    getRoundTotalPool,
    claimReward,
    isPending,
    error,
  };
}

