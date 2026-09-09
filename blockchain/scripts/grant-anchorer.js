/**
 * Grants ANCHORER_ROLE to an address on an already-deployed AuditLedger.
 *
 * Needed whenever the service's hot wallet changes, or after a redeploy where
 * the anchorer differs from the deployer. Getting this wrong presents as every
 * anchor transaction reverting for no visible reason, which is why the service
 * checks `hasRole` in /health rather than waiting to discover it at runtime.
 *
 *   ANCHORER_ADDRESS=0x… npm run grant:anchorer
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;

  const anchorer = process.env.ANCHORER_ADDRESS;
  if (!anchorer) throw new Error("Set ANCHORER_ADDRESS to the address to grant.");
  if (!ethers.isAddress(anchorer)) throw new Error(`Not an address: ${anchorer}`);

  const address =
    process.env.CONTRACT_ADDRESS || readDeployment(network.name)?.address;
  if (!address) {
    throw new Error(
      `No contract address. Set CONTRACT_ADDRESS or deploy first (deployments/${network.name}.json).`
    );
  }

  const ledger = await ethers.getContractAt("AuditLedger", address);
  const role = await ledger.ANCHORER_ROLE();

  if (await ledger.hasRole(role, anchorer)) {
    console.log(`✓ ${anchorer} already holds ANCHORER_ROLE — nothing to do.`);
    return;
  }

  const tx = await ledger.grantRole(role, anchorer);
  console.log(`granting… tx ${tx.hash}`);
  await tx.wait();

  console.log(`✓ ANCHORER_ROLE granted to ${anchorer} on ${address}`);
}

function readDeployment(networkName) {
  const p = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
