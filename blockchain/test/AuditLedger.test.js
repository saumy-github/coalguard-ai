const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const HASH_A = ethers.keccak256(ethers.toUtf8Bytes("payload-a"));
const HASH_B = ethers.keccak256(ethers.toUtf8Bytes("payload-b"));
const HASH_C = ethers.keccak256(ethers.toUtf8Bytes("payload-c"));
const ZERO32 = "0x" + "00".repeat(32);

describe("AuditLedger", function () {
  async function deploy() {
    const [admin, anchorer, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AuditLedger");
    const ledger = await Factory.deploy(admin.address, anchorer.address);
    await ledger.waitForDeployment();
    return { ledger, admin, anchorer, outsider };
  }

  // ─── The encodePacked guard ───────────────────────────────────────────────
  // This is the single most important test in the suite. It permanently blocks
  // anyone "optimising" abi.encode back to abi.encodePacked, which would let
  // two different records collide onto one key and silently share anchors.
  describe("key derivation", function () {
    it("distinguishes ambiguous recordType/recordId splits", async function () {
      const { ledger } = await loadFixture(deploy);

      const k1 = await ledger.recordKeyOf("ticket", "a|b");
      const k2 = await ledger.recordKeyOf("ticket|a", "b");

      expect(k1).to.not.equal(k2);
    });

    it("keeps distinct records separate even when concatenations match", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "a|b", "mine-1", HASH_A);
      await as.anchor("ticket|a", "b", "mine-1", HASH_B);

      expect(await ledger.anchorCount("ticket", "a|b")).to.equal(1);
      expect(await ledger.anchorCount("ticket|a", "b")).to.equal(1);

      const [foundA] = await ledger.verify("ticket", "a|b", HASH_A);
      const [crossTalk] = await ledger.verify("ticket", "a|b", HASH_B);
      expect(foundA).to.equal(true);
      expect(crossTalk).to.equal(false);
    });

    it("derives recordKey identically to off-chain abi.encode", async function () {
      const { ledger } = await loadFixture(deploy);
      const onChain = await ledger.recordKeyOf("mine", "abc123");
      const offChain = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["string", "string"], ["mine", "abc123"])
      );
      expect(onChain).to.equal(offChain);
    });
  });

  // ─── Anchoring ────────────────────────────────────────────────────────────
  describe("anchor", function () {
    it("records the first anchor as version 0 and emits plaintext identity", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);

      await expect(ledger.connect(anchorer).anchor("mine", "m1", "mine-1", HASH_A))
        .to.emit(ledger, "RecordAnchored")
        .withArgs(
          await ledger.recordKeyOf("mine", "m1"),
          await ledger.mineKeyOf("mine-1"),
          HASH_A,
          0,
          (v) => v > 0n, // anchoredAt — block timestamp, exact value irrelevant
          anchorer.address,
          "mine",
          "m1",
          "mine-1"
        );

      expect(await ledger.anchorCount("mine", "m1")).to.equal(1);
    });

    it("appends versions rather than overwriting, preserving the lifecycle", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "t1", "mine-1", HASH_A);
      await as.anchor("ticket", "t1", "mine-1", HASH_B);
      await as.anchor("ticket", "t1", "mine-1", HASH_C);

      expect(await ledger.anchorCount("ticket", "t1")).to.equal(3);

      // Every historical state remains provable, not just the current one.
      const all = await ledger.getAnchors("ticket", "t1");
      expect(all.map((a) => a.payloadHash)).to.deep.equal([HASH_A, HASH_B, HASH_C]);
      expect(all.map((a) => Number(a.version))).to.deep.equal([0, 1, 2]);

      expect((await ledger.getLatestAnchor("ticket", "t1")).payloadHash).to.equal(HASH_C);
    });

    it("reverts AlreadyAnchored when re-anchoring the current latest", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "t1", "mine-1", HASH_A);

      await expect(as.anchor("ticket", "t1", "mine-1", HASH_A))
        .to.be.revertedWithCustomError(ledger, "AlreadyAnchored")
        .withArgs(await ledger.recordKeyOf("ticket", "t1"), 0);
    });

    it("allows re-anchoring an older hash — a record may legitimately cycle back", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      // open -> in_progress -> open again
      await as.anchor("ticket", "t1", "mine-1", HASH_A);
      await as.anchor("ticket", "t1", "mine-1", HASH_B);
      await expect(as.anchor("ticket", "t1", "mine-1", HASH_A)).to.not.be.reverted;

      expect(await ledger.anchorCount("ticket", "t1")).to.equal(3);
    });

    it("rejects empty identifiers and a zero hash", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await expect(as.anchor("", "t1", "mine-1", HASH_A)).to.be.revertedWithCustomError(
        ledger,
        "EmptyRecordType"
      );
      await expect(as.anchor("ticket", "", "mine-1", HASH_A)).to.be.revertedWithCustomError(
        ledger,
        "EmptyRecordId"
      );
      await expect(as.anchor("ticket", "t1", "mine-1", ZERO32)).to.be.revertedWithCustomError(
        ledger,
        "ZeroPayloadHash"
      );
    });

    it("handles a non-ASCII mineId (Devanagari) without corruption", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const mineId = "कोयला-खदान-७";

      await ledger.connect(anchorer).anchor("mine", "m1", mineId, HASH_A);

      expect(await ledger.mineRecordCount(mineId)).to.equal(1);
      const keys = await ledger.getRecordKeysByMine(mineId, 0, 10);
      expect(keys[0]).to.equal(await ledger.recordKeyOf("mine", "m1"));
    });
  });

  // ─── Access control ───────────────────────────────────────────────────────
  describe("access control", function () {
    it("rejects an anchor from an address without ANCHORER_ROLE", async function () {
      const { ledger, outsider } = await loadFixture(deploy);

      await expect(ledger.connect(outsider).anchor("mine", "m1", "mine-1", HASH_A))
        .to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount")
        .withArgs(outsider.address, await ledger.ANCHORER_ROLE());
    });

    it("lets admin grant and revoke the anchorer role", async function () {
      const { ledger, admin, outsider } = await loadFixture(deploy);
      const role = await ledger.ANCHORER_ROLE();

      await ledger.connect(admin).grantRole(role, outsider.address);
      await expect(ledger.connect(outsider).anchor("mine", "m1", "mine-1", HASH_A)).to.not.be
        .reverted;

      await ledger.connect(admin).revokeRole(role, outsider.address);
      await expect(
        ledger.connect(outsider).anchor("mine", "m2", "mine-1", HASH_B)
      ).to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount");
    });

    it("does not let a non-admin grant roles", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      await expect(
        ledger.connect(outsider).grantRole(await ledger.ANCHORER_ROLE(), outsider.address)
      ).to.be.revertedWithCustomError(ledger, "AccessControlUnauthorizedAccount");
    });
  });

  // ─── verify() ─────────────────────────────────────────────────────────────
  describe("verify", function () {
    it("returns found=false WITHOUT reverting for a wrong hash", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      await ledger.connect(anchorer).anchor("mine", "m1", "mine-1", HASH_A);

      const [found, , , count] = await ledger.verify("mine", "m1", HASH_B);
      expect(found).to.equal(false);
      expect(count).to.equal(1); // anchors exist, this hash isn't one => TAMPERED
    });

    it("returns anchorCount=0 for a record that was never anchored", async function () {
      const { ledger } = await loadFixture(deploy);

      const [found, , , count] = await ledger.verify("mine", "never", HASH_A);
      expect(found).to.equal(false);
      expect(count).to.equal(0); // => NOT_ANCHORED, which is not proof of tampering
    });

    it("distinguishes the latest version from a stale one", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "t1", "mine-1", HASH_A);
      await as.anchor("ticket", "t1", "mine-1", HASH_B);

      // Latest => VERIFIED
      const [foundLatest, versionLatest, , countLatest] = await ledger.verify(
        "ticket",
        "t1",
        HASH_B
      );
      expect(foundLatest).to.equal(true);
      expect(versionLatest).to.equal(1);
      expect(versionLatest).to.equal(countLatest - 1n);

      // Older => STALE, a completely different finding from tampering
      const [foundOld, versionOld, , countOld] = await ledger.verify("ticket", "t1", HASH_A);
      expect(foundOld).to.equal(true);
      expect(versionOld).to.equal(0);
      expect(versionOld).to.not.equal(countOld - 1n);
    });
  });

  // ─── Mine index ───────────────────────────────────────────────────────────
  describe("mine index", function () {
    it("lists each record once even when a record is anchored repeatedly", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "t1", "mine-1", HASH_A);
      await as.anchor("ticket", "t1", "mine-1", HASH_B); // same record again
      await as.anchor("ticket", "t1", "mine-1", HASH_C); // and again
      await as.anchor("ticket", "t2", "mine-1", HASH_A);
      await as.anchor("mine", "m1", "mine-1", HASH_A);

      // 3 distinct records, 5 anchors.
      expect(await ledger.mineRecordCount("mine-1")).to.equal(3);
    });

    it("keeps mines separate and paginates", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "t1", "mine-1", HASH_A);
      await as.anchor("ticket", "t2", "mine-1", HASH_A);
      await as.anchor("ticket", "t3", "mine-1", HASH_A);
      await as.anchor("ticket", "t9", "mine-2", HASH_A);

      expect(await ledger.mineRecordCount("mine-1")).to.equal(3);
      expect(await ledger.mineRecordCount("mine-2")).to.equal(1);

      expect((await ledger.getRecordKeysByMine("mine-1", 0, 2)).length).to.equal(2);
      expect((await ledger.getRecordKeysByMine("mine-1", 2, 2)).length).to.equal(1);
      // Past the end returns empty rather than reverting.
      expect((await ledger.getRecordKeysByMine("mine-1", 99, 2)).length).to.equal(0);
    });
  });

  // ─── Batch ────────────────────────────────────────────────────────────────
  describe("anchorBatch", function () {
    it("anchors many records in one transaction", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const items = [
        { recordType: "ticket", recordId: "t1", mineId: "mine-1", payloadHash: HASH_A },
        { recordType: "ticket", recordId: "t2", mineId: "mine-1", payloadHash: HASH_B },
        { recordType: "mine", recordId: "m1", mineId: "mine-1", payloadHash: HASH_C },
      ];

      await expect(ledger.connect(anchorer).anchorBatch(items)).to.not.be.reverted;

      expect(await ledger.anchorCount("ticket", "t1")).to.equal(1);
      expect(await ledger.anchorCount("ticket", "t2")).to.equal(1);
      expect(await ledger.mineRecordCount("mine-1")).to.equal(3);
    });

    it("rejects an empty batch and one over MAX_BATCH", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await expect(as.anchorBatch([])).to.be.revertedWithCustomError(ledger, "EmptyBatch");

      const max = Number(await ledger.MAX_BATCH());
      const tooMany = Array.from({ length: max + 1 }, (_, i) => ({
        recordType: "ticket",
        recordId: `t${i}`,
        mineId: "mine-1",
        payloadHash: HASH_A,
      }));
      await expect(as.anchorBatch(tooMany))
        .to.be.revertedWithCustomError(ledger, "BatchTooLarge")
        .withArgs(max + 1, max);
    });

    it("reverts the whole batch if any item is a duplicate", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      await as.anchor("ticket", "t1", "mine-1", HASH_A);

      await expect(
        as.anchorBatch([
          { recordType: "ticket", recordId: "t2", mineId: "mine-1", payloadHash: HASH_B },
          { recordType: "ticket", recordId: "t1", mineId: "mine-1", payloadHash: HASH_A },
        ])
      ).to.be.revertedWithCustomError(ledger, "AlreadyAnchored");

      // Atomic: the good item in the same batch did not land either.
      expect(await ledger.anchorCount("ticket", "t2")).to.equal(0);
    });
  });

  // ─── Gas ──────────────────────────────────────────────────────────────────
  describe("gas", function () {
    // A loose upper bound, not a benchmark. Its job is to fail loudly if
    // someone reintroduces string storage in the struct (~60-80k extra).
    it("keeps a first anchor under 200k gas", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);

      const tx = await ledger.connect(anchorer).anchor("ticket", "t1", "mine-1", HASH_A);
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lessThan(200_000n);
    });

    it("makes a subsequent anchor cheaper than the first", async function () {
      const { ledger, anchorer } = await loadFixture(deploy);
      const as = ledger.connect(anchorer);

      const first = await (await as.anchor("ticket", "t1", "mine-1", HASH_A)).wait();
      const second = await (await as.anchor("ticket", "t1", "mine-1", HASH_B)).wait();

      // The first also writes the mine index; the second must not.
      expect(second.gasUsed).to.be.lessThan(first.gasUsed);
    });
  });
});
