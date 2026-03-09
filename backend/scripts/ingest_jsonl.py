import os
import sys
import json
import argparse
import logging

from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal, engine, Base
from app.models import Incident, IncidentType
from app.llm_client import llm_client
from app.vectorstore import vectorstore
from app.pipeline import format_incident_for_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ingest_jsonl(file_path: str, skip_embeddings: bool = False):
    """
    Read a JSONL file of incidents and load them into SQLite and ChromaDB Cloud.
    Expected JSON schema:
    {
       "id": "uuid",
       "prompt": "...",
       "response": "...",
       "true_label": "hallucination",
       "severity": 0.8,
       "reference_explanation": "...",
       "split": "train"
    }
    """
    if not os.path.exists(file_path):
        logger.error(f"File {file_path} not found.")
        return

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    count = 0
    skipped = 0
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue

            data = json.loads(line)

            # Check if incident exists
            existing = db.query(Incident).filter(Incident.id == data.get("id")).first()
            if existing:
                skipped += 1
                continue

            # Create DB Record
            inc = Incident(
                id=data.get("id"),
                prompt=data["prompt"],
                response=data["response"],
                true_label=IncidentType(data["true_label"]) if data.get("true_label") else None,
                severity=data.get("severity"),
                reference_explanation=data.get("reference_explanation"),
                split=data.get("split", "train"),
            )
            db.add(inc)
            db.commit()

            # Add to vector DB if it's the training split
            if inc.split == "train" and not skip_embeddings:
                try:
                    text = format_incident_for_embedding(inc.prompt, inc.response)
                    embedding = llm_client.get_embedding(text)
                    vectorstore.add_incident(
                        incident_id=inc.id,
                        embedding=embedding,
                        metadata={"true_label": inc.true_label.value if inc.true_label else "unknown"},
                    )
                except Exception as e:
                    logger.warning(f"Failed to embed incident {inc.id}: {e}")

            count += 1
            if count % 50 == 0:
                logger.info(f"Ingested {count} records...")

    db.close()
    logger.info(f"Done. Ingested {count} new incidents ({skipped} skipped as existing).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Incident JSONL Corpus")
    parser.add_argument("file_path", help="Path to the JSONL dataset")
    parser.add_argument("--skip-embeddings", action="store_true", help="Skip generating and storing embeddings")
    args = parser.parse_args()

    ingest_jsonl(args.file_path, skip_embeddings=args.skip_embeddings)
