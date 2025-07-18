import { ethers } from 'ethers';

// Configuration - Replace these with your actual deployed addresses and private key
const PROVIDER_URL = 'http://127.0.0.1:8545';  // Local Hardhat RPC
const USER_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';  // e.g., Hardhat default account 2: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
const MOCK_TOKEN_ADDRESS = '0x'; //replace with your mock token address
const BRIDGE_SOURCE_ADDRESS = '0x'; //replace with your source bridge address
const BRIDGE_DEST_ADDRESS = '0x'; //replace with your destination bridge address
const WRAPPED_TOKEN_ADDRESS = '0x'; //replace with your wrapped token address

// ABIs for interactions (minimal needed)
const erc20ABI: ethers.InterfaceAbi = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function transfer(address, uint256) returns (bool)'
];
const bridgeSourceABI: ethers.InterfaceAbi = [
  'function lock(uint256 amount, address destination) external'
];
const bridgeDestABI: ethers.InterfaceAbi = [
  'function burn(uint256 amount, address destination) external'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const userWallet = new ethers.Wallet(USER_PRIVATE_KEY, provider);

  // Get contract instances
  const mockToken = new ethers.Contract(MOCK_TOKEN_ADDRESS, erc20ABI, userWallet);
  const wrappedToken = new ethers.Contract(WRAPPED_TOKEN_ADDRESS, erc20ABI, userWallet);
  const bridgeSource = new ethers.Contract(BRIDGE_SOURCE_ADDRESS, bridgeSourceABI, userWallet);
  const bridgeDest = new ethers.Contract(BRIDGE_DEST_ADDRESS, bridgeDestABI, userWallet);

  const userAddress = userWallet.address;
  const amount = ethers.parseEther('10');  // Test amount: 10 tokens

  // Step 1: Ensure user has tokens (transfer from deployer if needed - manual step or add here if you have deployer key)
  console.log(`User address: ${userAddress}`);
  let userBalance = await mockToken.balanceOf(userAddress);
  console.log(`Initial MockToken balance: ${ethers.formatEther(userBalance)}`);

  if (userBalance < amount) {
    throw new Error('Insufficient MockToken balance. Transfer some from deployer first.');
  }

  // Step 2: Approve and lock on source (should trigger relayer to mint wrapped)
  console.log('Approving and locking tokens...');
  const nonce = await userWallet.getNonce();
  let tx = await mockToken.approve(BRIDGE_SOURCE_ADDRESS, amount, { nonce: nonce });
  await tx.wait();
  tx = await bridgeSource.lock(amount, userAddress);  // Destination is user themselves for simplicity
  await tx.wait();
  console.log('Lock completed. Waiting for relayer to mint wrapped tokens...');

  // Poll for wrapped token balance increase (wait up to 10 seconds)
  let wrappedBalance = await wrappedToken.balanceOf(userAddress);
  const startTime = Date.now();
  while (wrappedBalance < amount && Date.now() - startTime < 10000) {
    await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1s
    wrappedBalance = await wrappedToken.balanceOf(userAddress);
  }

  if (wrappedBalance >= amount) {
    console.log(`Wrapped tokens minted! New balance: ${ethers.formatEther(wrappedBalance)}`);
  } else {
    throw new Error('Relayer failed to mint wrapped tokens within timeout.');
  }

  // Step 3: Burn wrapped tokens (should trigger relayer to release original)
  console.log('Burning wrapped tokens...');
  // Note: burnFrom is called internally, but burn function doesn't need approve if it's from msg.sender
  tx = await bridgeDest.burn(amount, userAddress);  // Destination back to user
  await tx.wait();
  console.log('Burn completed. Waiting for relayer to release original tokens...');

  // Poll for mock token balance increase
  userBalance = await mockToken.balanceOf(userAddress);
  const initialUserBalanceAfterLock = userBalance;  // Should be original minus locked amount
  const burnStartTime = Date.now();
  while (userBalance <= initialUserBalanceAfterLock && Date.now() - burnStartTime < 10000) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    userBalance = await mockToken.balanceOf(userAddress);
  }

  if (userBalance > initialUserBalanceAfterLock) {
    console.log(`Original tokens released! New balance: ${ethers.formatEther(userBalance)}`);
  } else {
    throw new Error('Relayer failed to release original tokens within timeout.');
  }

  console.log('Test completed successfully!');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exitCode = 1;
});