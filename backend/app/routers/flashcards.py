from fastapi import APIRouter, HTTPException
from app.models.schemas import GenerateRequest, FlashcardSetResponse
from app.database import supabase
from app.prompts.flashcard_prompt import FLASHCARD_SYSTEM_PROMPT, FLASHCARD_USER_PROMPT
from app.services.ai_service import generate_structured_json
import traceback

router = APIRouter()

@router.post("/generate-flashcards", response_model=FlashcardSetResponse)
async def generate_flashcards(request: GenerateRequest):
    try:
        content_id = request.content_id
        count = getattr(request, 'count', 12)  # Default 12

        # 1. Fetch content
        content = supabase.table("contents").select("raw_text, status") \
            .eq("id", content_id).single().execute()
        if not content.data:
            raise HTTPException(404, "Content not found")
        if content.data["status"] != "ready":
            raise HTTPException(400, "Content is still processing")

        # 2. Prepare text (truncate if too long for context window)
        raw_text = content.data["raw_text"]
        if len(raw_text) > 15000:
            raw_text = raw_text[:15000]  # Gemini context limit safeguard

        # 3. Generate flashcards via AI
        system = FLASHCARD_SYSTEM_PROMPT.format(count=count)
        user = FLASHCARD_USER_PROMPT.format(count=count, content=raw_text)
        result = await generate_structured_json(system, user, temperature=0.3)

        # 4. Validate and store flashcards
        flashcards = result.get("flashcards", [])

        # Delete existing flashcards for this content (regeneration support)
        supabase.table("flashcards").delete().eq("content_id", content_id).execute()

        # Insert new flashcards
        rows = []
        for i, fc in enumerate(flashcards):
            rows.append({
                "content_id": content_id,
                "front": fc["front"],
                "back": fc["back"],
                "difficulty": fc.get("difficulty", "medium"),
                "order_index": i
            })
        response = supabase.table("flashcards").insert(rows).execute()
        flashcards_with_ids = response.data

        return {"flashcards": flashcards_with_ids, "content_id": content_id}
    except HTTPException:
        raise
    except Exception as e:
        err_str = traceback.format_exc()
        print(f"CRITICAL CRASH: {err_str}")
        import builtins
        with builtins.open("router_error.log", "w") as f:
            f.write(err_str)
        raise HTTPException(status_code=500, detail={"error": str(e), "traceback": err_str})

@router.get("/flashcards/{content_id}", response_model=FlashcardSetResponse)
async def get_flashcards(content_id: str):
    result = supabase.table("flashcards") \
        .select("*") \
        .eq("content_id", content_id) \
        .order("order_index") \
        .execute()

    if not result.data:
        raise HTTPException(404, "No flashcards found. Generate them first.")

    return {"flashcards": result.data, "content_id": content_id}
