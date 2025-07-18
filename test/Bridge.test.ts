import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Blockchain Bridge", function () {
  let mockToken: Contract;
  let wrappedToken: Contract;
  let bridgeSource: Contract;
  let bridgeDest: Contract;
  let owner: Signer;
  let user: Signer;
  let relayer: Signer;

  before(async function () {
    [owner, user, relayer] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy();

    const WrappedToken = await ethers.getContractFactory("WrappedToken");
    wrappedToken = await WrappedToken.deploy();

    const BridgeSourceChain = await ethers.getContractFactory("BridgeSourceChain");
    bridgeSource = await BridgeSourceChain.deploy(await mockToken.getAddress(), relayer.getAddress());

    const BridgeDestinationChain = await ethers.getContractFactory("BridgeDestinationChain");
    bridgeDest = await BridgeDestinationChain.deploy(await wrappedToken.getAddress(), relayer.getAddress());

    // Give user some tokens
    await mockToken.transfer(await user.getAddress(), ethers.parseEther("100"));
  });

  it("Should lock tokens on source and allow relayer to mint on dest", async function () {
    const amount = ethers.parseEther("10");

    // User approves and locks
    await mockToken.connect(user).approve(await bridgeSource.getAddress(), amount);
    await bridgeSource.connect(user).lock(amount, await user.getAddress());

    // Simulate relayer: Check balance locked
    expect(await mockToken.balanceOf(await bridgeSource.getAddress())).to.equal(amount);

    // Relayer mints (in real: triggered by event, here manual for test)
    await bridgeDest.connect(relayer).mintWrapped(await user.getAddress(), amount);
    expect(await wrappedToken.balanceOf(await user.getAddress())).to.equal(amount);
  });

  it("Should burn on dest and allow relayer to release on source", async function () {
    const amount = ethers.parseEther("5");

    // Assume user has wrapped tokens from previous test or mint for setup
    await wrappedToken.connect(owner).mint(await user.getAddress(), amount);  // Setup mint

    // User burns
    await bridgeDest.connect(user).burn(amount, await user.getAddress());

    // Simulate relayer: Release
    const initialBalance = await mockToken.balanceOf(await user.getAddress());
    await bridgeSource.connect(relayer).release(await user.getAddress(), amount);
    expect(await mockToken.balanceOf(await user.getAddress())).to.equal(initialBalance + amount);
  });
});