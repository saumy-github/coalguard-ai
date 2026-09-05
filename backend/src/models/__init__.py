"""
Single source of truth for which Beanie Documents exist. Both `main.py` (the
running app) and every seed script import `ALL_MODELS` from here rather than
keeping their own list — add a new collection once, in this file, and it's
registered everywhere automatically.
"""

from .inspection import Inspection
from .mine import Mine, Subsidiary
from .user import User

ALL_MODELS = [User, Mine, Subsidiary, Inspection]

__all__ = ["User", "Mine", "Subsidiary", "Inspection", "ALL_MODELS"]
