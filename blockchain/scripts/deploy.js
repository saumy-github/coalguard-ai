/**
 * Deploys AuditLedger and writes deployments/<network>.json.
 *
 * `deployedAtBlock` in that file is load-bearing, not decoration: it is the
 * `fromBlock` for every eth_getLogs event replay. Without it you scan from
 * genesis and public RPC providers reject the request outright.
 *
 *   npm run deploy:sepolia
 *   npm run deploy:localhost
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY  required for a real network
 *   ANCHORER_ADDRESS      hot wallet granted ANCHORER_ROLE; defaults to the
 *                         deployer, so splitting the two later is a config
 *                         change rather than a code change.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No signer available. Set DEPLOYER_PRIVATE_KEY in blockchain/.env before deploying."
    );
  }

  const anchorer = process.env.ANCHORER_ADDRESS || deployer.address;

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`network   : ${network.name} (chainId ${network.config.chainId})`);
  console.log(`deployer  : ${deployer.address}`);
  console.log(`balance   : ${ethers.formatEther(balance)} ETH`);
  console.log(`anchorer  : ${anchorer}${anchorer === deployer.address ? "  (= deployer)" : ""}`);

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 ETH. Claim Sepolia test ETH from https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
    );
  }

  const Factory = await ethers.getContractFactory("AuditLedger");
  const ledger = await Factory.deploy(deployer.address, anchorer);
  console.log(`\ndeploying… tx ${ledger.deploymentTransaction().hash}`);
  await ledger.waitForDeployment();

  const address = await ledger.getAddress();
  const receipt = await ledger.deploymentTransaction().wait();

  const record = {
    chainId: Number(network.config.chainId),
    network: network.name,
    address,
    deployedAtBlock: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
    txHash: receipt.hash,
    deployer: deployer.address,
    anchorer,
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + "\n");

  console.log(`\n✓ AuditLedger deployed`);
  console.log(`  address        : ${address}`);
  console.log(`  block          : ${receipt.blockNumber}`);
  console.log(`  record         : ${path.relative(process.cwd(), outPath)}`);
  if (network.name === "sepolia") {
    console.log(`  etherscan      : https://sepolia.etherscan.io/address/${address}`);
    console.log(`\nNext:`);
    console.log(`  npm run export:abi`);
    console.log(`  npx hardhat verify --network sepolia ${address} ${deployer.address} ${anchorer}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
