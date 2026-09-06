"""
Single source of truth for which Beanie Documents exist. Both `main.py` (the
running app) and every seed script import `ALL_MODELS` from here rather than
keeping their own list — add a new collection once, in this file, and it's
registered everywhere automatically.
"""

from .attendance import AttendanceRecord
from .inspection import Inspection
from .mine import Mine
from .mine_level import MineLevel
from .person_issue import PersonIssue
from .regulatory_report import RegulatoryReport
from .site_issue import SiteIssue
from .user import User

ALL_MODELS = [
    User,
    Mine,
    MineLevel,
    PersonIssue,
    SiteIssue,
    Inspection,
    RegulatoryReport,
    AttendanceRecord,
]

__all__ = [
    "User",
    "Mine",
    "MineLevel",
    "PersonIssue",
    "SiteIssue",
    "Inspection",
    "RegulatoryReport",
    "AttendanceRecord",
    "ALL_MODELS",
]
