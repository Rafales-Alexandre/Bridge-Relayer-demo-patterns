import { ethers } from "hardhat";

async function main() {
  try {
    // Get signers for reference
    const [deployer, relayer] = await ethers.getSigners();
    
    console.log("=== Deployed Contract Addresses ===");
    console.log("MockToken: 0x5FbDB2315678afecb367f032d93F642f64180aa3");
    console.log("WrappedToken: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    console.log("BridgeSourceChain: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
    console.log("BridgeDestinationChain: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
    console.log("===================================");
    
    console.log("\n=== Signers ===");
    console.log("Deployer:", deployer.address);
    console.log("Relayer:", relayer.address);
    console.log("===============");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 