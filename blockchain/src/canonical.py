"""
Canonical byte encoding for audit-ledger payloads.
==================================================

╔══════════════════════════════════════════════════════════════════════════╗
║  THIS MODULE IS FROZEN.                                                  ║
║                                                                          ║
║  Every anchor ever written to the chain was produced by this exact code.  ║
║  Changing how bytes are produced changes every hash, which makes every    ║
║  historical anchor fail verification — and a failed verification is       ║
║  indistinguishable from real tampering. That is the one failure this      ║
║  whole feature exists to detect, so breaking it here is worse than not    ║
║  shipping the feature at all.                                            ║
║                                                                          ║
║  To change WHAT is hashed, add a new projection in the backend and bump   ║
║  payload_version. Never edit the encoding below.                          ║
╚══════════════════════════════════════════════════════════════════════════╝

The seam
--------
The backend owns *which* fields go in (the projection); this module owns *how*
those fields become bytes (the encoding). Keeping them apart matters because
the realistic failure is field-set drift — someone adds `escalation_history` to
Ticket in November, and if the projection were an exclude-list every historical
anchor would silently start failing. Projections are therefore include-lists,
frozen, and versioned.

The envelope
------------
The payload is never hashed bare. It is wrapped with its type, id, mine and
version first, so an anchor proving record A cannot be replayed as proof for
record B (domain separation).

Note on the JSON dialect: this is JCS-*like*, not RFC 8785. Python sorts dict
keys by code point where JCS sorts by UTF-16 code unit; the two differ only for
non-BMP characters, and our keys are ASCII field names. Called out so nobody
later assumes strict RFC 8785 interop.
"""

from __future__ import annotations

import hashlib
import json
import unicodedata
from datetime import datetime, timezone
from typing import Any

try:  # pragma: no cover - bson is always present via pymongo in this service
    from bson import ObjectId
except ImportError:  # pragma: no cover
    ObjectId = None  # type: ignore[assignment]


class CanonicalizationError(TypeError):
    """A value could not be encoded deterministically.

    Always raised rather than falling back to str(x): a silent fallback means a
    type change upstream quietly changes the hash, which surfaces months later
    as an unexplainable verification failure.
    """


# Domain tag. Bound into every digest so a hash produced by this system can
# never collide with, or be mistaken for, a hash produced by anything else.
DOMAIN_TAG = b"coalguard-audit-ledger/v1\n"


def _canonicalize(value: Any, *, path: str = "$") -> Any:
    """Recursively rewrite `value` into a JSON-safe, deterministic shape.

    Every rule here exists because of a specific way hashes silently diverge.
    """
    # bool BEFORE int — isinstance(True, int) is True in Python, so checking
    # int first would encode True as 1 and make {"a": true} and {"a": 1}
    # produce identical hashes.
    if isinstance(value, bool):
        return value

    if value is None:
        # Kept, never dropped. Dropping nulls would make "unassigned this
        # ticket" (assignee -> None) invisible to the ledger.
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        # No float may ever be hashed. Binary floats have platform- and
        # repr-dependent decimal forms; 0.1 + 0.2 is the classic case.
        # Quantise upstream to a string instead (lat/lng 7dp, tonnage 3dp).
        raise CanonicalizationError(
            f"float at {path}: quantise to a string upstream "
            f"(e.g. f'{{value:.7f}}') — floats are never hash-stable"
        )

    if isinstance(value, str):
        # NFC: Devanagari and accented Latin have multiple byte encodings for
        # visually and semantically identical text. "क़" composed vs decomposed
        # must not produce two different hashes.
        return unicodedata.normalize("NFC", value)

    if isinstance(value, datetime):
        if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
            # A naive datetime in an Indian deployment is a silent 5.5h error.
            raise CanonicalizationError(
                f"naive datetime at {path}: attach tzinfo (UTC) before hashing"
            )
        # Truncate to milliseconds. THE most likely silent killer in this file:
        # BSON stores millisecond precision, Python datetimes carry
        # microseconds. Hash at anchor time with microseconds, read the value
        # back from Mongo at verify time with them truncated, and every single
        # verification fails forever with no visible cause.
        utc = value.astimezone(timezone.utc)
        millis = utc.microsecond // 1000
        return f"{utc.strftime('%Y-%m-%dT%H:%M:%S')}.{millis:03d}Z"

    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                # An int key 1 would serialise to "1" and silently collide with
                # a genuine string key "1".
                raise CanonicalizationError(
                    f"non-string dict key {key!r} at {path}: keys must be str"
                )
            out[unicodedata.normalize("NFC", key)] = _canonicalize(
                item, path=f"{path}.{key}"
            )
        return out

    if isinstance(value, (list, tuple)):
        # Order preserved, never sorted: order is semantic for comments,
        # escalation_history and every other append-only list.
        return [_canonicalize(item, path=f"{path}[{i}]") for i, item in enumerate(value)]

    if isinstance(value, (set, frozenset)):
        raise CanonicalizationError(
            f"set at {path}: sets have no defined order — use a sorted list"
        )

    if isinstance(value, (bytes, bytearray)):
        raise CanonicalizationError(
            f"bytes at {path}: not projectable — hash or base64 upstream"
        )

    raise CanonicalizationError(f"unsupported type {type(value).__name__} at {path}")


def canonical_bytes(
    *,
    record_type: str,
    record_id: str,
    mine_id: str,
    payload_version: int,
    payload: dict[str, Any],
) -> bytes:
    """Produce the exact bytes that get hashed for a record.

    Deterministic across processes, machines and Python versions for any input
    that survives `_canonicalize`.
    """
    if not isinstance(payload, dict):
        raise CanonicalizationError(f"payload must be a dict, got {type(payload).__name__}")

    envelope = {
        "v": int(payload_version),
        "type": record_type,
        "id": record_id,
        "mine": mine_id,
        "payload": payload,
    }

    body = json.dumps(
        _canonicalize(envelope),
        sort_keys=True,            # key order in the source dict is irrelevant
        separators=(",", ":"),     # no incidental whitespace
        ensure_ascii=False,        # real UTF-8, paired with NFC above
        allow_nan=False,           # NaN/Infinity are not valid JSON anyway
    ).encode("utf-8")

    return DOMAIN_TAG + body


def payload_hash(
    *,
    record_type: str,
    record_id: str,
    mine_id: str,
    payload_version: int,
    payload: dict[str, Any],
) -> str:
    """SHA-256 of `canonical_bytes`, as an 0x-prefixed 32-byte hex string.

    0x-prefixed because it goes straight into a Solidity bytes32 argument.
    """
    digest = hashlib.sha256(
        canonical_bytes(
            record_type=record_type,
            record_id=record_id,
            mine_id=mine_id,
            payload_version=payload_version,
            payload=payload,
        )
    ).hexdigest()
    return f"0x{digest}"
