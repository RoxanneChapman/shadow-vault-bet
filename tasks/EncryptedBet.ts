import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the EncryptedBet contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the EncryptedBet contract
 *
 *   npx hardhat --network localhost task:bet:create --name "Test Round" --endTime 1734567890
 *   npx hardhat --network localhost task:bet:list
 *   npx hardhat --network localhost task:bet:info --roundId 0
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the EncryptedBet contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the EncryptedBet contract
 *
 *   npx hardhat --network sepolia task:bet:create --name "Test Round" --endTime 1734567890
 *   npx hardhat --network sepolia task:bet:list
 *   npx hardhat --network sepolia task:bet:info --roundId 0
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:bet:address
 *   - npx hardhat --network sepolia task:bet:address
 */
task("task:bet:address", "Prints the EncryptedBet address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const encryptedBet = await deployments.get("EncryptedBet");

  console.log("EncryptedBet address is " + encryptedBet.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:bet:create --name "Test Round" --endTime 1734567890 --amount 100 --choice yes
 *   - npx hardhat --network sepolia task:bet:create --name "Test Round" --endTime 1734567890 --amount 100 --choice yes
 */
task("task:bet:create", "Creates a new betting round")
  .addOptionalParam("address", "Optionally specify the EncryptedBet contract address")
  .addParam("name", "The name of the betting round")
  .addParam("endTime", "Unix timestamp when the round ends")
  .addParam("amount", "Initial bet amount")
  .addParam("choice", "Initial choice: yes or no")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const EncryptedBetDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedBet");
    console.log(`EncryptedBet: ${EncryptedBetDeployment.address}`);

    const signers = await ethers.getSigners();
    const encryptedBetContract = await ethers.getContractAt("EncryptedBet", EncryptedBetDeployment.address);

    const amount = parseInt(taskArguments.amount);
    const choice = taskArguments.choice.toLowerCase() === "yes" || taskArguments.choice.toLowerCase() === "y";
    const endTime = parseInt(taskArguments.endTime);

    // Encrypt amount and choice
    const encryptedInput = await fhevm
      .createEncryptedInput(EncryptedBetDeployment.address, signers[0].address)
      .add32(amount)
      .addBool(choice)
      .encrypt();

    const tx = await encryptedBetContract
      .connect(signers[0])
      .createRound(
        taskArguments.name,
        endTime,
        encryptedInput.handles[1], // ebool handle for choice
        encryptedInput.handles[0], // euint32 handle for amount
        encryptedInput.inputProof
      );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const roundInfo = await encryptedBetContract.getRoundInfo(await encryptedBetContract.roundCounter() - BigInt(1));
    console.log(`Round created! Round ID: ${roundInfo.id}, Name: ${roundInfo.name}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:bet:place --roundId 0 --amount 50 --choice no
 *   - npx hardhat --network sepolia task:bet:place --roundId 0 --amount 50 --choice no
 */
task("task:bet:place", "Places a bet on an existing round")
  .addOptionalParam("address", "Optionally specify the EncryptedBet contract address")
  .addParam("roundId", "The ID of the betting round")
  .addParam("amount", "Bet amount")
  .addParam("choice", "Bet choice: yes or no")
  .addOptionalParam("value", "ETH value to send (default: 0.1)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const EncryptedBetDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedBet");
    console.log(`EncryptedBet: ${EncryptedBetDeployment.address}`);

    const signers = await ethers.getSigners();
    const encryptedBetContract = await ethers.getContractAt("EncryptedBet", EncryptedBetDeployment.address);

    const roundId = parseInt(taskArguments.roundId);
    const amount = parseInt(taskArguments.amount);
    const choice = taskArguments.choice.toLowerCase() === "yes" || taskArguments.choice.toLowerCase() === "y";
    const value = taskArguments.value ? ethers.parseEther(taskArguments.value) : ethers.parseEther("0.1");

    // Encrypt amount and choice
    const encryptedInput = await fhevm
      .createEncryptedInput(EncryptedBetDeployment.address, signers[0].address)
      .add32(amount)
      .addBool(choice)
      .encrypt();

    const tx = await encryptedBetContract
      .connect(signers[0])
      .placeBet(
        roundId,
        encryptedInput.handles[1], // ebool handle for choice
        encryptedInput.handles[0], // euint32 handle for amount
        encryptedInput.inputProof,
        { value }
      );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`Bet placed on round ${roundId}!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:bet:info --roundId 0
 *   - npx hardhat --network sepolia task:bet:info --roundId 0
 */
task("task:bet:info", "Gets information about a betting round")
  .addOptionalParam("address", "Optionally specify the EncryptedBet contract address")
  .addParam("roundId", "The ID of the betting round")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const EncryptedBetDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedBet");
    console.log(`EncryptedBet: ${EncryptedBetDeployment.address}`);

    const signers = await ethers.getSigners();
    const encryptedBetContract = await ethers.getContractAt("EncryptedBet", EncryptedBetDeployment.address);

    const roundId = parseInt(taskArguments.roundId);

    const roundInfo = await encryptedBetContract.getRoundInfo(roundId);
    console.log(`\nRound ${roundId} Information:`);
    console.log(`  Name: ${roundInfo.name}`);
    console.log(`  Creator: ${roundInfo.creator}`);
    console.log(`  End Time: ${roundInfo.endTime} (${new Date(Number(roundInfo.endTime) * 1000).toLocaleString()})`);
    console.log(`  Resolved: ${roundInfo.resolved}`);
    console.log(`  Participants: ${roundInfo.participantCount}`);

    // Try to decrypt amounts (only works if user has permission)
    try {
      const totalAmount = await encryptedBetContract.getTotalAmount(roundId);
      if (totalAmount !== ethers.ZeroHash) {
        const clearTotal = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          totalAmount,
          EncryptedBetDeployment.address,
          signers[0],
        );
        console.log(`  Total Amount: ${clearTotal}`);

        const yesAmount = await encryptedBetContract.getYesAmount(roundId);
        const clearYes = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          yesAmount,
          EncryptedBetDeployment.address,
          signers[0],
        );
        console.log(`  YES Amount: ${clearYes}`);

        const noAmount = await encryptedBetContract.getNoAmount(roundId);
        const clearNo = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          noAmount,
          EncryptedBetDeployment.address,
          signers[0],
        );
        console.log(`  NO Amount: ${clearNo}`);
      }
    } catch (e) {
      console.log("  (Encrypted amounts - cannot decrypt without permission)");
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:bet:list
 *   - npx hardhat --network sepolia task:bet:list
 */
task("task:bet:list", "Lists all betting rounds")
  .addOptionalParam("address", "Optionally specify the EncryptedBet contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const EncryptedBetDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedBet");
    console.log(`EncryptedBet: ${EncryptedBetDeployment.address}`);

    const encryptedBetContract = await ethers.getContractAt("EncryptedBet", EncryptedBetDeployment.address);

    const roundCounter = await encryptedBetContract.roundCounter();
    const totalRounds = Number(roundCounter);

    console.log(`\nTotal Rounds: ${totalRounds}\n`);

    for (let i = 0; i < totalRounds; i++) {
      const roundInfo = await encryptedBetContract.getRoundInfo(i);
      console.log(`Round ${i}: ${roundInfo.name}`);
      console.log(`  Creator: ${roundInfo.creator}`);
      console.log(`  End Time: ${new Date(Number(roundInfo.endTime) * 1000).toLocaleString()}`);
      console.log(`  Resolved: ${roundInfo.resolved}`);
      console.log(`  Participants: ${roundInfo.participantCount}`);
      console.log("");
    }
  });


