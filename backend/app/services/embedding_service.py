from google import genai
from google.genai import types
from app.config import settings
import asyncio
import logging
from typing import List, Optional
from app.services.vector_store import store_chunks

logger = logging.getLogger(__name__)

# Initialize the new SDK client
client = genai.Client(api_key=settings.gemini_api_key)

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """Splits text into overlapping chunks."""
    if not text:
        return []
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

async def generate_embedding(text: str) -> List[float]:
    """Generate a single embedding using modern SDK."""
    try:
        response = client.models.embed_content(
            model=settings.embedding_model,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT"
            )
        )
        # Ensure it's a flat list, and truncate to 768 dimensions
        emb = response.embeddings[0].values
        return emb[:768]
    except Exception as e:
        logger.error(f"Gemini embedding error: {e}")
        raise

async def generate_embeddings_batch(texts: List[str], batch_size: int = 20) -> List[List[float]]:
    """Generate embeddings for a batch of texts using modern SDK."""
    if not texts:
        return []
        
    all_embeddings = []
    try:
        # Process in chunks to avoid API limits
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            response = client.models.embed_content(
                model=settings.embedding_model,
                contents=batch,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT"
                )
            )
            
            # Extract and truncate each embedding to 768 dimensions
            emb_list = [e.values[:768] for e in response.embeddings]
            all_embeddings.extend(emb_list)
            
            # Rate limiting: sleep 100ms between batches
            if i + batch_size < len(texts):
                await asyncio.sleep(0.1)
                
        return all_embeddings
    except Exception as e:
        logger.error(f"Gemini batch embedding error: {e}")
        raise

async def generate_query_embedding(text: str) -> List[float]:
    """Generate embedding for search query using modern SDK."""
    try:
        response = client.models.embed_content(
            model=settings.embedding_model,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY"
            )
        )
        emb = response.embeddings[0].values
        return emb[:768]
    except Exception as e:
        logger.error(f"Gemini query embedding error: {e}")
        raise
