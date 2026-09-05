from ..auth.google import verify_google_token
from ..auth.guest import get_guest_user
from ..auth.security import create_access_token, verify_password
from ..models.user import User, UserType


class AuthError(Exception):
    """Raised for any login failure; routes translate this to an HTTP error."""


async def login_with_password(identifier: str, password: str) -> str:
    user = await User.find_one(
        {"$or": [{"email": identifier}, {"phone": identifier}]}
    )
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise AuthError("Invalid credentials")
    if not user.active:
        raise AuthError("Account is deactivated")
    return _issue_token(user)


async def login_with_google(id_token_str: str) -> str:
    try:
        payload = verify_google_token(id_token_str)
    except ValueError as exc:
        raise AuthError(f"Invalid Google token: {exc}") from exc

    email = payload.get("email")
    google_id = payload.get("sub")
    if not email or not google_id:
        raise AuthError("Google token missing required claims")

    # An Admin must invite the user first (research/lld.md §7p) — Google OAuth
    # only completes the first login for an existing, pre-provisioned account.
    # It never self-provisions a new privileged account for an arbitrary email.
    user = await User.find_one(User.email == email)
    if user is None:
        raise AuthError(
            "No account found for this email — ask an Admin to invite you first"
        )

    if not user.active:
        raise AuthError("Account is deactivated")

    if not user.google_id:
        user.google_id = google_id
        await user.save()

    return _issue_token(user)


async def login_as_guest(role: UserType) -> str:
    user = await get_guest_user(role)
    if user is None:
        raise AuthError(f"No guest account exists for role '{role}'")
    return _issue_token(user)


def _issue_token(user: User) -> str:
    return create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
        }
    )
