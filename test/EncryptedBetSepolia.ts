import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedBet, EncryptedBet__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedBet")) as EncryptedBet__factory;
  const encryptedBetContract = (await factory.deploy()) as EncryptedBet;
  const encryptedBetContractAddress = await encryptedBetContract.getAddress();

  return { encryptedBetContract, encryptedBetContractAddress };
}

describe("EncryptedBetSepolia", function () {
  let signers: Signers;
  let encryptedBetContract: EncryptedBet;
  let encryptedBetContractAddress: string;

  before(async function () {
    // Check whether the tests are running against Sepolia Testnet
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite is for Sepolia Testnet only`);
      this.skip();
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };

    await fhevm.initializeCLIApi();

    ({ encryptedBetContract, encryptedBetContractAddress } = await deployFixture());
  });

  it("should create a betting round", async function () {
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const roundName = "Test Round";
    const initialAmount = 100;
    const initialChoice = true; // YES

    const encryptedAmount = await fhevm
      .createEncryptedInput(encryptedBetContractAddress, signers.alice.address)
      .add32(initialAmount)
      .addBool(initialChoice)
      .encrypt();

    const tx = await encryptedBetContract
      .connect(signers.alice)
      .createRound(
        roundName,
        endTime,
        encryptedAmount.handles[1], // ebool handle
        encryptedAmount.handles[0], // euint32 handle
        encryptedAmount.inputProof
      );
    await tx.wait();

    const roundInfo = await encryptedBetContract.getRoundInfo(0);
    expect(roundInfo.creator).to.eq(signers.alice.address);
    expect(roundInfo.name).to.eq(roundName);
    expect(roundInfo.endTime).to.eq(endTime);
    expect(roundInfo.resolved).to.eq(false);
    expect(roundInfo.participantCount).to.eq(1);
  });

  it("should allow placing a bet on a round", async function () {
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    const initialAmount = 100;
    const initialChoice = true;

    // Create round
    const encryptedCreate = await fhevm
      .createEncryptedInput(encryptedBetContractAddress, signers.alice.address)
      .add32(initialAmount)
      .addBool(initialChoice)
      .encrypt();

    await encryptedBetContract
      .connect(signers.alice)
      .createRound(
        "Test Round",
        endTime,
        encryptedCreate.handles[1],
        encryptedCreate.handles[0],
        encryptedCreate.inputProof
      );

    // Place bet from bob
    const betAmount = 50;
    const betChoice = false; // NO

    const encryptedBet = await fhevm
      .createEncryptedInput(encryptedBetContractAddress, signers.bob.address)
      .add32(betAmount)
      .addBool(betChoice)
      .encrypt();

    const tx = await encryptedBetContract
      .connect(signers.bob)
      .placeBet(
        0,
        encryptedBet.handles[1], // ebool handle
        encryptedBet.handles[0], // euint32 handle
        encryptedBet.inputProof,
        { value: ethers.parseEther("0.1") }
      );
    await tx.wait();

    const roundInfo = await encryptedBetContract.getRoundInfo(0);
    expect(roundInfo.participantCount).to.eq(2);

    const hasParticipated = await encryptedBetContract.hasParticipated(0, signers.bob.address);
    expect(hasParticipated).to.eq(true);
  });
});


