from app.database import supabase
import logging

logger = logging.getLogger(__name__)

async def store_chunks(content_id: str, chunks: list[dict], embeddings: list[list[float]]) -> None:
    """Store text chunks with their embeddings in the chunks table."""
    if not chunks:
        return
        
    rows = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        rows.append({
            "content_id": content_id,
            "chunk_text": chunk["chunk_text"],
            "chunk_index": chunk.get("chunk_index", i),
            "embedding": embedding,
            "metadata": chunk.get("metadata", {})
        })

    # Insert in batches of 50 to avoid payload size limits
    try:
        for i in range(0, len(rows), 50):
            batch = rows[i:i + 50]
            supabase.table("chunks").insert(batch).execute()
    except Exception as e:
        logger.error(f"Error storing chunks in Supabase: {e}")
        raise

async def search_similar_chunks(
    query_embedding: list[float],
    content_id: str,
    match_count: int = 5
) -> list[dict]:
    """Find the most similar chunks to a query embedding using the match_chunks RPC."""
    try:
        result = supabase.rpc("match_chunks", {
            "query_embedding": query_embedding,
            "match_count": match_count,
            "filter_content_id": content_id
        }).execute()
        
        return result.data
    except Exception as e:
        logger.error(f"Error searching similar chunks: {e}")
        return []

async def delete_chunks(content_id: str) -> None:
    """Delete all chunks for a given content id."""
    try:
        supabase.table("chunks").delete().eq("content_id", content_id).execute()
    except Exception as e:
        logger.error(f"Error deleting chunks: {e}")
        raise
