from pydantic import BaseModel


class AdminProfile(BaseModel):
    """Genuinely empty — admin has no mine-scope concept at all (global access)."""
