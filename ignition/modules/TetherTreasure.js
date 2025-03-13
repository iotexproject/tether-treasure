// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TETHER_ADDRESS = "0x";

module.exports = buildModule("TetherTreasureModule", (m) => {
  const tether = m.getParameter("tether", TETHER_ADDRESS);

  const treasure = m.contract("TetherTreasure", [tether], {});

  return { treasure };
});
