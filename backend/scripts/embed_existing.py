"""
embed_existing.py — Embed all train-split incidents from SQLite into ChromaDB Cloud.

Run from the `backend/` directory:
    .\\venv\\Scripts\\python.exe scripts\\embed_existing.py [--limit N] [--batch-size N]
"""
import os
import sys
import time
import logging
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Incident
from app.llm_client import llm_client
from app.vectorstore import vectorstore, get_collection
from app.pipeline import format_incident_for_embedding

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def embed_existing(limit: int = 0, batch_size: int = 10, dry_run: bool = False):
    db = SessionLocal()
    try:
        # Fetch ids already in ChromaDB so we skip re-embedding
        collection = get_collection()
        existing_chroma_ids = set(collection.get(include=[])["ids"])
        logger.info(f"ChromaDB already has {len(existing_chroma_ids)} vectors.")

        query = db.query(Incident).filter(Incident.split == "train")
        if limit > 0:
            query = query.limit(limit)
        incidents = query.all()

        to_embed = [inc for inc in incidents if inc.id not in existing_chroma_ids]
        logger.info(f"{len(incidents)} train incidents in DB · {len(to_embed)} need embedding.")

        if dry_run:
            logger.info("Dry-run mode, stopping here.")
            return

        embedded = 0
        failed = 0
        for i in range(0, len(to_embed), batch_size):
            batch = to_embed[i : i + batch_size]
            for inc in batch:
                try:
                    text = format_incident_for_embedding(inc.prompt, inc.response)
                    embedding = llm_client.get_embedding(text)
                    label_val = inc.true_label.value if inc.true_label else "unknown"
                    vectorstore.add_incident(
                        incident_id=inc.id,
                        embedding=embedding,
                        metadata={"true_label": label_val},
                    )
                    embedded += 1
                except Exception as e:
                    logger.warning(f"Failed {inc.id}: {e}")
                    failed += 1

            logger.info(f"Progress: {embedded} embedded · {failed} failed")
            # Brief pause to avoid hammering the Gemini API
            time.sleep(0.5)

    finally:
        db.close()

    logger.info(f"Done. Embedded {embedded} incidents ({failed} failed).")
    updated = collection.get(include=[])
    logger.info(f"ChromaDB now has {len(updated['ids'])} total vectors.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Embed existing DB incidents into ChromaDB Cloud")
    parser.add_argument("--limit", type=int, default=0, help="Max incidents to process (0 = all)")
    parser.add_argument("--batch-size", type=int, default=10, help="Log checkpoint every N incidents")
    parser.add_argument("--dry-run", action="store_true", help="Just count, don't embed")
    args = parser.parse_args()
    embed_existing(limit=args.limit, batch_size=args.batch_size, dry_run=args.dry_run)
