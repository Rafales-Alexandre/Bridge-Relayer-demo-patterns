# Blockchain Bridge Demo

This repository demonstrates a simple blockchain bridge mechanism using Solidity smart contracts and a TypeScript-based off-chain relayer. It allows transferring ERC20 tokens between two simulated chains by locking/burning on one side and minting/releasing on the other. The setup uses Hardhat for local development and testing.

> **⚠️ This is a pedagogical example — not production-ready. Always audit code before any real use.**

---

## How the Bridge Works

1. **Source Chain**: Locks original tokens and emits an event.
2. **Relayer**: Listens for events and triggers actions on the destination chain.
3. **Destination Chain**: Mints wrapped tokens on the forward bridge; burns wrapped tokens and emits for the reverse.

---

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Basic knowledge of Solidity, TypeScript, and Ethereum development

---

## Installation

Clone the repository:

```bash
git clone <your-repo-url>
cd bridge-demo
```

Install dependencies:

```bash
npm install
```

This includes Hardhat, Ethers.js, OpenZeppelin contracts, TypeScript tools, and testing libraries.

Compile the Solidity contracts:

```bash
npx hardhat compile
```

---

## Project Structure

```
contracts/           # Solidity files
  ├─ MockToken.sol         # ERC20 for testing on the source
  ├─ BridgeSourceChain.sol # Handles lock/release
  └─ BridgeDestinationChain.sol # Mint/burn wrapped tokens
scripts/            # TypeScript scripts
  ├─ deploy.ts            # Deploys all contracts
  ├─ transfer-tokens.ts   # Transfers MockTokens to a user
  ├─ relayer-test.ts      # Automated full bridge test
  └─ relayer.ts           # Off-chain relayer (listens and relays events)
test/               # TypeScript unit tests
  └─ Bridge.test.ts       # Contract interaction tests
hardhat.config.ts   # Hardhat configuration
```

---

## Code Explanation

### BridgeSourceChain.sol (Source Chain)

This contract manages token locking on the source chain and releasing on reverse bridging. It uses an external ERC20 token and restricts releases to the relayer.

```solidity
contract BridgeSourceChain {
    address public token;
    address public relayer;

    event TokenLocked(address indexed user, uint amount, address destination);

    constructor(address _token, address _relayer) {
        token = _token;
        relayer = _relayer;
    }

    function lock(uint amount, address destination) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit TokenLocked(msg.sender, amount, destination);
    }

    function release(address user, uint amount) external {
        require(msg.sender == relayer, "Only relayer can release");
        require(IERC20(token).transfer(user, amount), "Transfer failed");
    }
}
```

- **lock**: Transfers tokens from the user to the contract (locking them) and emits `TokenLocked`.
- **release**: Only callable by the relayer; transfers locked tokens back to the user.

### BridgeDestinationChain.sol (Destination Chain)

This contract manages minting wrapped tokens on the destination chain and burning for reverse bridging. It uses an `IWrappedToken` interface.

```solidity
interface IWrappedToken {
    function mint(address to, uint amount) external;
    function burnFrom(address from, uint amount) external;
}

contract BridgeDestinationChain {
    address public wrappedToken;
    address public relayer;

    event TokenBurned(address indexed user, uint amount, address destination);

    constructor(address _wrappedToken, address _relayer) {
        wrappedToken = _wrappedToken;
        relayer = _relayer;
    }

    function mintWrapped(address user, uint amount) external {
        require(msg.sender == relayer, "Only relayer can mint");
        IWrappedToken(wrappedToken).mint(user, amount);
    }

    function burn(uint amount, address destination) external {
        IWrappedToken(wrappedToken).burnFrom(msg.sender, amount);
        emit TokenBurned(msg.sender, amount, destination);
    }
}
```

- **mintWrapped**: Only callable by the relayer; mints wrapped tokens to the user.
- **burn**: Burns wrapped tokens from the user and emits `TokenBurned`.

> **Note**: You need a separate WrappedToken contract implementing `IWrappedToken` (e.g., an ERC20 with mint/burn functions accessible by the bridge).

### Off-chain Relayer (relayer.ts)

The relayer listens for events on both contracts and automates cross-chain actions using Ethers.js.

```typescript
// Listen for events on the source (lock -> mint)
bridgeSourceChain.on("TokenLocked", async (user, amount, destination) => {
  console.log(`[BridgeSource] ${user} locked ${amount} tokens. Minting on destination for ${destination}...`);
  const tx = await bridgeDestinationChain.mintWrapped(destination, amount);
  await tx.wait();
  console.log("Minted wrapped tokens on destination");
});

// Listen for events on the destination (burn -> release)
bridgeDestinationChain.on("TokenBurned", async (user, amount, destination) => {
  console.log(`[BridgeDestination] ${user} burned ${amount} wrapped tokens. Releasing on source to ${destination}...`);
  const tx = await bridgeSourceChain.release(destination, amount);
  await tx.wait();
  console.log("Released tokens on source");
});
```

- Listens for `TokenLocked` and calls `mintWrapped` on the destination.
- Listens for `TokenBurned` and calls `release` on the source.

---

## Step-by-Step Usage

### 1. Start the Local Hardhat Node

```bash
npx hardhat node
```

This starts a JSON-RPC server at http://127.0.0.1:8545 with predefined test accounts.

> **Tip**: Restart the node if you encounter nonce or state issues (Ctrl+C then relaunch).

### 2. Deploy the Contracts

In a new terminal:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

This deploys MockToken, WrappedToken, BridgeSourceChain, and BridgeDestinationChain.
Copy the deployed addresses from the console.
Update these addresses in `relayer.ts`, `relayer-test.ts`, and `transfer-tokens.ts`.

- **Deployer**: Hardhat account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
- **Relayer**: Account #1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)

### 3. Transfer Tokens to a Test User (Optional but Recommended)

The deployer has the initial MockTokens. Transfer some to a user account for testing:

```bash
npx hardhat run scripts/transfer-tokens.ts --network localhost
```

Default user: Account #1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
This transfers 100 MockTokens.

### 4. Run Unit Tests

```bash
npx hardhat test
```

This runs `Bridge.test.ts`, simulating lock/mint and burn/release manually (without the relayer).

### 5. Start the Relayer

The relayer listens for events and automates the bridge. Update addresses in `relayer.ts`, then run:

```bash
npx ts-node relayer.ts
```

It uses account #1's private key as the relayer (authorized in the contracts).

### 6. Test the Full Bridge Flow

With the node and relayer running, test the end-to-end flow (lock → mint via relayer → burn → release via relayer). Update addresses and user private key in `relayer-test.ts`, then run:

```bash
npx ts-node .\scripts\relayer-test.ts
```

- Approves/locks 10 tokens, waits for mint, burns them, waits for release.
- Expected output: `Test completed successfully!` with balance logs.

> **If errors occur** ("Only relayer", nonce issues, etc.):
> - Ensure the relayer key matches the authorized one.
> - Restart the node and redeploy if the state is corrupted.

---

## Security & Limitations

- **Simplified demo**: Add multisig, pause, audits, rate limits for production.
- **Centralized relayer**: For production, consider Chainlink, zk-proofs, etc.
- **Never use real funds or unaudited code!**

---

## Troubleshooting

- **Nonce Errors**: Restart the Hardhat node and redeploy.
- **Insufficient Balance**: Run the transfer script.
- **"Only relayer" Revert**: Check the relayer key.
- **BAD_DATA on balanceOf**: Ensure contracts are deployed.

---

## Acknowledgements

Inspired by blockchain bridge concepts — contributions welcome! If this project helps you, please star the repo ⭐.

