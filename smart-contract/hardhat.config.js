require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    // ABI hasil compile langsung dipakai frontend
    artifacts: "../frontend/artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
};
