import json
from app.services.embedding_service import generate_query_embedding
from app.services.vector_store import search_similar_chunks
from app.database import supabase
from app.prompts.chat_prompt import CHAT_SYSTEM_PROMPT, CHAT_USER_PROMPT
from app.services.ai_service import generate_stream

async def retrieve_context(
    query: str,
    content_id: str,
    top_k: int = 5
) -> tuple[str, list[dict]]:
    """
    Retrieve relevant context for a query.
    Returns: (assembled_context_string, source_chunks)
    """
    # 1. Generate query embedding (using retrieval_query task type)
    query_embedding = await generate_query_embedding(query)

    # 2. Search for similar chunks
    similar_chunks = await search_similar_chunks(
        query_embedding=query_embedding,
        content_id=content_id,
        match_count=top_k
    )

    # 3. Assemble context string with source markers
    context_parts = []
    sources = []
    for i, chunk in enumerate(similar_chunks):
        context_parts.append(f"[Source {i+1}]: {chunk['chunk_text']}")
        sources.append({
            "chunk_index": chunk.get("chunk_index", i),
            "text_preview": chunk["chunk_text"][:100] + "...",
            "similarity": chunk.get("similarity", 0)
        })

    assembled_context = "\n\n".join(context_parts)
    return assembled_context, sources

async def get_formatted_chat_history(
    content_id: str,
    session_id: str,
    last_n: int = 10
) -> str:
    """Fetch and format recent chat history for context."""
    result = supabase.table("chat_history") \
        .select("role, message") \
        .eq("content_id", content_id) \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .limit(last_n) \
        .execute()

    if not result.data:
        return "No previous conversation."

    history_parts = []
    for msg in result.data:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_parts.append(f"{role}: {msg['message']}")

    return "\n".join(history_parts)

async def save_message(
    content_id: str,
    session_id: str,
    role: str,
    message: str,
    sources: list = None
) -> None:
    """Save a chat message to history."""
    try:
        supabase.table("chat_history").insert({
            "content_id": content_id,
            "session_id": session_id,
            "role": role,
            "message": message,
            "sources": sources or []
        }).execute()
    except Exception as e:
        import traceback
        with open("chat_error.log", "a") as f:
            f.write(f"Error saving message: {str(e)}\n{traceback.format_exc()}\n")

async def rag_chat_stream(
    content_id: str,
    message: str,
    session_id: str
):
    """
    Full RAG pipeline with streaming response.
    Yields SSE-formatted data chunks.
    """
    # 1. Retrieve relevant context
    context, sources = await retrieve_context(message, content_id, top_k=5)

    # 2. Get chat history
    chat_history = await get_formatted_chat_history(content_id, session_id)

    # 3. Build prompts
    system = CHAT_SYSTEM_PROMPT.format(context=context, chat_history=chat_history)
    user = CHAT_USER_PROMPT.format(message=message)

    # 4. Save user message to history
    await save_message(content_id, session_id, "user", message)

    # 5. Stream response
    full_response = ""
    async for chunk in generate_stream(system, user, temperature=0.7):
        full_response += chunk
        # Yield as SSE event
        yield json.dumps({'type': 'chunk', 'content': chunk})

    # 6. Send sources
    yield json.dumps({'type': 'sources', 'sources': sources})

    # 7. Save assistant response to history FIRST before sending done
    await save_message(content_id, session_id, "assistant", full_response, sources)
    
    # 8. Send done signal
    yield json.dumps({'type': 'done'})
