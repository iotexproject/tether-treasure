const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const { SignerWithAddress } = require("@nomicfoundation/hardhat-ethers/signers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("TetherTreasury", function () {
  let tether;
  let treasury;
  let owner;
  let alice;
  let bob;
  let hacker;

  beforeEach(async function () {
    [owner, alice, bob, hacker] = await ethers.getSigners();
    tether = await ethers.deployContract("MockTether", []);
    expect(await tether.balanceOf(owner.address)).to.equal(1000000 * 10 ** 6);
    treasury = await ethers.deployContract("TetherTreasury", [tether.target]);
    await tether.transfer(treasury.target, 5000 * 10 ** 6);
  });

  it("should allow the owner to withdraw", async function () {
    await treasury.withdraw(alice, 100 * 10 ** 6);
    expect(await tether.balanceOf(alice.address)).to.equal(100 * 10 ** 6);
  });

  it("should not allow the owner to withdraw more than the balance", async function () {
    await expect(treasury.withdraw(alice.address, 5001 * 10 ** 6)).to.be.revertedWithCustomError(tether, "ERC20InsufficientBalance");
  });

  it("should not allow non-owners to withdraw", async function () {
    await expect(treasury.connect(hacker).withdraw(alice.address, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
  });

  describe("test allowance", function () {
    beforeEach(async function () {
      expect(await tether.allowance(treasury.target, alice.address)).to.equal(0);
      expect(await tether.allowance(treasury.target, bob.address)).to.equal(0);
      expect(await tether.allowance(treasury.target, hacker.address)).to.equal(0);
    });
    it("owner cannot set invalid allowance", async function () {
      await expect(treasury.connect(owner).decreaseAllowance(alice.address, 100 * 10 ** 6)).to.be.revertedWithPanic(0x11);
      await expect(treasury.connect(owner).increaseAllowance(alice.address, 0)).to.be.revertedWithCustomError(treasury, "TetherTreasuryInvalidAmount");
      await expect(treasury.connect(owner).increaseAllowance(ethers.ZeroAddress, 0)).to.be.revertedWithCustomError(treasury, "TetherTreasuryInvalidAmount");
      await expect(treasury.connect(owner).increaseAllowance(ethers.ZeroAddress, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasury, "TetherTreasuryInvalidSpender");
    });
    it("invalid repay", async function () {
      await expect(treasury.connect(owner).repay(0)).to.be.revertedWithCustomError(treasury, "TetherTreasuryInvalidAmount");
      await expect(treasury.connect(hacker).repay(100 * 10 ** 6)).to.be.revertedWithCustomError(tether, "ERC20InsufficientAllowance");
    });
    it("should allow the owner to set allowance", async function () {
      await expect(treasury.connect(owner).increaseAllowance(alice.address, 100 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasury.target, alice.address, 100 * 10 ** 6);
      await expect(treasury.connect(owner).increaseAllowance(bob.address, 500 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasury.target, bob.address, 500 * 10 ** 6);
      expect(await tether.allowance(treasury.target, alice.address)).to.equal(100 * 10 ** 6);
      await expect(treasury.connect(owner).decreaseAllowance(alice.address, 60 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasury.target, alice.address, 40 * 10 ** 6);
      await expect(treasury.connect(owner).increaseAllowance(bob.address, 200 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasury.target, bob.address, 700 * 10 ** 6);
      expect(await tether.allowance(treasury.target, alice.address)).to.equal(40 * 10 ** 6);
      expect(await tether.allowance(treasury.target, bob.address)).to.equal(700 * 10 ** 6);
      await treasury.connect(owner).resetAllowance(alice);
      await treasury.connect(owner).resetAllowance(bob);
      expect(await tether.allowance(treasury.target, alice.address)).to.equal(0);
      expect(await tether.allowance(treasury.target, bob.address)).to.equal(0);
    });
    it("should not allow non-owners to set allowance", async function () {
      await expect(treasury.connect(hacker).increaseAllowance(alice.address, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
      await expect(treasury.connect(hacker).decreaseAllowance(alice.address, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
      await expect(treasury.connect(hacker).resetAllowance(alice.address)).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
    it("spend and repay", async function () {
      await expect(treasury.connect(owner).increaseAllowance(alice.address, 100 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasury.target, alice.address, 100 * 10 ** 6);
      await expect(tether.connect(alice).transferFrom(treasury.target, bob.address, 30 * 10 ** 6)).to.emit(tether, "Transfer").withArgs(treasury.target, bob.address, 30 * 10 ** 6);
      expect(await tether.balanceOf(treasury.target)).to.equal(4970 * 10 ** 6);
      expect(await tether.balanceOf(bob.address)).to.equal(30 * 10 ** 6);
      expect(await tether.allowance(treasury.target, alice.address)).to.equal(70 * 10 ** 6);
      await expect(tether.connect(bob).transfer(alice.address, 20 * 10 ** 6)).to.emit(tether, "Transfer").withArgs(bob.address, alice.address, 20 * 10 ** 6);
      expect(await tether.balanceOf(alice.address)).to.equal(20 * 10 ** 6);
      expect(await tether.balanceOf(bob.address)).to.equal(10 * 10 ** 6);
      await expect(tether.connect(alice).approve(treasury.target, 10 * 10 ** 6)).to.emit(tether, "Approval").withArgs(alice.address, treasury.target, 10 * 10 ** 6);
      await expect(treasury.connect(alice).repay(10 * 10 ** 6)).to.emit(tether, "Transfer").withArgs(alice.address, treasury.target, 10 * 10 ** 6).to.emit(tether, "Approval").withArgs(treasury.target, alice.address, 80 * 10 ** 6);
      expect(await tether.balanceOf(alice.address)).to.equal(10 * 10 ** 6);
      expect(await tether.allowance(treasury.target, alice.address)).to.equal(80 * 10 ** 6);
      expect(await tether.balanceOf(treasury.target)).to.equal(4980 * 10 ** 6);
      await expect(tether.connect(bob).approve(treasury.target, 10 * 10 ** 6)).to.emit(tether, "Approval").withArgs(bob.address, treasury.target, 10 * 10 ** 6);
      await expect(treasury.connect(bob).repay(10 * 10 ** 6)).to.emit(tether, "Transfer").withArgs(bob.address, treasury.target, 10 * 10 ** 6).to.emit(tether, "Approval").withArgs(treasury.target, bob.address, 10 * 10 ** 6);
      expect(await tether.balanceOf(bob.address)).to.equal(0);
      expect(await tether.allowance(treasury.target, bob.address)).to.equal(10 * 10 ** 6);
      expect(await tether.balanceOf(treasury.target)).to.equal(4990 * 10 ** 6);
    });
  });
});
