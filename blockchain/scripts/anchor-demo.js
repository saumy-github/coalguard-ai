/**
 * Writes one throwaway anchor straight from Hardhat, with no Python service in
 * the loop. Its job is to prove — at the end of Phase 2, before any service
 * exists — that the deployed contract, the funded wallet and the granted role
 * all actually work together, and to produce the first RecordAnchored event on
 * the Etherscan "Events" tab.
 *
 *   npm run anchor:demo
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;

  const address = process.env.CONTRACT_ADDRESS || readDeployment(network.name)?.address;
  if (!address) throw new Error(`No deployment found for network "${network.name}".`);

  const [signer] = await ethers.getSigners();
  const ledger = await ethers.getContractAt("AuditLedger", address);

  const role = await ledger.ANCHORER_ROLE();
  if (!(await ledger.hasRole(role, signer.address))) {
    throw new Error(
      `${signer.address} does not hold ANCHORER_ROLE on ${address}. ` +
        `Run: ANCHORER_ADDRESS=${signer.address} npm run grant:anchorer`
    );
  }

  // Unique per run so a re-run never trips the AlreadyAnchored guard.
  const recordId = `demo-${Date.now()}`;
  const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(`demo payload ${recordId}`));

  console.log(`contract : ${address}`);
  console.log(`signer   : ${signer.address}`);
  console.log(`record   : demo/${recordId}`);
  console.log(`hash     : ${payloadHash}`);

  const tx = await ledger.anchor("demo", recordId, "demo-mine", payloadHash);
  console.log(`\nanchoring… tx ${tx.hash}`);
  const receipt = await tx.wait();

  const [found, version, , count] = await ledger.verify("demo", recordId, payloadHash);

  console.log(`\n✓ anchored in block ${receipt.blockNumber} (gas ${receipt.gasUsed})`);
  console.log(`  verify() → found=${found} version=${version} anchorCount=${count}`);
  if (network.name === "sepolia") {
    console.log(`  tx       : https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log(`  events   : https://sepolia.etherscan.io/address/${address}#events`);
  }
}

function readDeployment(networkName) {
  const p = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
