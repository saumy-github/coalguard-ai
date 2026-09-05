"""
Single source of truth for which Beanie Documents exist. Both `main.py` (the
running app) and every seed script import `ALL_MODELS` from here rather than
keeping their own list — add a new collection once, in this file, and it's
registered everywhere automatically.
"""

from .mine import Mine, Subsidiary
from .mine_level import MineLevel
from .person_issue import PersonIssue
from .site_issue import SiteIssue
from .user import User

ALL_MODELS = [User, Mine, Subsidiary, MineLevel, PersonIssue, SiteIssue]

__all__ = ["User", "Mine", "Subsidiary", "MineLevel", "PersonIssue", "SiteIssue", "ALL_MODELS"]
