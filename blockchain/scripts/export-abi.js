/**
 * Writes abi/AuditLedger.json — the trimmed {"abi": [...]} the Python service
 * reads at runtime.
 *
 * Committed, not built in the Docker image, so a fresh clone + `docker compose
 * up` works with zero Node installed — the same promise SETUP.md already makes
 * about not needing Python locally.
 *
 * Trimmed rather than copying Hardhat's artifact because that file embeds
 * bytecode, which churns on every compile and would make the ABI look modified
 * in `git status` constantly.
 *
 *   npm run export:abi     write it
 *   npm run check:abi      fail if the committed copy is stale (run in CI/tests)
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const OUT_PATH = path.join(__dirname, "..", "abi", "AuditLedger.json");

async function main() {
  const checkOnly = process.argv.includes("--check");

  await hre.run("compile");
  const artifact = await hre.artifacts.readArtifact("AuditLedger");
  const next = JSON.stringify({ abi: artifact.abi }, null, 2) + "\n";

  if (checkOnly) {
    if (!fs.existsSync(OUT_PATH)) {
      console.error("✗ abi/AuditLedger.json is missing. Run: npm run export:abi");
      process.exit(1);
    }
    const current = fs.readFileSync(OUT_PATH, "utf8");
    if (current !== next) {
      console.error("✗ abi/AuditLedger.json is stale. Run: npm run export:abi");
      process.exit(1);
    }
    console.log("✓ abi/AuditLedger.json matches the compiled contract");
    return;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, next);
  console.log(`✓ wrote ${path.relative(process.cwd(), OUT_PATH)} (${artifact.abi.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
