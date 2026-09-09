// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title  CoalGuard Audit Ledger
 * @notice Tamper-evidence anchors for CoalGuard records held in MongoDB.
 *
 *         Only the SHA-256 digest of a canonicalised projection of a record is
 *         written here — never the record. Records contain worker PII, GPS
 *         traces and photographic evidence; a hash reveals nothing about its
 *         input. The canonical form is defined by blockchain/src/canonical.py
 *         and is frozen: changing it invalidates every historical anchor.
 *
 *         The contract is deliberately generic over record type. Anchoring a
 *         new kind of CoalGuard record is a backend change, never a redeploy.
 *
 * @dev    Three design points that are load-bearing, documented so they are not
 *         "optimised" away later:
 *
 *         1. `abi.encode`, never `abi.encodePacked`, when deriving keys.
 *            encodePacked concatenates without length prefixes, so
 *            ("ticket", "a|b") and ("ticket|a", "b") hash to the SAME key.
 *            A separator character does not fix this. See the test named
 *            "distinguishes ambiguous recordType/recordId splits".
 *
 *         2. Identity strings live in events, not storage. The caller must
 *            already know recordType/recordId to derive the lookup key, so
 *            storing them again costs ~60-80k gas per anchor for nothing.
 *            Off-chain indexers read them from the event topics instead.
 *
 *         3. Anchors are an append-only array per record, not an overwrite.
 *            Overwrite proves only current state. The array proves the
 *            lifecycle — "this ticket was open/CRITICAL on 12 March, timestamped
 *            by Ethereum, so you cannot now claim it was always LOW."
 */
contract AuditLedger is AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────

    /// @notice Held by the service's hot wallet. Separate from the deploy key so
    ///         a leaked hot key can be revoked without redeploying.
    bytes32 public constant ANCHORER_ROLE = keccak256("ANCHORER_ROLE");

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev Packs into exactly two slots.
    ///      slot 0: payloadHash (256)
    ///      slot 1: anchoredAt (64) + anchoredBy (160) + version (32) = 256
    struct Anchor {
        bytes32 payloadHash;
        uint64 anchoredAt;
        address anchoredBy;
        uint32 version;
    }

    /// @dev recordKey => every anchor ever taken for that record, oldest first.
    mapping(bytes32 => Anchor[]) private _anchors;

    /// @dev mineKey => the recordKeys seen for that mine. Appended only on a
    ///      record's FIRST anchor, or a record anchored 3x would appear 3x.
    mapping(bytes32 => bytes32[]) private _mineRecords;

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * @notice The off-chain index. Carries the plaintext identity strings that
     *         storage deliberately omits, so `eth_getLogs` alone can reconstruct
     *         every record ever anchored — even if both MongoDB and the ledger
     *         service's own database are wiped.
     * @dev    `mineKey` is indexed as a second topic specifically so a regulator
     *         can filter by mine without scanning every log.
     */
    event RecordAnchored(
        bytes32 indexed recordKey,
        bytes32 indexed mineKey,
        bytes32 payloadHash,
        uint32 version,
        uint64 anchoredAt,
        address anchoredBy,
        string recordType,
        string recordId,
        string mineId
    );

    // ─── Errors ───────────────────────────────────────────────────────────────
    // Custom errors, not require strings: cheaper, and eth_estimateGas returns
    // the 4-byte selector so the off-chain worker can classify a revert as
    // terminal without ever spending gas on it.

    error EmptyRecordType();
    error EmptyRecordId();
    error ZeroPayloadHash();
    error AlreadyAnchored(bytes32 recordKey, uint32 version);
    error EmptyBatch();
    error BatchTooLarge(uint256 given, uint256 max);

    /// @notice Bounded so one transaction cannot exceed the block gas limit.
    ///         The reason for batching is latency, not gas: 20 serial anchors
    ///         cost 20 x ~12s of block time, one batch costs ~12s.
    uint256 public constant MAX_BATCH = 50;

    // ─── Construction ─────────────────────────────────────────────────────────

    /**
     * @param admin    Holds DEFAULT_ADMIN_ROLE — can grant/revoke anchorers.
     * @param anchorer The service hot wallet. Pass the deployer to collapse the
     *                 two, but keeping them separate is a config change here
     *                 rather than a code change later.
     */
    constructor(address admin, address anchorer) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ANCHORER_ROLE, anchorer);
    }

    // ─── Key derivation ───────────────────────────────────────────────────────

    /// @notice Deterministic on-chain key for a record. Pure, so off-chain code
    ///         can derive it identically without a call.
    function recordKeyOf(string calldata recordType, string calldata recordId)
        public
        pure
        returns (bytes32)
    {
        // abi.encode (NOT encodePacked) — see the contract-level @dev note.
        return keccak256(abi.encode(recordType, recordId));
    }

    function mineKeyOf(string calldata mineId) public pure returns (bytes32) {
        return keccak256(abi.encode(mineId));
    }

    // ─── Anchoring ────────────────────────────────────────────────────────────

    /**
     * @notice Append a new anchor for a record.
     * @dev    Reverts `AlreadyAnchored` if payloadHash equals the CURRENT latest
     *         — idempotency is a property of the contract, not of a mutable
     *         database, which is the entire thesis of this feature. Note it
     *         compares only against the latest: a record legitimately cycling
     *         open -> in_progress -> open must be able to re-anchor an earlier
     *         hash, so this is deliberately not a uniqueness constraint over
     *         all history.
     * @return version The 0-based index of the anchor just written.
     */
    function anchor(
        string calldata recordType,
        string calldata recordId,
        string calldata mineId,
        bytes32 payloadHash
    ) external onlyRole(ANCHORER_ROLE) returns (uint32 version) {
        return _anchor(recordType, recordId, mineId, payloadHash);
    }

    struct AnchorInput {
        string recordType;
        string recordId;
        string mineId;
        bytes32 payloadHash;
    }

    function anchorBatch(AnchorInput[] calldata items)
        external
        onlyRole(ANCHORER_ROLE)
        returns (uint32[] memory versions)
    {
        uint256 n = items.length;
        if (n == 0) revert EmptyBatch();
        if (n > MAX_BATCH) revert BatchTooLarge(n, MAX_BATCH);

        versions = new uint32[](n);
        for (uint256 i = 0; i < n; ++i) {
            versions[i] = _anchor(
                items[i].recordType,
                items[i].recordId,
                items[i].mineId,
                items[i].payloadHash
            );
        }
    }

    function _anchor(
        string calldata recordType,
        string calldata recordId,
        string calldata mineId,
        bytes32 payloadHash
    ) private returns (uint32 version) {
        if (bytes(recordType).length == 0) revert EmptyRecordType();
        if (bytes(recordId).length == 0) revert EmptyRecordId();
        if (payloadHash == bytes32(0)) revert ZeroPayloadHash();

        bytes32 key = keccak256(abi.encode(recordType, recordId));
        uint64 ts = uint64(block.timestamp);

        // Scoped so `history` and `n` are released before the emit below.
        // The event takes 9 arguments, 4 of them calldata strings (2 stack
        // slots each), which overruns the EVM's 16-slot reachable stack if
        // these locals are still live — "Stack too deep". Keeping the block
        // avoids having to turn on viaIR, which would slow every compile.
        {
            Anchor[] storage history = _anchors[key];
            uint256 n = history.length;

            if (n > 0 && history[n - 1].payloadHash == payloadHash) {
                revert AlreadyAnchored(key, uint32(n - 1));
            }

            version = uint32(n);

            history.push(
                Anchor({
                    payloadHash: payloadHash,
                    anchoredAt: ts,
                    anchoredBy: msg.sender,
                    version: version
                })
            );

            // First anchor only, or a record anchored 3x is listed 3x for its mine.
            if (n == 0) {
                _mineRecords[keccak256(abi.encode(mineId))].push(key);
            }
        }

        emit RecordAnchored(
            key,
            keccak256(abi.encode(mineId)),
            payloadHash,
            version,
            ts,
            msg.sender,
            recordType,
            recordId,
            mineId
        );
    }

    // ─── Verification ─────────────────────────────────────────────────────────

    /**
     * @notice Check a hash against a record's anchor history.
     * @dev    Never reverts — a verifier that throws on "not found" forces the
     *         caller to treat an absent record and an RPC failure identically,
     *         and those are completely different findings.
     * @return found       True if `payloadHash` matches ANY anchored version.
     * @return version     The matching version (meaningless when !found).
     * @return anchoredAt  Block timestamp of the match (0 when !found).
     * @return totalAnchors Total anchors for this record. Returned so the caller
     *                      can tell "matches the latest" (VERIFIED) from
     *                      "matches an older version" (STALE) — without this,
     *                      a stale copy is indistinguishable from tampering.
     *                      Named `totalAnchors` rather than `anchorCount` only
     *                      to avoid shadowing the anchorCount() getter below.
     */
    function verify(
        string calldata recordType,
        string calldata recordId,
        bytes32 payloadHash
    )
        external
        view
        returns (bool found, uint32 version, uint64 anchoredAt, uint32 totalAnchors)
    {
        Anchor[] storage history = _anchors[keccak256(abi.encode(recordType, recordId))];
        totalAnchors = uint32(history.length);

        // Newest first: the common case is verifying the current version.
        for (uint256 i = history.length; i > 0; --i) {
            if (history[i - 1].payloadHash == payloadHash) {
                return (true, history[i - 1].version, history[i - 1].anchoredAt, totalAnchors);
            }
        }
        return (false, 0, 0, totalAnchors);
    }

    // ─── Reads ────────────────────────────────────────────────────────────────

    function anchorCount(string calldata recordType, string calldata recordId)
        external
        view
        returns (uint256)
    {
        return _anchors[keccak256(abi.encode(recordType, recordId))].length;
    }

    function getAnchor(string calldata recordType, string calldata recordId, uint256 index)
        external
        view
        returns (Anchor memory)
    {
        return _anchors[keccak256(abi.encode(recordType, recordId))][index];
    }

    function getAnchors(string calldata recordType, string calldata recordId)
        external
        view
        returns (Anchor[] memory)
    {
        return _anchors[keccak256(abi.encode(recordType, recordId))];
    }

    function getLatestAnchor(string calldata recordType, string calldata recordId)
        external
        view
        returns (Anchor memory)
    {
        Anchor[] storage history = _anchors[keccak256(abi.encode(recordType, recordId))];
        return history[history.length - 1];
    }

    function mineRecordCount(string calldata mineId) external view returns (uint256) {
        return _mineRecords[keccak256(abi.encode(mineId))].length;
    }

    /// @notice Paginated so a mine with thousands of records can still be read
    ///         by an RPC provider that caps response size.
    function getRecordKeysByMine(string calldata mineId, uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory keys)
    {
        bytes32[] storage all = _mineRecords[keccak256(abi.encode(mineId))];
        if (offset >= all.length) return new bytes32[](0);

        uint256 end = offset + limit;
        if (end > all.length) end = all.length;

        keys = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            keys[i - offset] = all[i];
        }
    }
}
