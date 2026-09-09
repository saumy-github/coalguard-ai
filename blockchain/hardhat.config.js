require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Hardhat 2 + CommonJS on purpose. Hardhat 3 is ESM-only and viem-first, so
// most tutorials and StackOverflow answers don't apply to it — which matters
// when someone who has never written Solidity is debugging at 2am.

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

// `accounts` must tolerate a missing key: `npx hardhat test` needs no wallet,
// and it has to work for every teammate, not just whoever holds the funded one.
const sepoliaAccounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // RecordAnchored carries 9 arguments, 4 of them strings (2 stack slots
      // each in calldata), which overruns the EVM's 16-slot reachable stack
      // under the legacy codegen — "Stack too deep", even with the locals
      // scoped away. viaIR is the documented fix and costs only compile time
      // on a contract this small.
      //
      // The alternative was dropping `anchoredAt` from the event since the
      // block header already carries a timestamp, but that would force one
      // extra RPC round-trip per event when replaying a mine's history, which
      // is precisely the read path this design optimises for.
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: sepoliaAccounts,
    },
  },
  etherscan: {
    // Only needed for `hardhat verify`. Absent key just makes that one command
    // fail, it never blocks compile/test/deploy.
    apiKey: { sepolia: process.env.ETHERSCAN_API_KEY || "" },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};
