from fastapi import APIRouter, HTTPException
from app.database import supabase
from pydantic import BaseModel

router = APIRouter()

class StudyProgressResponse(BaseModel):
    content_id: str
    flashcards_reviewed: int
    quiz_score: int
    quiz_attempts: int

class FlashcardReviewedResponse(BaseModel):
    status: str
    flashcards_reviewed: int

@router.get("/study-progress/{content_id}", response_model=StudyProgressResponse)
async def get_study_progress(content_id: str):
    result = supabase.table("study_progress") \
        .select("*") \
        .eq("content_id", content_id) \
        .execute()

    if not result.data:
        # Return default 0 levels if no progress is found
        return {
            "content_id": content_id,
            "flashcards_reviewed": 0,
            "quiz_score": 0,
            "quiz_attempts": 0
        }
    
    data = result.data[0]
    return {
        "content_id": content_id,
        "flashcards_reviewed": data.get("flashcards_reviewed", 0),
        "quiz_score": data.get("quiz_score", 0),
        "quiz_attempts": data.get("quiz_attempts", 0)
    }

@router.post("/study-progress/{content_id}/flashcard-reviewed", response_model=FlashcardReviewedResponse)
async def update_flashcard_progress(content_id: str):
    existing = supabase.table("study_progress") \
        .select("*").eq("content_id", content_id).execute()

    if existing.data:
        new_count = existing.data[0].get("flashcards_reviewed", 0) + 1
        supabase.table("study_progress").update({
            "flashcards_reviewed": new_count,
            "last_studied": "now()"
        }).eq("content_id", content_id).execute()
        return {"status": "success", "flashcards_reviewed": new_count}
    else:
        supabase.table("study_progress").insert({
            "content_id": content_id,
            "flashcards_reviewed": 1,
            "quiz_score": 0,
            "quiz_attempts": 0
        }).execute()
        return {"status": "success", "flashcards_reviewed": 1}
