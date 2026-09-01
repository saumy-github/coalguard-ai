from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from ..config import settings


def verify_google_token(token: str) -> dict[str, Any]:
    """Verify a Google ID token and return its payload.

    Raises ValueError if the token is invalid, expired, or wasn't issued
    for our OAuth client (audience mismatch).
    """
    return google_id_token.verify_oauth2_token(
        token, google_requests.Request(), settings.google_client_id
    )
