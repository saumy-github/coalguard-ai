"""
Tests for the frozen canonical encoder.

This is the one place in the repo with a real test framework, and the
justification is narrow: every other part of this codebase is verifiable by
reading it or by curling an endpoint, but a canonicalisation bug is invisible
until months later, when a hash mismatches and you cannot tell whether it is
your bug or actual tampering. That ambiguity is exactly what the ledger exists
to remove, so it has to be pinned down by tests.

    docker compose exec blockchain pytest
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

import bson
import pytest

from src.canonical import (
    DOMAIN_TAG,
    CanonicalizationError,
    canonical_bytes,
    payload_hash,
)

IST = timezone(timedelta(hours=5, minutes=30))


def envelope(payload, *, record_type="mine", record_id="m1", mine_id="mine-1", version=1):
    return {
        "record_type": record_type,
        "record_id": record_id,
        "mine_id": mine_id,
        "payload_version": version,
        "payload": payload,
    }


# ── The BSON round-trip: the single highest-value assertion here ─────────────
# Proves the millisecond-truncation trap is handled. Without the truncation in
# canonical.py, hashing a datetime with microseconds and then re-hashing the
# same document after a Mongo round-trip (which silently drops to ms) produces
# two different digests — and every verification fails forever, looking exactly
# like tampering.
#
# codec_options=tz_aware is not incidental here — it is the real production
# requirement this test exists to pin down. Raw pymongo/bson decodes BSON
# datetimes as NAIVE by default (BSON stores UTC millis with no tz field), and
# canonical.py correctly REJECTS naive datetimes (see
# test_naive_datetime_raises below). That means the service's Motor client
# MUST be constructed with tz_aware=True — see src/db.py — or building a
# payload from any real document containing a datetime raises
# CanonicalizationError on every single anchor attempt.
BSON_CODEC = bson.CodecOptions(tz_aware=True, tzinfo=timezone.utc)


def test_survives_a_bson_round_trip():
    doc = envelope(
        {
            "name": "Jharia Block 4",
            "opened_at": datetime(2026, 3, 12, 9, 30, 15, 123456, tzinfo=timezone.utc),
            "active": True,
            "seam_count": 7,
            "operator": None,
        }
    )

    before = canonical_bytes(**doc)

    round_tripped = dict(doc)
    round_tripped["payload"] = bson.decode(
        bson.encode(doc["payload"], codec_options=BSON_CODEC), codec_options=BSON_CODEC
    )
    after = canonical_bytes(**round_tripped)

    assert before == after


def test_microsecond_difference_within_the_same_millisecond_is_ignored():
    a = envelope({"t": datetime(2026, 3, 12, 9, 30, 15, 123000, tzinfo=timezone.utc)})
    b = envelope({"t": datetime(2026, 3, 12, 9, 30, 15, 123999, tzinfo=timezone.utc)})
    assert canonical_bytes(**a) == canonical_bytes(**b)


def test_different_milliseconds_still_differ():
    a = envelope({"t": datetime(2026, 3, 12, 9, 30, 15, 123000, tzinfo=timezone.utc)})
    b = envelope({"t": datetime(2026, 3, 12, 9, 30, 15, 124000, tzinfo=timezone.utc)})
    assert canonical_bytes(**a) != canonical_bytes(**b)


# ── Timezone handling ────────────────────────────────────────────────────────
def test_same_instant_in_a_different_timezone_hashes_identically():
    utc = datetime(2026, 3, 12, 4, 0, 15, tzinfo=timezone.utc)
    ist = utc.astimezone(IST)  # 09:30:15 +05:30 — same instant, different clock
    assert ist.hour == 9 and ist.minute == 30

    assert canonical_bytes(**envelope({"t": utc})) == canonical_bytes(**envelope({"t": ist}))


def test_naive_datetime_raises():
    # A naive datetime in an Indian deployment is a silent 5.5-hour error.
    with pytest.raises(CanonicalizationError, match="naive datetime"):
        canonical_bytes(**envelope({"t": datetime(2026, 3, 12, 9, 30, 15)}))


# ── Type discipline ──────────────────────────────────────────────────────────
def test_bool_is_not_int():
    # isinstance(True, int) is True in Python; dispatching int first would make
    # these two identical.
    assert canonical_bytes(**envelope({"a": True})) != canonical_bytes(**envelope({"a": 1}))


def test_null_is_not_absent():
    # Dropping nulls would make un-assigning a field invisible to the ledger.
    assert canonical_bytes(**envelope({"a": None})) != canonical_bytes(**envelope({}))


def test_float_raises_with_actionable_guidance():
    with pytest.raises(CanonicalizationError, match="quantise to a string"):
        canonical_bytes(**envelope({"lat": 23.6739}))


def test_quantised_float_string_is_accepted():
    assert canonical_bytes(**envelope({"lat": f"{23.6739:.7f}"}))


def test_set_and_bytes_raise():
    with pytest.raises(CanonicalizationError, match="sets have no defined order"):
        canonical_bytes(**envelope({"a": {1, 2}}))
    with pytest.raises(CanonicalizationError, match="not projectable"):
        canonical_bytes(**envelope({"a": b"\x00\x01"}))


def test_unsupported_type_raises_rather_than_stringifying():
    class Custom:
        def __str__(self):
            return "custom"

    with pytest.raises(CanonicalizationError, match="unsupported type Custom"):
        canonical_bytes(**envelope({"a": Custom()}))


def test_non_string_dict_key_raises():
    # An int key 1 would serialise to "1" and collide with a real "1" key.
    with pytest.raises(CanonicalizationError, match="non-string dict key"):
        canonical_bytes(**envelope({"nested": {1: "a"}}))


def test_objectid_is_encoded_as_its_hex_string():
    oid = bson.ObjectId()
    assert canonical_bytes(**envelope({"id": oid})) == canonical_bytes(
        **envelope({"id": str(oid)})
    )


# ── Structural rules ─────────────────────────────────────────────────────────
def test_key_order_is_irrelevant():
    a = envelope({"alpha": 1, "beta": 2, "gamma": 3})
    b = envelope({"gamma": 3, "alpha": 1, "beta": 2})
    assert canonical_bytes(**a) == canonical_bytes(**b)


def test_list_order_is_significant():
    # Order is semantic for comments / escalation_history.
    a = envelope({"events": ["opened", "escalated"]})
    b = envelope({"events": ["escalated", "opened"]})
    assert canonical_bytes(**a) != canonical_bytes(**b)


def test_nfc_normalisation_makes_equivalent_text_equal():
    # \u escapes, not literal glyphs, in the source: a tool pass touching
    # this file could silently NFC-normalise literal Unicode text, which
    # would collapse "composed" and "decomposed" to identical bytes as
    # PYTHON SOURCE and let this test pass even with normalisation removed
    # from canonical.py entirely. Escapes are unambiguous ASCII regardless
    # of what touches this file afterward.
    composed = "\u0958"          # DEVANAGARI LETTER QA, one precomposed codepoint
    decomposed = "\u0915\u093c"   # LETTER KA + SIGN NUKTA — same rendering, 2 codepoints
    assert composed != decomposed  # sanity: genuinely different Python strings
    assert canonical_bytes(**envelope({"n": composed})) == canonical_bytes(
        **envelope({"n": decomposed})
    )


# ── Envelope binding (domain separation) ─────────────────────────────────────
def test_same_payload_under_a_different_record_id_hashes_differently():
    # Otherwise an anchor proving record A could be replayed as proof for B.
    payload = {"name": "Same Mine"}
    assert canonical_bytes(**envelope(payload, record_id="m1")) != canonical_bytes(
        **envelope(payload, record_id="m2")
    )


def test_record_type_mine_id_and_version_are_all_bound_in():
    payload = {"name": "Same Mine"}
    base = canonical_bytes(**envelope(payload))
    assert base != canonical_bytes(**envelope(payload, record_type="ticket"))
    assert base != canonical_bytes(**envelope(payload, mine_id="mine-2"))
    assert base != canonical_bytes(**envelope(payload, version=2))


def test_output_carries_the_domain_tag():
    assert canonical_bytes(**envelope({"a": 1})).startswith(DOMAIN_TAG)


# ── Golden vectors ───────────────────────────────────────────────────────────
# Hardcoded so ANY change to the encoding fails loudly. If one of these breaks,
# the correct response is almost never to update the expected value — it is to
# revert whatever changed the encoding. See the banner in canonical.py.
GOLDEN_PAYLOAD = {
    "name": "ECL Sector 7G",
    "lat": "23.6739000",
    "lng": "86.9524000",
    "active": True,
    "operator": None,
    "opened_at": datetime(2026, 3, 12, 9, 30, 15, 123456, tzinfo=timezone.utc),
    "seams": ["upper", "lower"],
}
GOLDEN_ARGS = dict(
    record_type="mine",
    record_id="65f000000000000000000001",
    mine_id="65f000000000000000000001",
    payload_version=1,
    payload=GOLDEN_PAYLOAD,
)
GOLDEN_JSON = (
    b'{"id":"65f000000000000000000001","mine":"65f000000000000000000001",'
    b'"payload":{"active":true,"lat":"23.6739000","lng":"86.9524000",'
    b'"name":"ECL Sector 7G","opened_at":"2026-03-12T09:30:15.123Z",'
    b'"operator":null,"seams":["upper","lower"]},"type":"mine","v":1}'
)


def test_golden_bytes_are_exactly_as_expected():
    assert canonical_bytes(**GOLDEN_ARGS) == DOMAIN_TAG + GOLDEN_JSON


def test_golden_digest_is_stable():
    expected = "0x" + hashlib.sha256(DOMAIN_TAG + GOLDEN_JSON).hexdigest()
    assert payload_hash(**GOLDEN_ARGS) == expected


def test_hash_is_an_0x_prefixed_32_byte_hex_string():
    h = payload_hash(**GOLDEN_ARGS)
    assert h.startswith("0x")
    assert len(h) == 66
    bytes.fromhex(h[2:])  # raises if not valid hex
