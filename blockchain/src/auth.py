"""
Shared-secret auth for the write endpoints (/anchor, /anchor/batch, /retry).

A header compared with secrets.compare_digest, not JWT: this is
service-to-service (only backend calls these), and accepting the user's JWT
here would mean this service needs the backend's JWT secret and has to model
users it has no business knowing about. compare_digest specifically, never
`==` — a naive string comparison short-circuits on the first mismatched byte,
which leaks the key length/prefix through response timing.
"""

import secrets

from fastapi import Header, HTTPException, status

from .config import settings

API_KEY_HEADER = "X-Ledger-Api-Key"


async def require_api_key(x_ledger_api_key: str = Header(default="", alias=API_KEY_HEADER)) -> None:
    if not secrets.compare_digest(x_ledger_api_key, settings.ledger_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-Ledger-Api-Key",
        )
