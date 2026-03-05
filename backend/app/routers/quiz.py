from fastapi import APIRouter, HTTPException
from app.models.schemas import GenerateRequest, QuizResponse, QuizAnswerRequest, QuizEvaluationResponse
from app.database import supabase
from app.prompts.quiz_prompt import QUIZ_SYSTEM_PROMPT, QUIZ_USER_PROMPT
from app.services.ai_service import generate_structured_json

router = APIRouter()

@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: GenerateRequest):
    content_id = request.content_id
    count = getattr(request, 'count', 8)  # Default 8

    # 1. Fetch content text
    content = supabase.table("contents").select("raw_text, status") \
        .eq("id", content_id).single().execute()
    if not content.data:
        raise HTTPException(404, "Content not found")
    if content.data["status"] != "ready":
        raise HTTPException(400, "Content is still processing")

    # 2. Truncate text if needed
    raw_text = content.data["raw_text"]
    if len(raw_text) > 15000:
        raw_text = raw_text[:15000]

    # 3. Generate quiz via AI
    system = QUIZ_SYSTEM_PROMPT.format(count=count)
    user = QUIZ_USER_PROMPT.format(count=count, content=raw_text)
    result = await generate_structured_json(system, user, temperature=0.5)

    # 4. Validate and store
    questions = result.get("questions", [])

    # Delete existing quiz for regeneration
    supabase.table("quizzes").delete().eq("content_id", content_id).execute()

    rows = []
    for i, q in enumerate(questions):
        rows.append({
            "content_id": content_id,
            "question": q["question"],
            "options": q["options"],  # JSONB
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
            "order_index": i
        })
    response = supabase.table("quizzes").insert(rows).execute()
    questions_with_ids = response.data

    return {"questions": questions_with_ids, "content_id": content_id}

@router.get("/quiz/{content_id}", response_model=QuizResponse)
async def get_quiz(content_id: str):
    result = supabase.table("quizzes") \
        .select("*") \
        .eq("content_id", content_id) \
        .order("order_index") \
        .execute()

    if not result.data:
        raise HTTPException(404, "No quiz found. Generate one first.")

    return {"questions": result.data, "content_id": content_id}

@router.post("/quiz/evaluate", response_model=QuizEvaluationResponse)
async def evaluate_quiz(request: QuizAnswerRequest):
    content_id = request.content_id
    answers = request.answers  # Dict[int, str]

    # 1. Fetch quiz questions
    quiz_data = supabase.table("quizzes") \
        .select("*") \
        .eq("content_id", content_id) \
        .order("order_index") \
        .execute()

    if not quiz_data.data:
        raise HTTPException(404, "No quiz found")

    # 2. Evaluate each answer
    results = []
    correct_count = 0
    for i, question in enumerate(quiz_data.data):
        q_id = question["id"]
        selected = answers.get(q_id)
        if selected is None:
            selected = answers.get(str(q_id), "")
            
        is_correct = selected == question["correct_answer"]
        if is_correct:
            correct_count += 1
        results.append({
            "question_id": i,
            "correct": is_correct,
            "selected_answer": selected,
            "correct_answer": question["correct_answer"],
            "explanation": question["explanation"]
        })

    total = len(quiz_data.data)
    percentage = round((correct_count / total) * 100, 1) if total > 0 else 0

    # 3. Update study progress
    existing = supabase.table("study_progress") \
        .select("*").eq("content_id", content_id).execute()

    if existing.data:
        current_best = existing.data[0].get("quiz_score", 0)
        supabase.table("study_progress").update({
            "quiz_score": max(percentage, current_best),
            "quiz_attempts": existing.data[0].get("quiz_attempts", 0) + 1,
            "last_studied": "now()"
        }).eq("content_id", content_id).execute()
    else:
        supabase.table("study_progress").insert({
            "content_id": content_id,
            "quiz_score": percentage,
            "quiz_attempts": 1,
            "flashcards_reviewed": 0
        }).execute()

    return {
        "score": correct_count,
        "total": total,
        "percentage": percentage,
        "results": results
    }
