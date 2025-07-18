import { ethers } from "hardhat";

async function main() {
  const [deployer, relayer] = await ethers.getSigners();  // HardhatRuntimeEnvironment infers types

  console.log("Deploying MockToken...");
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy();
  await mockToken.waitForDeployment();
  console.log("MockToken deployed to:", await mockToken.getAddress());

  console.log("Deploying WrappedToken...");
  const WrappedToken = await ethers.getContractFactory("WrappedToken");
  const wrappedToken = await WrappedToken.deploy();
  await wrappedToken.waitForDeployment();
  console.log("WrappedToken deployed to:", await wrappedToken.getAddress());

  console.log("Deploying BridgeSourceChain...");
  const BridgeSourceChain = await ethers.getContractFactory("BridgeSourceChain");
  const bridgeSource = await BridgeSourceChain.deploy(await mockToken.getAddress(), relayer.address);
  await bridgeSource.waitForDeployment();
  console.log("BridgeSourceChain deployed to:", await bridgeSource.getAddress());

  console.log("Deploying BridgeDestinationChain...");
  const BridgeDestinationChain = await ethers.getContractFactory("BridgeDestinationChain");
  const bridgeDest = await BridgeDestinationChain.deploy(await wrappedToken.getAddress(), relayer.address);
  await bridgeDest.waitForDeployment();
  console.log("BridgeDestinationChain deployed to:", await bridgeDest.getAddress());

  // For testing: Transfer some tokens to deployer (using BigInt for amounts)
  await mockToken.transfer(deployer.address, ethers.parseEther("1000"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});