"""
Issue Classifier
================
Given a worker's free-text field observation, decides:
  (a) whether it is a site issue or a person issue, and
  (b) which specific issue_type and severity apply.

Uses the same Groq LLM client (_get_llm) that the RAG compliance engine uses,
so no additional API key or SDK dependency is needed.

Output schema
-------------
{
    "target":     "site_issue" | "person_issue",
    "issue_type": str,   # constrained to the valid literals for the target
    "severity":   str,   # constrained to the valid literals for the target
}

Site issue types:  high_methane | high_co | low_ventilation |
                   high_temperature | equipment_fault | other
Site severities:   NORMAL | WARNING | CRITICAL

Person issue types: no_helmet | no_vest | other
Person severities:  low | medium | high | critical

Hard rule: when confidence is low, emit "other" rather than inventing a type.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ── Valid vocabulary ──────────────────────────────────────────────────────────
_SITE_ISSUE_TYPES = frozenset(
    {"high_methane", "high_co", "low_ventilation", "high_temperature", "equipment_fault", "other"}
)
_SITE_SEVERITIES = frozenset({"NORMAL", "WARNING", "CRITICAL"})

_PERSON_ISSUE_TYPES = frozenset({"no_helmet", "no_vest", "other"})
_PERSON_SEVERITIES = frozenset({"low", "medium", "high", "critical"})


# ── Dataclass result ──────────────────────────────────────────────────────────
@dataclass
class ClassificationResult:
    target: str      # "site_issue" | "person_issue"
    issue_type: str
    severity: str


# ── Prompt ────────────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are a coal mine safety triage system. Your only job is to classify a
worker's plain-text observation into one of two targets:

TARGET A — site_issue (hazard at the mine site itself)
  issue_type must be EXACTLY one of:
    high_methane      – elevated methane / gas detected
    high_co           – elevated carbon monoxide
    low_ventilation   – poor airflow / ventilation problem
    high_temperature  – excessive heat
    equipment_fault   – broken, damaged or malfunctioning equipment
    other             – anything else site-related, or low-confidence

  severity must be EXACTLY one of:
    NORMAL    – minor, monitor only
    WARNING   – prompt attention required
    CRITICAL  – immediate intervention required

TARGET B — person_issue (PPE or behaviour violation by a person)
  issue_type must be EXACTLY one of:
    no_helmet  – worker not wearing a hard hat / helmet
    no_vest    – worker not wearing a high-visibility vest
    other      – any other person-related violation, or low-confidence

  severity must be EXACTLY one of:
    low      – minor, low urgency
    medium   – moderate, address soon
    high     – serious, urgent
    critical – life-threatening, act immediately

RULES
-----
1. If the observation is about something a PERSON is wearing (or not wearing),
   choose target = "person_issue".
2. If the observation is about an environmental hazard, gas, heat, ventilation,
   or equipment, choose target = "site_issue".
3. When confidence for a specific issue_type is low, output "other" rather than
   guessing — NEVER invent a type that is not in the allowed lists above.
4. Respond with RAW JSON only — no markdown, no code fences, no explanation.
   Example:
   {"target": "site_issue", "issue_type": "high_methane", "severity": "WARNING"}
"""

_USER_TEMPLATE = 'Classify this observation: "{observation}"'


def _extract_json(text: str) -> dict:
    """Robustly extract a JSON object from the LLM's response text."""
    text = text.strip()
    # Attempt 1: direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Attempt 2: strip markdown fences if present
    stripped = re.sub(r"```(?:json)?", "", text, flags=re.IGNORECASE).strip().rstrip("`").strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass
    # Attempt 3: find the first {...} block
    match = re.search(r"\{[^{}]+\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not extract valid JSON from LLM response: {text!r}")


def classify_issue(observation: str) -> ClassificationResult:
    """Classify a free-text mine observation into target/issue_type/severity.

    Args:
        observation: Free-text description of the problem from a worker or
                     safety officer.

    Returns:
        ClassificationResult with target, issue_type, and severity fields
        that are guaranteed to be within the allowed vocabulary for that target.

    Raises:
        EnvironmentError: If GROQ_API_KEY is not set.
        Exception: On LLM or network failure.
    """
    # Re-use the singleton Groq LLM from the RAG engine — same API key, same
    # model, no extra initialisation cost.
    from src.rag_engine import _get_llm  # noqa: PLC0415

    llm = _get_llm()

    # Build messages in LangChain's SystemMessage / HumanMessage style
    from langchain_core.messages import HumanMessage, SystemMessage  # noqa: PLC0415

    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=_USER_TEMPLATE.format(observation=observation)),
    ]

    logger.info("Classifying observation (len=%d): %.120s...", len(observation), observation)
    response = llm.invoke(messages)
    raw = response.content if hasattr(response, "content") else str(response)

    try:
        parsed = _extract_json(raw)
    except ValueError:
        logger.error("JSON extraction failed — defaulting to site_issue/other. Raw: %s", raw)
        return ClassificationResult(target="site_issue", issue_type="other", severity="WARNING")

    target = parsed.get("target", "")
    issue_type = parsed.get("issue_type", "other")
    severity = parsed.get("severity", "")

    # Normalise + sanitise target
    if target not in ("site_issue", "person_issue"):
        logger.warning("LLM returned unknown target=%r — defaulting to site_issue", target)
        target = "site_issue"

    # Sanitise issue_type and severity against the target's allowed vocabulary
    if target == "site_issue":
        if issue_type not in _SITE_ISSUE_TYPES:
            logger.warning("Unknown site issue_type=%r — falling back to 'other'", issue_type)
            issue_type = "other"
        if severity not in _SITE_SEVERITIES:
            logger.warning("Unknown site severity=%r — falling back to 'WARNING'", severity)
            severity = "WARNING"
    else:
        if issue_type not in _PERSON_ISSUE_TYPES:
            logger.warning("Unknown person issue_type=%r — falling back to 'other'", issue_type)
            issue_type = "other"
        if severity not in _PERSON_SEVERITIES:
            logger.warning("Unknown person severity=%r — falling back to 'medium'", severity)
            severity = "medium"

    logger.info(
        "Classification result — target=%s  issue_type=%s  severity=%s",
        target, issue_type, severity,
    )
    return ClassificationResult(target=target, issue_type=issue_type, severity=severity)
