import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BridgeDeployment", (m) => {
  // Deploy MockToken
  const mockToken = m.contract("MockToken", []);

  // Deploy WrappedToken
  const wrappedToken = m.contract("WrappedToken", []);

  // Deploy BridgeSourceChain with MockToken address and relayer
  const bridgeSource = m.contract("BridgeSourceChain", [
    mockToken,
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
  ]);

  // Deploy BridgeDestinationChain with WrappedToken address and relayer
  const bridgeDest = m.contract("BridgeDestinationChain", [
    wrappedToken,
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
  ]);

  // Transfer initial tokens to deployer for testing
  m.call(mockToken, "transfer", [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account #0
    "1000000000000000000000"
  ]); // 1000 tokens with 18 decimals

  return {
    mockToken,
    wrappedToken,
    bridgeSource,
    bridgeDest,
  };
}); 