"""
Settings for the blockchain ledger service. Mirrors backend/src/config.py's
shape (pydantic-settings BaseSettings, .env file, defaults on every field so
the service boots for a teammate with no .env at all).

Chain credentials are the one deliberate exception: `Optional[str] = None`,
gated at runtime rather than required at import time. This is what makes
ANCHOR_ENABLED=false work — the whole service, `/health`, the anchor queue,
comes up with no RPC URL and no private key configured, which matters when
only one person on the team holds the funded wallet.
"""

from typing import Optional

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator(
        "chain_rpc_url", "anchor_private_key", "contract_address", "deployed_at_block", mode="before"
    )
    @classmethod
    def _blank_env_means_unset(cls, value):
        # .env.example ships these as `KEY=` (no value) so a fresh copy is
        # ready to fill in. Pydantic reads that as an empty string, not
        # unset — which used to crash int/SecretStr fields at boot. Treat
        # blank the same as absent for every optional chain field.
        return None if value == "" else value

    # ── Infra — required in spirit, defaulted so the service still boots ──────
    mongodb_uri: str = "mongodb://mongodb:27017"
    mongodb_db_name: str = "coalguard_ledger"

    # ── Service-to-service auth ────────────────────────────────────────────────
    # Shared-secret header on the write endpoints, not JWT: this is
    # service-to-service, and forwarding the user's JWT would mean this
    # service needs the JWT secret and has to model users it has no business
    # knowing about. Compared with secrets.compare_digest, never `==`.
    ledger_api_key: str = "change-me-to-a-long-random-string"

    # ── Chain — optional by design ─────────────────────────────────────────────
    anchor_enabled: bool = False
    chain_rpc_url: Optional[str] = None
    chain_id: int = 11155111  # Sepolia
    # A FRESH THROWAWAY WALLET, never a personal MetaMask key — the same
    # private key controls the same address on every EVM chain, and a reused
    # key that appears in a screen-share is the #1 real hackathon incident.
    # SecretStr so an accidental print(settings) or a validation-error echo
    # prints ********** rather than the key itself.
    anchor_private_key: Optional[SecretStr] = None
    contract_address: Optional[str] = None
    # The fromBlock for every eth_getLogs event replay. Without it a scan
    # starts from genesis, and every public RPC provider rejects that range
    # outright. Falls back to deployments/<network>.json's own record — see
    # src/chain/deployment.py — when this is left unset, which is the normal
    # case; this override exists for a redeploy where the committed file is
    # momentarily stale.
    deployed_at_block: Optional[int] = None

    # ── Worker tuning ───────────────────────────────────────────────────────────
    poll_interval_seconds: float = 3.0
    confirmations_required: int = 1
    receipt_timeout_seconds: int = 180
    max_batch_size: int = 50
    balance_warning_wei: int = 10_000_000_000_000_000  # 0.01 ETH

    etherscan_base_url: str = "https://sepolia.etherscan.io"


settings = Settings()
