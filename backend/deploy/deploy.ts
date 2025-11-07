import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedMultiAssetAnalyzer = await deploy("MultiAssetAnalyzer", {
    from: deployer,
    log: true,
  });

  console.log(`MultiAssetAnalyzer contract: `, deployedMultiAssetAnalyzer.address);
};
export default func;
func.id = "deploy_multiAssetAnalyzer"; // id required to prevent reexecution
func.tags = ["MultiAssetAnalyzer"];

