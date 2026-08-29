"""
RAG Compliance Engine
======================
Connects to the persistent ChromaDB vector store (built by ingest_rag.py)
and uses LangChain + Groq (llama-3.1-8b-instant) to match field
observations against regulatory text and return statutory citations.

Environment variables:
    GROQ_API_KEY — Required.  The Groq Cloud API key.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PERSIST_DIR = str(BASE_DIR / "data" / "chroma_db")
COLLECTION_NAME = "coal_mine_regulations"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
TOP_K = 5  # Number of context chunks to retrieve


# ── Data Structures ──────────────────────────────────────────────────────────
@dataclass
class Citation:
    """A single statutory reference extracted from the vector store."""
    source: str
    page: int
    content_excerpt: str
    relevance_score: float


@dataclass
class ComplianceResult:
    """Result of a compliance check against the regulatory corpus."""
    observation: str
    compliance_status: str  # "COMPLIANT" | "NON_COMPLIANT" | "REVIEW_REQUIRED"
    analysis: str
    citations: List[Dict[str, Any]] = field(default_factory=list)
    applicable_regulations: List[str] = field(default_factory=list)


# ── Lazy Singletons ─────────────────────────────────────────────────────────
_vector_store = None
_llm = None


def _get_embeddings():
    """Return HuggingFace embeddings model (cached)."""
    from langchain_community.embeddings import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def _get_vector_store():
    """Connect to the persistent Chroma vector store."""
    global _vector_store
    if _vector_store is not None:
        return _vector_store

    from langchain_chroma import Chroma

    persist_path = Path(CHROMA_PERSIST_DIR)
    if not persist_path.exists():
        raise FileNotFoundError(
            f"Chroma DB not found at {CHROMA_PERSIST_DIR}. "
            "Run `python ingest_rag.py` first to build the vector store."
        )

    _vector_store = Chroma(
        persist_directory=CHROMA_PERSIST_DIR,
        embedding_function=_get_embeddings(),
        collection_name=COLLECTION_NAME,
    )
    logger.info(
        "Connected to Chroma DB at %s (collection=%s).",
        CHROMA_PERSIST_DIR,
        COLLECTION_NAME,
    )
    return _vector_store


def _get_llm():
    """Return the Groq LLM instance."""
    global _llm
    if _llm is not None:
        return _llm

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GROQ_API_KEY environment variable is not set. "
            "Set it to your Groq Cloud API key to use the compliance engine."
        )

    from langchain_groq import ChatGroq

    _llm = ChatGroq(
        model=LLM_MODEL,
        api_key=api_key,
        temperature=0.1,
        max_tokens=2048,
    )
    logger.info("Groq LLM initialised (model=%s).", LLM_MODEL)
    return _llm


def is_ready() -> Dict[str, bool]:
    """Check readiness of the RAG subsystem components."""
    status: Dict[str, bool] = {
        "chroma_db": Path(CHROMA_PERSIST_DIR).exists(),
        "groq_api_key": bool(os.environ.get("GROQ_API_KEY")),
    }
    return status


# ── Prompt Template ──────────────────────────────────────────────────────────
COMPLIANCE_PROMPT = """You are a legal compliance analyst specialising in
Indian coal mine safety regulations. You have access to the following
regulatory context extracted from official rulebooks:

--- REGULATORY CONTEXT ---
{context}
--- END CONTEXT ---

A field observation has been reported:

"{observation}"

Based STRICTLY on the regulatory context provided above, perform the
following analysis:

1. **Compliance Status**: Determine whether the observation indicates
   COMPLIANT, NON_COMPLIANT, or REVIEW_REQUIRED status.
2. **Applicable Regulations**: List the specific regulation numbers,
   section numbers, or rule references that apply.
3. **Analysis**: Provide a concise legal analysis explaining why the
   observation meets or violates the cited regulations.
4. **Recommendations**: If non-compliant, suggest corrective actions
   mandated by the regulations.

Format your response as follows:
COMPLIANCE_STATUS: <COMPLIANT|NON_COMPLIANT|REVIEW_REQUIRED>
APPLICABLE_REGULATIONS: <comma-separated list of regulation references>
ANALYSIS: <your detailed analysis>
RECOMMENDATIONS: <corrective actions if applicable, otherwise "None">
"""


# ── Public API ───────────────────────────────────────────────────────────────
def check_compliance(observation: str) -> ComplianceResult:
    """Match a field observation against the regulatory corpus.

    Args:
        observation: Free-text description of a field observation
                     (e.g., "Workers in Zone B not wearing helmets").

    Returns:
        ``ComplianceResult`` with statutory citations, compliance status,
        and LLM-generated legal analysis.
    """
    vector_store = _get_vector_store()
    llm = _get_llm()

    # Retrieve relevant chunks
    docs_with_scores = vector_store.similarity_search_with_relevance_scores(
        query=observation,
        k=TOP_K,
    )

    # Build context and citations
    context_parts: List[str] = []
    citations: List[Dict[str, Any]] = []

    for doc, score in docs_with_scores:
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", -1)
        context_parts.append(
            f"[Source: {Path(source).name}, Page {page + 1}]\n{doc.page_content}"
        )
        citations.append(
            {
                "source": Path(source).name,
                "page": page + 1,
                "content_excerpt": doc.page_content[:300] + "…"
                if len(doc.page_content) > 300
                else doc.page_content,
                "relevance_score": round(float(score), 4),
            }
        )

    context = "\n\n".join(context_parts)

    # Generate analysis
    prompt = COMPLIANCE_PROMPT.format(
        context=context,
        observation=observation,
    )
    response = llm.invoke(prompt)
    response_text = response.content if hasattr(response, "content") else str(response)

    # Parse structured response
    compliance_status = "REVIEW_REQUIRED"
    applicable_regs: List[str] = []
    analysis = response_text

    for line in response_text.split("\n"):
        line_stripped = line.strip()
        if line_stripped.startswith("COMPLIANCE_STATUS:"):
            raw_status = line_stripped.split(":", 1)[1].strip().upper()
            if raw_status in ("COMPLIANT", "NON_COMPLIANT", "REVIEW_REQUIRED"):
                compliance_status = raw_status
        elif line_stripped.startswith("APPLICABLE_REGULATIONS:"):
            raw_regs = line_stripped.split(":", 1)[1].strip()
            applicable_regs = [r.strip() for r in raw_regs.split(",") if r.strip()]
        elif line_stripped.startswith("ANALYSIS:"):
            analysis = line_stripped.split(":", 1)[1].strip()

    return ComplianceResult(
        observation=observation,
        compliance_status=compliance_status,
        analysis=analysis,
        citations=citations,
        applicable_regulations=applicable_regs,
    )
