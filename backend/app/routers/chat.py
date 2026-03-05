from fastapi import APIRouter
from app.models.schemas import ChatRequest
from app.database import supabase
from sse_starlette.sse import EventSourceResponse
from app.services.rag_service import rag_chat_stream

router = APIRouter()

@router.post("/chat")
async def chat(request: ChatRequest):
    """RAG chat with streaming Server-Sent Events response."""
    return EventSourceResponse(
        rag_chat_stream(
            content_id=request.content_id,
            message=request.message,
            session_id=request.session_id
        )
    )

@router.get("/chat/history/{content_id}")
async def get_chat_history(content_id: str, session_id: str = None):
    query = supabase.table("chat_history") \
        .select("*") \
        .eq("content_id", content_id)

    if session_id:
        query = query.eq("session_id", session_id)

    result = query.order("created_at").execute()
    return {"messages": result.data}

@router.delete("/chat/history/{content_id}")
async def clear_chat_history(content_id: str):
    supabase.table("chat_history").delete().eq("content_id", content_id).execute()
    return {"status": "cleared"}

@router.get("/test_chat_insert")
async def test_chat_insert():
    try:
        import uuid
        res = supabase.table("chat_history").insert({
            "content_id": "c3f0a130-1fb3-4db6-b3c6-1450547a0aca",
            "session_id": str(uuid.uuid4()),
            "role": "user",
            "message": "test message",
            "sources": []
        }).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        return {"status": "error", "error": str(e)}
