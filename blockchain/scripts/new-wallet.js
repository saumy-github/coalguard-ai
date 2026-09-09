/**
 * Generates a fresh throwaway wallet for anchoring.
 *
 *   npm run chain:new-wallet
 *
 * Why a generator script rather than "reuse a key you already have": the same
 * private key controls the same address on EVERY EVM chain, mainnet included.
 * A personal MetaMask key pasted into a .env and then shown in a screen-share
 * or committed by accident is the classic incident. This wallet exists to hold
 * valueless Sepolia test ETH and nothing else.
 *
 * Prints to stdout only — deliberately does NOT write .env for you, so the key
 * never lands in a file you didn't choose.
 */
const { ethers } = require("hardhat");

async function main() {
  const wallet = ethers.Wallet.createRandom();

  console.log("\nFresh throwaway wallet — Sepolia test ETH only:\n");
  console.log(`  address     : ${wallet.address}`);
  console.log(`  private key : ${wallet.privateKey}`);
  console.log(`\nNext:`);
  console.log(`  1. Put the private key in blockchain/.env as ANCHOR_PRIVATE_KEY`);
  console.log(`  2. Fund the address at https://cloud.google.com/application/web3/faucet/ethereum/sepolia`);
  console.log(`     (faucets ration per 24h — claim the day before a demo, not the morning of)`);
  console.log(`  3. npm run chain:deploy:sepolia`);
  console.log(`\nNEVER send real ETH to this address.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
