Blockchain Bridge DemoThis repository demonstrates a simple blockchain bridge mechanism using Solidity smart contracts and a TypeScript-based off-chain relayer. It allows transferring ERC20 tokens between two simulated chains by locking/burning on one side and minting/releasing on the other. The setup uses Hardhat for local development and testing.The bridge works as follows:Source Chain: Locks original tokens and emits an event.
Relayer: Listens for events and triggers actions on the destination chain.
Destination Chain: Mints wrapped tokens on forward bridge; burns wrapped tokens and emits for reverse.
This is a pedagogical example—not production-ready. Always audit code before real use.

PrerequisitesNode.js (v18+ recommended)
npm or yarn
Basic knowledge of Solidity, TypeScript, and Ethereum development

InstallationClone the repository:

git clone <your-repo-url>
cd bridge-demo

Install dependencies:

npm install

This includes Hardhat, Ethers.js, OpenZeppelin contracts, TypeScript tools, and testing libraries.
Compile the Solidity contracts:

npx hardhat compile

This generates artifacts for deployment and interactions.

Project Structurecontracts/: Solidity filesMockToken.sol: ERC20 token for testing on the source chain.
BridgeSourceChain.sol: Handles locking and releasing tokens.
BridgeDestinationChain.sol: Includes WrappedToken (mintable/burnable ERC20) and handles minting/burning.

scripts/: TypeScript deployment and utility scriptsdeploy.ts: Deploys all contracts to the local network.
transfer-tokens.ts: Transfers MockTokens from deployer to a user for testing.
relayer-test.ts: Automated script to test the full bridge flow (lock → mint → burn → release).

test/: TypeScript testsBridge.test.ts: Unit tests for contract interactions.

relayer.ts: Off-chain relayer script that listens for events and bridges actions.
hardhat.config.ts: Hardhat configuration (TypeScript-based).
tsconfig.json: TypeScript compiler options.

Step-by-Step Usage1. Start the Local Hardhat NodeRun a local Ethereum blockchain simulator:

npx hardhat node

This starts a JSON-RPC server at http://127.0.0.1:8545 with predefined test accounts (listed in the console output).Note: Restart the node if you encounter nonce or state issues (Ctrl+C to stop, then rerun).2. Deploy ContractsIn a new terminal, deploy the contracts to the local node:

npx hardhat run scripts/deploy.ts --network localhost

This deploys MockToken, WrappedToken, BridgeSourceChain, and BridgeDestinationChain.
Copy the deployed addresses from the console logs (e.g., MockToken: 0x5FbDB2315678afecb367f032d93F642f64180aa3).
Update these addresses in relayer.ts, relayer-test.ts, and transfer-tokens.ts (replace placeholders like 0xYourMockTokenAddressHere).

The deployer is Hardhat account #0 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266), and the relayer is account #1 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8).3. Transfer Tokens to a Test User (Optional but Required for Testing)The deployer has initial MockTokens. Transfer some to a user account for bridging tests. Update addresses in transfer-tokens.ts if needed, then run:

npx hardhat run scripts/transfer-tokens.ts --network localhost

Default user: Hardhat account #1 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8).
This transfers 100 MockTokens.

4. Run Unit TestsVerify contract logic:

npx hardhat test

This runs Bridge.test.ts, simulating lock/mint and burn/release manually (without relayer).5. Start the RelayerThe relayer listens for events and automates the bridge. Update addresses in relayer.ts, then run in a separate terminal:

npx ts-node relayer.ts

It uses Hardhat account #1's private key as the relayer (authorized in contracts).
Logs events like "Lock detected" and "Minted wrapped tokens".

6. Test the Full Bridge FlowWith the node and relayer running, test the end-to-end flow (lock → mint via relayer → burn → release via relayer). Update addresses and user private key in relayer-test.ts (default: account #1's key), then run:

npx ts-node .\scripts\relayer-test.ts

It approves/locks 10 tokens, waits for mint, burns them, and waits for release.
Expected output: "Test completed successfully!" with balance logs.

If errors occur (e.g., "Only relayer" or nonce issues):Ensure relayer wallet key matches the authorized relayer.
Restart the node and redeploy if state is corrupted.

Security ConsiderationsThis is a simplified demo: Add multisig relayers, pauses, audits, and rate limits for production.
Relayer is centralized—consider decentralized alternatives like Chainlink or zk-proofs.
Never use real funds or deploy unaudited code.

TroubleshootingNonce Errors: Restart Hardhat node and redeploy.
Insufficient Balance: Run the transfer script.
"Only relayer" Revert: Check relayer wallet key matches deployment.
BAD_DATA on balanceOf: Ensure contracts are deployed before querying.

Inspired by blockchain bridge concepts—contributions welcome! If helpful, star the repo.

