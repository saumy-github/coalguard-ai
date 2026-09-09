class ChainUnavailable(Exception):
    """Raised whenever chain access is attempted but not usable right now —
    RPC unreachable, contract not configured, ANCHOR_ENABLED=false, etc.

    Callers must treat this as "no answer", never as a negative result. See
    verify_service.py's UNAVAILABLE verdict: reporting TAMPERED because an RPC
    call failed is worse than useless.
    """
