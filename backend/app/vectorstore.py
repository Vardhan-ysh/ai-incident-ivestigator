import chromadb
import google.generativeai as genai
from app.config import settings
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

# ==========================================
# Configure Gemini SDK for embeddings
# ==========================================
genai.configure(api_key=settings.gemini_api_key)

# ==========================================
# Lazy ChromaDB Cloud Client
# ==========================================
_chroma_client = None


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        logger.info("Connecting to ChromaDB Cloud...")
        _chroma_client = chromadb.CloudClient(
            api_key=settings.chroma_api_key,
            tenant=settings.chroma_tenant,
            database=settings.chroma_database,
        )
        logger.info("Connected to ChromaDB Cloud.")
    return _chroma_client


# ==========================================
# Gemini Embedding helpers
# ==========================================
def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts using Gemini embedding model."""
    result = genai.embed_content(
        model=settings.embedding_model,
        content=texts,
        task_type="retrieval_document",
    )
    emb = result["embedding"]
    return emb if isinstance(emb[0], list) else [emb]


def _embed_query(text: str) -> List[float]:
    """Embed a single query text using Gemini embedding model."""
    result = genai.embed_content(
        model=settings.embedding_model,
        content=text,
        task_type="retrieval_query",
    )
    return result["embedding"]


# ==========================================
# Collection access
# ==========================================
COLLECTION_NAME = settings.chroma_collection_name


def get_collection():
    client = _get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


# ==========================================
# Vectorstore operations (public API)
# ==========================================
class VectorStore:
    """Thin wrapper so other modules can import `vectorstore` as an object."""

    def add_incident(
        self,
        incident_id: str,
        embedding: List[float],
        metadata: Dict[str, Any] | None = None,
    ):
        collection = get_collection()
        metadata = metadata or {}
        collection.add(
            ids=[incident_id],
            embeddings=[embedding],
            metadatas=[metadata],
        )

    def add_incident_by_text(
        self,
        incident_id: str,
        text: str,
        metadata: Dict[str, Any] | None = None,
    ):
        """Embed text via Gemini, then store the embedding in ChromaDB Cloud."""
        embedding = _embed_texts([text])[0]
        self.add_incident(incident_id, embedding, metadata)

    def retrieve_similar(
        self, query_text: str, k: int = 5
    ) -> Tuple[List[str], List[float]]:
        """Return (incident_ids, similarities) for the k nearest neighbours."""
        collection = get_collection()
        query_embedding = _embed_query(query_text)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["metadatas", "distances"],
        )

        if not results.get("ids") or len(results["ids"][0]) == 0:
            return [], []

        incident_ids = results["ids"][0]
        distances = results["distances"][0]
        # Cosine distance -> similarity
        similarities = [1.0 - d for d in distances]
        return incident_ids, similarities


# Module-level singleton
vectorstore = VectorStore()


# ==========================================
# Legacy helpers for backward compat
# ==========================================
def add_incident_to_vectorstore(
    incident_id: str,
    prompt: str,
    response: str,
    metadata: Dict[str, Any] | None = None,
):
    text = f"{prompt}\n\n[MODEL RESPONSE]\n\n{response}"
    vectorstore.add_incident_by_text(incident_id, text, metadata)


def retrieve_similar_incidents(
    prompt: str, response: str, k: int = 5
) -> Tuple[List[str], List[float]]:
    query_text = f"{prompt}\n\n[MODEL RESPONSE]\n\n{response}"
    return vectorstore.retrieve_similar(query_text, k)
