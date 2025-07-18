import { ethers, Contract, Wallet, JsonRpcProvider, InterfaceAbi } from 'ethers';

// ABIs as arrays (or use type assertions)
const bridgeSourceABI: InterfaceAbi = [
  "event TokenLocked(address indexed user, uint256 amount, address destination)",
  "function release(address user, uint256 amount) external"
];
const bridgeDestABI: InterfaceAbi = [
  "event TokenBurned(address indexed user, uint256 amount, address destination)",
  "function mintWrapped(address user, uint256 amount) external"
];

// Local Hardhat RPC (same for both "chains" in sim)
const provider: JsonRpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const relayerWallet: Wallet = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);  // Hardhat default private key for account 1 (relayer)

// Replace with your deployed addresses
const SOURCE_BRIDGE_ADDRESS: string = '0x'; //replace with your source bridge address
const DEST_BRIDGE_ADDRESS: string = '0x'; //replace with your destination bridge address

const bridgeSource: Contract = new ethers.Contract(SOURCE_BRIDGE_ADDRESS, bridgeSourceABI, relayerWallet);
const bridgeDest: Contract = new ethers.Contract(DEST_BRIDGE_ADDRESS, bridgeDestABI, relayerWallet);

// Listen for lock -> mint
bridgeSource.on('TokenLocked', async (user: string, amount: bigint, destination: string) => {
  console.log(`Lock detected: ${user} locked ${amount.toString()} for ${destination}`);
  try {
    const tx = await bridgeDest.mintWrapped(destination, amount);
    await tx.wait();
    console.log('Minted wrapped tokens');
  } catch (error) {
    console.error('Mint error:', error);
  }
});

// Listen for burn -> release
bridgeDest.on('TokenBurned', async (user: string, amount: bigint, destination: string) => {
  console.log(`Burn detected: ${user} burned ${amount.toString()} for ${destination}`);
  try {
    const tx = await bridgeSource.release(destination, amount);
    await tx.wait();
    console.log('Released original tokens');
  } catch (error) {
    console.error('Release error:', error);
  }
});

console.log('Relayer running...');