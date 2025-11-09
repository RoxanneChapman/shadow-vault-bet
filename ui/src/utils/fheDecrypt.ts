import { useZamaInstance } from "@/hooks/useZamaInstance";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { usePublicClient, useAccount } from "wagmi";
import { getContractAddress } from "@/config/contracts";

export async function decryptEuint32(
  encryptedValue: string,
  contractAddress: string,
  instance: any,
  signer: any,
  client: any,
  address: string
): Promise<number> {
  if (!encryptedValue || encryptedValue === "0x" + "0".repeat(64)) {
    return 0;
  }

  const keypair = instance.generateKeypair();
  const handleContractPairs = [{ handle: encryptedValue, contractAddress }];
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = "10";
  const eip712 = instance.createEIP712(keypair.publicKey, [contractAddress], startTimeStamp, durationDays);
  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );
  const result = await instance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    [contractAddress],
    address,
    startTimeStamp,
    durationDays
  );
  const micro = result[encryptedValue] || "0";
  return Number(micro);
}


