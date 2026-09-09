"""
One-shot migration: flat RegulatoryReport -> the structured multi-section one.

Existing `regulatory_reports` documents carry a free-text `reporting_period`
and none of the new required fields, so Beanie refuses to parse them the moment
the model changes — `GET /regulatory-reports` 500s until this has run. That's
why this operates on the raw motor collection rather than through Beanie: the
documents it has to fix are precisely the ones Beanie can no longer load.

Idempotent — a document that already has `period_start` is skipped, so running
it twice is safe.

Run:
    docker compose exec backend python -m scripts.migrate_reports_structured
    docker compose exec backend python -m scripts.migrate_reports_structured --dry-run
"""

from __future__ import annotations

import asyncio
import re
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from scripts.db import connect
from src.config import settings

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}
_MONTH_ABBR = {name[:3]: number for name, number in _MONTHS.items()}


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """[first instant of the month, last representable instant of the month].

    The end is inclusive because the aggregator filters with `created_at <=
    period_end`. It's backed off by a full millisecond rather than a
    microsecond because BSON stores millisecond precision — a microsecond
    offset would round-trip to the first instant of the next month and quietly
    widen every period by a day.
    """
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    next_month = datetime(year + (month == 12), (month % 12) + 1, 1, tzinfo=timezone.utc)
    return start, next_month - timedelta(milliseconds=1)


def parse_period(label: Optional[str], fallback: datetime) -> tuple[datetime, datetime]:
    """Best-effort "<Month> <Year>" / "<Mon> <Year>" / "YYYY-MM" -> a month range.

    Anything unparseable falls back to the calendar month of `submitted_at`.
    That is a guess, and it is the right kind of guess: these are demo records
    whose label was never a queryable value in the first place, and the
    alternative — refusing to migrate — leaves the collection unreadable.
    """
    if label:
        text = label.strip().lower()

        iso = re.fullmatch(r"(\d{4})[-/](\d{1,2})", text)
        if iso:
            year, month = int(iso.group(1)), int(iso.group(2))
            if 1 <= month <= 12:
                return _month_bounds(year, month)

        words = re.fullmatch(r"([a-z]+)\s+(\d{4})", text)
        if words:
            name, year = words.group(1), int(words.group(2))
            month = _MONTHS.get(name) or _MONTH_ABBR.get(name[:3])
            if month:
                return _month_bounds(year, month)

    at = fallback if fallback.tzinfo else fallback.replace(tzinfo=timezone.utc)
    return _month_bounds(at.year, at.month)


def build_update(doc: dict[str, Any]) -> dict[str, Any]:
    """The `$set` payload for one legacy document."""
    label = doc.get("reporting_period")
    submitted_at = doc.get("submitted_at") or datetime.now(timezone.utc)
    period_start, period_end = parse_period(label, submitted_at)

    total = doc.get("total_safety_issues", 0)
    resolved = doc.get("resolved_issues", 0)

    return {
        "period_start": period_start,
        "period_end": period_end,
        "period_label": label or period_start.strftime("%B %Y"),
        # The old model had no notion of "open" — derive it rather than
        # recomputing from live issues, which would contradict the counts the
        # document already reports and was submitted with.
        "open_issues": max(total - resolved, 0),
        # Deliberately NOT backfilled from today's records: `sections` and
        # `issue_snapshot` are meant to be what was true at submission time,
        # and that information was never captured for these documents. Empty
        # is honest; a reconstruction from current data would be fiction.
        "sections": [],
        "level_breakdown": [],
        "issue_snapshot": [],
        "corrective_actions": [],
        "declaration": None,
        "regulator_findings": None,
    }


async def migrate_reports(*, dry_run: bool = False) -> None:
    client = await connect()
    collection = client[settings.mongodb_db_name]["regulatory_reports"]

    migrated = 0
    skipped = 0

    async for doc in collection.find({}):
        if doc.get("period_start") is not None:
            skipped += 1
            continue

        update = build_update(doc)
        label = update["period_label"]
        window = f"{update['period_start']:%Y-%m-%d} → {update['period_end']:%Y-%m-%d}"
        print(f"  {doc['_id']}  {label!r:<24} {window}")

        if not dry_run:
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": update, "$unset": {"reporting_period": ""}},
            )
        migrated += 1

    verb = "would migrate" if dry_run else "migrated"
    print(f"\n{verb} {migrated}, skipped {skipped} (already structured)")
    client.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("\n🔎 DRY RUN — no writes\n")
    else:
        print("\n🔧 Migrating regulatory_reports...\n")
    try:
        asyncio.run(migrate_reports(dry_run=dry_run))
    except Exception as exc:
        print(f"\n❌ Migration failed: {exc}")
        raise SystemExit(1)
