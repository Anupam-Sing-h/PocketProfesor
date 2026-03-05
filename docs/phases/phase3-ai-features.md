# Phase 3: Backend — AI Generation & RAG Pipeline

## Objective
Build the AI-powered features: flashcard generation, quiz generation with auto-evaluation, and the RAG-based streaming chat system. This phase uses **Google Gemini** for all LLM and embedding operations. At the end of this phase, all five core API endpoints (`/generate-flashcards`, `/generate-quiz`, `/quiz/evaluate`, `/chat`, `/chat/history`) should be fully functional.

---

## Prerequisites
- Phase 2 completed (content processing pipeline working, chunks + embeddings stored in Supabase)
- At least one content item fully processed (status: "ready") in the database for testing
- Gemini API key configured in `.env`

---

## Step-by-Step Instructions

### Step 1: Create AI Prompt Templates

These prompts are critical for output quality. Each must enforce structured JSON output.

#### 1a. `app/prompts/flashcard_prompt.py`

```python
FLASHCARD_SYSTEM_PROMPT = """You are an expert educator and learning specialist. Your task is to create high-quality flashcards from the provided content.

Rules:
1. Generate exactly {count} flashcards (between 10-15)
2. Cover the most important concepts, terms, and ideas from the content
3. Each flashcard should test a single concept
4. "front" should be a clear, concise question or prompt
5. "back" should be a comprehensive but concise answer
6. Assign difficulty: "easy" (basic recall), "medium" (understanding), "hard" (application/analysis)
7. Order flashcards from foundational concepts to advanced topics
8. Avoid yes/no questions — prefer "What", "How", "Why", "Explain" questions
9. Do NOT include information not present in the source content

You MUST respond with valid JSON only, no markdown, no code fences. Use this exact format:
{{
  "flashcards": [
    {{
      "id": 1,
      "front": "Question text here",
      "back": "Answer text here",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}"""

FLASHCARD_USER_PROMPT = """Create {count} flashcards from the following content:

--- CONTENT START ---
{content}
--- CONTENT END ---

Generate the flashcards as JSON:"""
```

#### 1b. `app/prompts/quiz_prompt.py`

```python
QUIZ_SYSTEM_PROMPT = """You are an expert test creator. Generate multiple-choice quiz questions from the provided content.

Rules:
1. Generate exactly {count} questions (between 5-10)
2. Each question should have exactly 4 options
3. Only ONE option should be correct
4. Distractors (wrong options) should be plausible but clearly incorrect
5. Provide a detailed explanation for why the correct answer is right
6. Questions should test comprehension, not just rote memorization
7. Cover different aspects of the content — don't repeat concepts
8. Questions should be answerable from the provided content alone
9. Order from easier to harder questions

You MUST respond with valid JSON only, no markdown, no code fences. Use this exact format:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "explanation": "Detailed explanation of why this is correct..."
    }}
  ]
}}"""

QUIZ_USER_PROMPT = """Create {count} multiple-choice questions from the following content:

--- CONTENT START ---
{content}
--- CONTENT END ---

Generate the quiz as JSON:"""
```

#### 1c. `app/prompts/chat_prompt.py`

```python
CHAT_SYSTEM_PROMPT = """You are LearnAI, an intelligent learning assistant. You help users understand content they have uploaded (YouTube videos or PDFs).

Behavior:
1. Answer questions based ONLY on the provided context chunks
2. If the answer is not in the context, say "I couldn't find information about that in the uploaded content."
3. Be educational — explain concepts clearly with examples when possible
4. Reference specific parts of the content when relevant
5. Keep responses well-structured with bullet points or numbered lists when appropriate
6. Be conversational but informative
7. If the user asks to summarize, provide a structured summary of the context

Context from the uploaded content:
--- CONTEXT START ---
{context}
--- CONTEXT END ---

Previous conversation:
{chat_history}"""

CHAT_USER_PROMPT = "{message}"
```

---

### Step 2: Implement AI Service (`app/services/ai_service.py`)

This is the centralized Gemini LLM interaction layer.

#### 2a. Setup
```python
import google.generativeai as genai
import json
import asyncio
from app.config import settings

genai.configure(api_key=settings.gemini_api_key)
```

#### 2b. Structured JSON Generation
```python
async def generate_structured_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_retries: int = 3
) -> dict:
    """Generate structured JSON output from Gemini with retry logic."""
    model = genai.GenerativeModel(
        model_name=settings.llm_model,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            response_mime_type="application/json"  # Force JSON output
        )
    )

    for attempt in range(max_retries):
        try:
            response = model.generate_content(user_prompt)
            result = json.loads(response.text)
            return result
        except json.JSONDecodeError:
            # Try to extract JSON from response text
            text = response.text
            # Attempt to find JSON in the response
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                result = json.loads(text[start:end])
                return result
            if attempt == max_retries - 1:
                raise ValueError(f"Failed to parse JSON after {max_retries} attempts")
            await asyncio.sleep(1 * (attempt + 1))
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(1 * (2 ** attempt))  # Exponential backoff

    raise ValueError("Failed to generate valid JSON")
```

#### 2c. Streaming Text Generation
```python
async def generate_stream(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
):
    """Stream text generation from Gemini. Yields text chunks."""
    model = genai.GenerativeModel(
        model_name=settings.llm_model,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=temperature
        )
    )

    response = model.generate_content(user_prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text
```

#### 2d. Content Summarization (for context assembly)
```python
async def summarize_for_context(full_text: str, max_chars: int = 8000) -> str:
    """If content is too long, summarize to fit within context window."""
    if len(full_text) <= max_chars:
        return full_text
    # Take first and last portions + request summary of middle
    return full_text[:max_chars]
```

---

### Step 3: Implement RAG Service (`app/services/rag_service.py`)

This orchestrates the full RAG pipeline: query → embed → retrieve → generate.

#### 3a. Context Retrieval Function
```python
from app.services.embedding_service import generate_query_embedding
from app.services.vector_store import search_similar_chunks

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
```

#### 3b. Chat History Formatting
```python
from app.database import supabase

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
```

#### 3c. Save Chat Message
```python
async def save_message(
    content_id: str,
    session_id: str,
    role: str,
    message: str,
    sources: list = None
) -> None:
    """Save a chat message to history."""
    supabase.table("chat_history").insert({
        "content_id": content_id,
        "session_id": session_id,
        "role": role,
        "message": message,
        "sources": sources or []
    }).execute()
```

#### 3d. Full RAG Chat Function (Streaming)
```python
from app.prompts.chat_prompt import CHAT_SYSTEM_PROMPT, CHAT_USER_PROMPT
from app.services.ai_service import generate_stream

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
        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

    # 6. Send sources
    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

    # 7. Send done signal
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

    # 8. Save assistant response to history
    await save_message(content_id, session_id, "assistant", full_response, sources)
```

---

### Step 4: Implement Flashcard Router (`app/routers/flashcards.py`)

#### 4a. `POST /generate-flashcards`
```python
@router.post("/generate-flashcards", response_model=FlashcardSetResponse)
async def generate_flashcards(request: GenerateRequest):
    content_id = request.content_id
    count = request.count if hasattr(request, 'count') else 12  # Default 12

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
    supabase.table("flashcards").insert(rows).execute()

    return {"flashcards": flashcards, "content_id": content_id}
```

#### 4b. `GET /flashcards/{content_id}`
```python
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
```

---

### Step 5: Implement Quiz Router (`app/routers/quiz.py`)

#### 5a. `POST /generate-quiz`
```python
@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: GenerateRequest):
    content_id = request.content_id
    count = request.count if hasattr(request, 'count') else 8  # Default 8

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
    supabase.table("quizzes").insert(rows).execute()

    return {"questions": questions, "content_id": content_id}
```

#### 5b. `GET /quiz/{content_id}`
```python
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
```

#### 5c. `POST /quiz/evaluate`
```python
@router.post("/quiz/evaluate", response_model=QuizEvaluationResponse)
async def evaluate_quiz(request: QuizAnswerRequest):
    content_id = request.content_id
    answers = request.answers  # Dict[question_id_or_index, selected_answer]

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
        q_id = str(i)  # Use index as key
        selected = answers.get(q_id, "")
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
        supabase.table("study_progress").update({
            "quiz_score": percentage,
            "quiz_attempts": existing.data[0]["quiz_attempts"] + 1,
            "last_studied": "now()"
        }).eq("content_id", content_id).execute()
    else:
        supabase.table("study_progress").insert({
            "content_id": content_id,
            "quiz_score": percentage,
            "quiz_attempts": 1
        }).execute()

    return {
        "score": correct_count,
        "total": total,
        "percentage": percentage,
        "results": results
    }
```

---

### Step 6: Implement Chat Router (`app/routers/chat.py`)

#### 6a. `POST /chat` (Streaming SSE)
```python
from sse_starlette.sse import EventSourceResponse
from app.services.rag_service import rag_chat_stream

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
```

#### 6b. `GET /chat/history/{content_id}`
```python
@router.get("/chat/history/{content_id}")
async def get_chat_history(content_id: str, session_id: str = None):
    query = supabase.table("chat_history") \
        .select("*") \
        .eq("content_id", content_id)

    if session_id:
        query = query.eq("session_id", session_id)

    result = query.order("created_at").execute()
    return {"messages": result.data}
```

#### 6c. `DELETE /chat/history/{session_id}`
```python
@router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    supabase.table("chat_history").delete().eq("session_id", session_id).execute()
    return {"status": "cleared"}
```

---

### Step 7: Create Next.js API Route Proxies for AI Features

#### 7a. `src/app/api/generate-flashcards/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await fetch(`${process.env.BACKEND_URL}/generate-flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

#### 7b. `src/app/api/generate-quiz/route.ts`
Same pattern as flashcards, proxying to `/generate-quiz` and `/quiz/evaluate`.

#### 7c. `src/app/api/chat/route.ts` (SSE Streaming Proxy)
This is the most complex proxy — it must forward the SSE stream:

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(`${process.env.BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Forward the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### Step 8: Verification

1. **Test flashcard generation**:
   ```bash
   curl -X POST http://localhost:8000/generate-flashcards \
     -H "Content-Type: application/json" \
     -d '{"content_id": "YOUR_CONTENT_ID"}'
   ```
   Verify: Returns 10-15 flashcards in correct JSON format, each with front/back/difficulty.

2. **Test quiz generation**:
   ```bash
   curl -X POST http://localhost:8000/generate-quiz \
     -H "Content-Type: application/json" \
     -d '{"content_id": "YOUR_CONTENT_ID"}'
   ```
   Verify: Returns 5-10 MCQ questions with 4 options each, correct_answer, and explanation.

3. **Test quiz evaluation**:
   ```bash
   curl -X POST http://localhost:8000/quiz/evaluate \
     -H "Content-Type: application/json" \
     -d '{"content_id": "YOUR_CONTENT_ID", "answers": {"0": "Option A", "1": "Option B"}}'
   ```
   Verify: Returns score, percentage, and per-question results.

4. **Test RAG chat**:
   ```bash
   curl -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -d '{"content_id": "YOUR_CONTENT_ID", "message": "Summarize this content", "session_id": "test-session"}'
   ```
   Verify: Returns streaming SSE events with text chunks, source citations, and done signal.

5. **Verify Supabase**:
   - Check `flashcards` table has rows with correct content_id
   - Check `quizzes` table has rows with JSONB options
   - Check `chat_history` has both user and assistant messages
   - Check `study_progress` updated after quiz evaluation

---

## Completion Checklist

- [ ] Prompt templates created for flashcards, quiz, and chat
- [ ] AI service: Gemini structured JSON generation with retry logic
- [ ] AI service: Streaming text generation working
- [ ] RAG service: Query embedding → vector search → context assembly
- [ ] RAG service: Chat history integration (last 10 messages)
- [ ] RAG service: Streaming SSE response with source citations
- [ ] Flashcard router: Generate endpoint creates 10-15 flashcards
- [ ] Flashcard router: Flashcards stored in Supabase with difficulty levels
- [ ] Flashcard router: GET endpoint retrieves saved flashcards
- [ ] Flashcard router: Regeneration deletes old and creates new
- [ ] Quiz router: Generate endpoint creates 5-10 MCQ questions
- [ ] Quiz router: Each question has 4 options + explanation
- [ ] Quiz router: GET endpoint retrieves saved quiz
- [ ] Quiz router: Evaluate endpoint scores answers with per-question feedback
- [ ] Quiz router: Study progress updated on evaluation
- [ ] Chat router: SSE streaming endpoint with RAG context
- [ ] Chat router: Chat history saved to database
- [ ] Chat router: History retrieval and deletion endpoints
- [ ] Next.js API proxies created for flashcards, quiz, and chat
- [ ] SSE streaming proxy correctly forwards stream to frontend
