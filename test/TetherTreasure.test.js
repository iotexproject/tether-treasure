const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const { SignerWithAddress } = require("@nomicfoundation/hardhat-ethers/signers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("TetherTreasure", function () {
  let tether;
  let treasure;
  let owner;
  let alice;
  let bob;
  let hacker;

  beforeEach(async function () {
    [owner, alice, bob, hacker] = await ethers.getSigners();
    tether = await ethers.deployContract("MockTether", []);
    expect(await tether.balanceOf(owner.address)).to.equal(1000000 * 10 ** 6);
    treasure = await ethers.deployContract("TetherTreasure", [tether.target]);
    await tether.transfer(treasure.target, 5000 * 10 ** 6);
  });

  it("should allow the owner to withdraw", async function () {
    await treasure.withdraw(alice, 100 * 10 ** 6);
    expect(await tether.balanceOf(alice.address)).to.equal(100 * 10 ** 6);
  });

  it("should not allow the owner to withdraw more than the balance", async function () {
    await expect(treasure.withdraw(alice.address, 5001 * 10 ** 6)).to.be.revertedWith("Not enough balance");
  });

  it("should not allow non-owners to withdraw", async function () {
    await expect(treasure.connect(hacker).withdraw(alice.address, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasure, "OwnableUnauthorizedAccount");
  });

  describe("test allowance", function () {
    beforeEach(async function () {
      expect(await tether.allowance(treasure.target, alice.address)).to.equal(0);
      expect(await tether.allowance(treasure.target, bob.address)).to.equal(0);
      expect(await tether.allowance(treasure.target, hacker.address)).to.equal(0);
    });
    it("owner cannot set invalid allowance", async function () {
      await expect(treasure.connect(owner).decreaseAllowance(alice.address, 100 * 10 ** 6)).to.be.revertedWithPanic(0x11);
      await expect(treasure.connect(owner).increaseAllowance(alice.address, 0)).to.be.revertedWith("Amount must be greater than 0");
      await expect(treasure.connect(owner).increaseAllowance(ethers.ZeroAddress, 0)).to.be.revertedWith("Amount must be greater than 0");
      await expect(treasure.connect(owner).increaseAllowance(ethers.ZeroAddress, 100 * 10 ** 6)).to.be.revertedWith("Spender cannot be zero address");
    });
    it("should allow the owner to set allowance", async function () {
      await expect(treasure.connect(owner).increaseAllowance(alice.address, 100 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasure.target, alice.address, 100 * 10 ** 6);
      await expect(treasure.connect(owner).increaseAllowance(bob.address, 500 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasure.target, bob.address, 500 * 10 ** 6);
      expect(await tether.allowance(treasure.target, alice.address)).to.equal(100 * 10 ** 6);
      await expect(treasure.connect(owner).decreaseAllowance(alice.address, 60 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasure.target, alice.address, 40 * 10 ** 6);
      await expect(treasure.connect(owner).increaseAllowance(bob.address, 200 * 10 ** 6)).to.emit(tether, "Approval").withArgs(treasure.target, bob.address, 700 * 10 ** 6);
      expect(await tether.allowance(treasure.target, alice.address)).to.equal(40 * 10 ** 6);
      expect(await tether.allowance(treasure.target, bob.address)).to.equal(700 * 10 ** 6);
      await treasure.connect(owner).resetAllowance(alice);
      await treasure.connect(owner).resetAllowance(bob);
      expect(await tether.allowance(treasure.target, alice.address)).to.equal(0);
      expect(await tether.allowance(treasure.target, bob.address)).to.equal(0);
    });
    it("should not allow non-owners to set allowance", async function () {
      await expect(treasure.connect(hacker).increaseAllowance(alice.address, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasure, "OwnableUnauthorizedAccount");
      await expect(treasure.connect(hacker).decreaseAllowance(alice.address, 100 * 10 ** 6)).to.be.revertedWithCustomError(treasure, "OwnableUnauthorizedAccount");
      await expect(treasure.connect(hacker).resetAllowance(alice.address)).to.be.revertedWithCustomError(treasure, "OwnableUnauthorizedAccount");
    });
  });
});
