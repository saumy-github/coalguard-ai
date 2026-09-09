"""Request/response models for the ledger API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .models.ledger_entry import LedgerEntryStatus


class AnchorRequest(BaseModel):
    record_type: str
    record_id: str
    mine_id: str
    payload_version: int
    payload: dict


class AnchorBatchRequest(BaseModel):
    items: list[AnchorRequest] = Field(min_length=1)


class EntryResponse(BaseModel):
    id: str
    record_type: str
    record_id: str
    mine_id: str
    payload_version: int
    payload_hash: str
    version: Optional[int]
    status: LedgerEntryStatus
    tx_hash: Optional[str]
    nonce: Optional[int]
    block_number: Optional[int]
    gas_used: Optional[int]
    chain_id: Optional[int]
    contract_address: Optional[str]
    attempts: int
    last_error: Optional[str]
    created_at: datetime
    submitted_at: Optional[datetime]
    confirmed_at: Optional[datetime]
    explorer_tx_url: Optional[str] = None

    @classmethod
    def from_entry(cls, entry, *, etherscan_base_url: str) -> "EntryResponse":
        return cls(
            id=str(entry.id),
            record_type=entry.record_type,
            record_id=entry.record_id,
            mine_id=entry.mine_id,
            payload_version=entry.payload_version,
            payload_hash=entry.payload_hash,
            version=entry.version,
            status=entry.status,
            tx_hash=entry.tx_hash,
            nonce=entry.nonce,
            block_number=entry.block_number,
            gas_used=entry.gas_used,
            chain_id=entry.chain_id,
            contract_address=entry.contract_address,
            attempts=entry.attempts,
            last_error=entry.last_error,
            created_at=entry.created_at,
            submitted_at=entry.submitted_at,
            confirmed_at=entry.confirmed_at,
            explorer_tx_url=(
                f"{etherscan_base_url}/tx/{entry.tx_hash}" if entry.tx_hash else None
            ),
        )


class AnchorResponse(BaseModel):
    entry_id: str
    payload_hash: str
    status: LedgerEntryStatus
    existing: bool


class VerifyRequest(BaseModel):
    record_type: str
    record_id: str
    mine_id: str
    payload_version: int
    payload: dict
