"""
RAG Vector Ingestion Pipeline
==============================
Parses all regulatory PDFs in data/rulebooks/, splits text into chunks,
embeds them via sentence-transformers (all-MiniLM-L6-v2), and persists
the vector store to data/chroma_db/ using ChromaDB.

Usage:
    python ingest_rag.py                      # defaults
    python ingest_rag.py --chunk-size 500     # custom chunk size
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
RULEBOOKS_DIR = BASE_DIR / "data" / "rulebooks"
CHROMA_PERSIST_DIR = str(BASE_DIR / "data" / "chroma_db")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
COLLECTION_NAME = "coal_mine_regulations"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
)
logger = logging.getLogger(__name__)


def discover_pdfs(directory: Path) -> List[Path]:
    """Return sorted list of PDF files in *directory*."""
    pdfs = sorted(directory.glob("*.pdf"))
    if not pdfs:
        logger.warning("No PDF files found in %s", directory)
    return pdfs


def load_and_split(
    pdf_paths: List[Path],
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> list:
    """Load every PDF page and split into overlapping text chunks.

    Args:
        pdf_paths: List of paths to PDF files.
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Overlap between consecutive chunks.

    Returns:
        List of LangChain ``Document`` objects.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )

    all_docs: list = []
    for pdf_path in pdf_paths:
        logger.info("Loading %s …", pdf_path.name)
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            chunks = splitter.split_documents(pages)
            logger.info(
                "  → %d pages → %d chunks", len(pages), len(chunks)
            )
            all_docs.extend(chunks)
        except Exception:
            logger.exception("Failed to process %s — skipping", pdf_path.name)

    logger.info("Total chunks: %d", len(all_docs))
    return all_docs


def build_vector_store(
    documents: list,
    persist_directory: str = CHROMA_PERSIST_DIR,
    embedding_model: str = EMBEDDING_MODEL,
    collection_name: str = COLLECTION_NAME,
) -> Chroma:
    """Embed *documents* and persist to a Chroma vector database.

    Args:
        documents: LangChain Document list produced by ``load_and_split``.
        persist_directory: Filesystem path for the persistent DB.
        embedding_model: HuggingFace model identifier.
        collection_name: Chroma collection name.

    Returns:
        The Chroma vector store instance.
    """
    logger.info(
        "Initialising embeddings (%s) …", embedding_model
    )
    embeddings = HuggingFaceEmbeddings(
        model_name=embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    logger.info(
        "Building Chroma DB at %s (collection=%s) …",
        persist_directory,
        collection_name,
    )
    vector_store = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=persist_directory,
        collection_name=collection_name,
    )

    logger.info(
        "✓ Vector store persisted — %d vectors stored.", len(documents)
    )
    return vector_store


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest regulatory PDFs into a Chroma vector database."
    )
    parser.add_argument(
        "--rulebooks-dir",
        type=Path,
        default=RULEBOOKS_DIR,
        help="Directory containing PDF rulebooks (default: data/rulebooks/).",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Maximum chunk size in characters (default: 1000).",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=150,
        help="Overlap between consecutive chunks (default: 150).",
    )
    parser.add_argument(
        "--persist-dir",
        type=str,
        default=CHROMA_PERSIST_DIR,
        help="Output directory for the Chroma DB (default: data/chroma_db/).",
    )
    args = parser.parse_args()

    pdfs = discover_pdfs(args.rulebooks_dir)
    if not pdfs:
        logger.error("Aborting — no PDFs to ingest.")
        sys.exit(1)

    documents = load_and_split(
        pdfs,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )
    if not documents:
        logger.error("Aborting — no text extracted from PDFs.")
        sys.exit(1)

    build_vector_store(
        documents,
        persist_directory=args.persist_dir,
    )
    logger.info("Done ✓")


if __name__ == "__main__":
    main()
