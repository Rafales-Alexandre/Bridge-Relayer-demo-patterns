import { ethers } from 'hardhat';

async function main() {
  // Replace with your actual MockToken address
  const MOCK_TOKEN_ADDRESS = '0x'; //replace with your mock token address
  const USER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';  // Your user address
  const AMOUNT = ethers.parseEther('100');  // Amount to transfer

  const mockToken = await ethers.getContractAt('MockToken', MOCK_TOKEN_ADDRESS);
  const tx = await mockToken.transfer(USER_ADDRESS, AMOUNT);
  await tx.wait();

  console.log(`Transferred ${ethers.formatEther(AMOUNT)} MockTokens to ${USER_ADDRESS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
