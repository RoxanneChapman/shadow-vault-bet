import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEncryptedBet = await deploy("EncryptedBet", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedBet contract: `, deployedEncryptedBet.address);
};
export default func;
func.id = "deploy_all"; // id required to prevent reexecution
func.tags = ["EncryptedBet"];


