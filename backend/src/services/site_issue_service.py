from typing import Optional

from beanie import PydanticObjectId
from beanie.operators import In

from . import ai_engine_client
from ..models.site_issue import SiteIssue, SiteIssueSeverity, SiteIssueType

# Simple lookup, not returned by ai_engine — the anomaly endpoint only classifies
# severity and explains why, it never says what to do about it.
_RECOMMENDED_ACTIONS: dict[str, str] = {
    "methane": "Evacuate the affected section immediately and sound the alarm.",
    "co": "Evacuate the affected section immediately and increase ventilation.",
    "air_velocity": "Inspect and restore ventilation fans for this section.",
    "temperature": "Halt work in this section until cooling/ventilation is restored.",
}

_ISSUE_TYPE_BY_SENSOR: dict[str, SiteIssueType] = {
    "methane": "high_methane",
    "co": "high_co",
    "air_velocity": "low_ventilation",
    "temperature": "high_temperature",
}


async def create_site_issue(
    *,
    mine_id: PydanticObjectId,
    level: str,
    section: int,
    issue_type: SiteIssueType,
    observation: str,
    severity: SiteIssueSeverity,
    recommended_action: Optional[str],
) -> SiteIssue:
    issue = SiteIssue(
        mine_id=mine_id,
        level=level,
        section=section,
        issue_type=issue_type,
        source="manual",
        observation=observation,
        severity=severity,
        recommended_action=recommended_action,
    )
    await issue.insert()
    return issue


async def list_site_issues(mine_id: PydanticObjectId) -> list[SiteIssue]:
    return await SiteIssue.find(SiteIssue.mine_id == mine_id).to_list()


async def list_site_issues_for_mines(mine_ids: list[PydanticObjectId]) -> list[SiteIssue]:
    """Corporate Management scope (Decision #11) — zero assigned mines must
    mean zero issues, never every mine's issues, so this never falls back to
    an unfiltered query when `mine_ids` is empty.
    """
    if not mine_ids:
        return []
    return await SiteIssue.find(In(SiteIssue.mine_id, mine_ids)).to_list()


async def create_site_issue_from_reading(
    *,
    mine_id: PydanticObjectId,
    level: str,
    section: int,
    methane: float,
    co: float,
    air_velocity: float,
    temperature: float,
) -> Optional[SiteIssue]:
    result = await ai_engine_client.check_anomaly(
        methane=methane, co=co, air_velocity=air_velocity, temperature=temperature
    )
    if result["overall_risk"] == "NORMAL":
        return None

    anomalous = [r for r in result["sensor_reports"] if r["is_anomaly"]]
    worst = anomalous[0] if anomalous else result["sensor_reports"][0]
    issue_type = _ISSUE_TYPE_BY_SENSOR.get(worst["sensor"], "other")
    recommended_action = _RECOMMENDED_ACTIONS.get(worst["sensor"], "Investigate and respond per site protocol.")

    issue = SiteIssue(
        mine_id=mine_id,
        level=level,
        section=section,
        issue_type=issue_type,
        source="sensor",
        observation=worst["threshold_info"],
        sensor_reading_snapshot=result["sensor_reports"],
        severity=result["overall_risk"],
        recommended_action=recommended_action,
    )
    await issue.insert()
    return issue
