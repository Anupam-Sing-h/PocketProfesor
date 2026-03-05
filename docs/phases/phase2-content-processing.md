# Phase 2: Backend — Content Processing Pipeline

## Objective
Build the complete content ingestion pipeline: YouTube transcript extraction, PDF text extraction, text chunking engine, Gemini embedding generation, and Supabase pgvector storage. At the end of this phase, a user should be able to call `POST /process-video` or `POST /process-pdf` and have the content fully processed, chunked, embedded, and stored — ready for AI features.

---

## Prerequisites
- Phase 1 completed (backend scaffold, database schema, all dependencies installed)
- `.env` configured with `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Supabase database schema applied (tables: `contents`, `chunks`)
- Virtual environment activated with all packages from `requirements.txt`

---

## Step-by-Step Instructions

### Step 1: Implement YouTube Service (`app/services/youtube_service.py`)

This service extracts transcripts from YouTube videos.

#### 1a. URL Parsing Function
Create a function `extract_video_id(url: str) -> str` that:
- Accepts multiple YouTube URL formats:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://m.youtube.com/watch?v=VIDEO_ID`
  - `https://youtube.com/shorts/VIDEO_ID`
- Uses regex pattern: `r'(?:v=|v\/|vi\/|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})'`
- Raises `ValueError("Invalid YouTube URL")` if no match found

#### 1b. Transcript Extraction Function
Create an async function `get_transcript(url: str) -> dict`:

```python
async def get_transcript(url: str) -> dict:
    """
    Returns:
    {
        "video_id": str,
        "title": str,
        "transcript_text": str,
        "duration": str,
        "thumbnail_url": str
    }
    """
```

Implementation:
1. Call `extract_video_id(url)` to get the video ID
2. Use `youtube_transcript_api.YouTubeTranscriptApi.get_transcript(video_id)` to fetch the transcript
   - This returns a list of `{"text": str, "start": float, "duration": float}`
3. **Fallback**: If the manual transcript is unavailable, try:
   ```python
   transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
   transcript = transcript_list.find_generated_transcript(['en'])
   ```
4. Join all transcript segments into a single string: `" ".join([segment["text"] for segment in transcript])`
5. Calculate total duration from the last segment's `start + duration`
6. Generate thumbnail URL: `f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"`
7. For the title, use the video_id as a fallback — or optionally fetch from YouTube's oEmbed API:
   ```python
   import httpx
   resp = await httpx.AsyncClient().get(f"https://www.youtube.com/oembed?url=https://youtube.com/watch?v={video_id}&format=json")
   title = resp.json().get("title", video_id)
   ```

#### 1c. Error Handling
- `TranscriptsDisabled` → raise HTTPException 400: "Transcripts are disabled for this video"
- `NoTranscriptFound` → raise HTTPException 400: "No transcript available for this video"
- `VideoUnavailable` → raise HTTPException 404: "Video not found"
- Generic exceptions → raise HTTPException 500 with logged error

---

### Step 2: Implement PDF Service (`app/services/pdf_service.py`)

This service extracts text from uploaded PDF files.

#### 2a. PDF Extraction Function
```python
import fitz  # PyMuPDF

async def extract_pdf_text(file_bytes: bytes, filename: str) -> dict:
    """
    Returns:
    {
        "title": str,           # Derived from filename (without .pdf extension)
        "full_text": str,       # All extracted text
        "page_count": int,      # Number of pages
        "pages": [              # Per-page text for metadata
            {"page_num": 1, "text": "..."},
            ...
        ]
    }
    """
```

Implementation:
1. Open the PDF from bytes: `doc = fitz.open(stream=file_bytes, filetype="pdf")`
2. Iterate through each page:
   ```python
   pages = []
   full_text_parts = []
   for page_num, page in enumerate(doc, 1):
       text = page.get_text("text")
       pages.append({"page_num": page_num, "text": text})
       full_text_parts.append(text)
   ```
3. Join all page texts: `full_text = "\n\n".join(full_text_parts)`
4. Derive title from filename: `title = filename.rsplit(".", 1)[0]`
5. Return the structured result

#### 2b. Validation Function
```python
def validate_pdf(file_bytes: bytes, filename: str) -> None:
```
- Check file size ≤ 20MB: `if len(file_bytes) > 20 * 1024 * 1024: raise ValueError("File too large (max 20MB)")`
- Check file extension: `if not filename.lower().endswith('.pdf'): raise ValueError("Only PDF files are accepted")`
- Try opening to verify it's a valid PDF: wrap `fitz.open()` in try/except

#### 2c. Error Handling
- Invalid PDF → HTTPException 400: "Corrupted or invalid PDF file"
- Empty PDF (no text) → HTTPException 400: "PDF contains no extractable text"
- File too large → HTTPException 413: "File exceeds 20MB limit"

---

### Step 3: Implement Chunking Service (`app/services/chunking_service.py`)

This service splits long text into overlapping chunks suitable for embedding.

#### 3a. Recursive Text Splitter
```python
def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    metadata: dict = None
) -> list[dict]:
    """
    Returns list of:
    {
        "chunk_text": str,
        "chunk_index": int,
        "metadata": {
            "source_page": int | None,
            "start_char": int,
            "end_char": int,
            ...any additional metadata
        }
    }
    """
```

Implementation:
1. **Sentence-aware splitting**: Split on sentence boundaries (`.`, `!`, `?` followed by whitespace or newline), not mid-sentence
2. **Algorithm**:
   - Split text into sentences using regex: `re.split(r'(?<=[.!?])\s+', text)`
   - Build chunks by accumulating sentences until `chunk_size` characters is reached
   - When a chunk is full, save it and start the next chunk with `chunk_overlap` characters of overlap from the end of the previous chunk
   - Track `chunk_index` (0-based)
3. **Edge cases**:
   - If a single sentence exceeds `chunk_size`, split it by words
   - Ensure minimum chunk size of 100 characters (don't create tiny trailing chunks)
   - Strip whitespace from each chunk

#### 3b. Page-Aware Chunking (for PDFs)
```python
def chunk_text_with_pages(pages: list[dict], chunk_size: int = 1000, chunk_overlap: int = 200) -> list[dict]:
```
- Takes the `pages` array from PDF extraction
- Preserves the `source_page` number in each chunk's metadata
- Same splitting logic but tracks which page each chunk originated from

---

### Step 4: Implement Embedding Service (`app/services/embedding_service.py`)

This service generates vector embeddings using Google Gemini's embedding model.

#### 4a. Setup
```python
import google.generativeai as genai
from app.config import settings

genai.configure(api_key=settings.gemini_api_key)
```

#### 4b. Single Embedding Function
```python
async def generate_embedding(text: str) -> list[float]:
    """Generate a 768-dimensional embedding for a single text."""
    result = genai.embed_content(
        model=settings.embedding_model,  # "models/text-embedding-004"
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']  # Returns list of 768 floats
```

#### 4c. Batch Embedding Function
```python
async def generate_embeddings_batch(texts: list[str], batch_size: int = 20) -> list[list[float]]:
    """Generate embeddings for multiple texts with batching and rate limiting."""
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Gemini supports batch embedding
        result = genai.embed_content(
            model=settings.embedding_model,
            content=batch,
            task_type="retrieval_document"
        )
        all_embeddings.extend(result['embedding'])
        # Rate limiting: sleep 100ms between batches
        if i + batch_size < len(texts):
            await asyncio.sleep(0.1)
    return all_embeddings
```

#### 4d. Query Embedding Function
```python
async def generate_query_embedding(text: str) -> list[float]:
    """Generate embedding optimized for query/retrieval."""
    result = genai.embed_content(
        model=settings.embedding_model,
        content=text,
        task_type="retrieval_query"  # Different task type for queries
    )
    return result['embedding']
```

> [!IMPORTANT]
> Gemini distinguishes between `retrieval_document` (for storing) and `retrieval_query` (for searching). Use the correct task_type for optimal similarity results.

#### 4e. Retry Logic
Wrap all embedding calls with retry logic:
```python
import asyncio
from functools import wraps

def with_retry(max_retries=3, base_delay=1.0):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
        return wrapper
    return decorator
```

Apply `@with_retry()` to all embedding functions.

---

### Step 5: Implement Vector Store (`app/services/vector_store.py`)

This service handles storing and retrieving embeddings from Supabase pgvector.

#### 5a. Store Chunks with Embeddings
```python
from app.database import supabase

async def store_chunks(content_id: str, chunks: list[dict], embeddings: list[list[float]]) -> None:
    """Store text chunks with their embeddings in the chunks table."""
    rows = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        rows.append({
            "content_id": content_id,
            "chunk_text": chunk["chunk_text"],
            "chunk_index": chunk["chunk_index"],
            "embedding": embedding,  # list of 768 floats
            "metadata": chunk.get("metadata", {})
        })

    # Insert in batches of 50
    for i in range(0, len(rows), 50):
        batch = rows[i:i + 50]
        supabase.table("chunks").insert(batch).execute()
```

#### 5b. Semantic Similarity Search
```python
async def search_similar_chunks(
    query_embedding: list[float],
    content_id: str,
    match_count: int = 5
) -> list[dict]:
    """Find the most similar chunks to a query embedding."""
    result = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_count": match_count,
        "filter_content_id": content_id
    }).execute()

    return result.data  # List of {id, chunk_text, chunk_index, metadata, similarity}
```

#### 5c. Delete Chunks for Content
```python
async def delete_chunks(content_id: str) -> None:
    """Delete all chunks for a given content."""
    supabase.table("chunks").delete().eq("content_id", content_id).execute()
```

---

### Step 6: Implement Content Router (`app/routers/content.py`)

Replace the stub router with the full implementation.

#### 6a. `POST /process-video`
```python
@router.post("/process-video", response_model=ProcessVideoResponse)
async def process_video(request: ProcessVideoRequest, background_tasks: BackgroundTasks):
```

Implementation flow:
1. Validate the YouTube URL format
2. Create a `contents` record in Supabase with `status: "processing"`
3. Add background task to process asynchronously:
   ```python
   background_tasks.add_task(process_video_task, content_id, request.url)
   ```
4. Return immediately with `{ content_id, title: "Processing...", status: "processing" }`

Background task function `process_video_task(content_id, url)`:
1. Extract transcript using `youtube_service.get_transcript(url)`
2. Update content record with `title`, `raw_text`, `thumbnail_url`, `duration`
3. Chunk the transcript using `chunking_service.chunk_text(raw_text)`
4. Generate embeddings using `embedding_service.generate_embeddings_batch(chunk_texts)`
5. Store chunks + embeddings using `vector_store.store_chunks(content_id, chunks, embeddings)`
6. Update content status to `"ready"`
7. On any error: update content status to `"error"` and log the error

#### 6b. `POST /process-pdf`
```python
@router.post("/process-pdf", response_model=ProcessVideoResponse)
async def process_pdf(file: UploadFile = File(...), background_tasks: BackgroundTasks):
```

Implementation flow:
1. Read file bytes: `file_bytes = await file.read()`
2. Validate the PDF using `pdf_service.validate_pdf(file_bytes, file.filename)`
3. Create a `contents` record with `status: "processing"`, `source_type: "pdf"`
4. Add background task to process asynchronously
5. Return immediately

Background task function `process_pdf_task(content_id, file_bytes, filename)`:
1. Extract text using `pdf_service.extract_pdf_text(file_bytes, filename)`
2. Update content record with `title`, `raw_text`, `page_count`
3. Chunk text using `chunking_service.chunk_text_with_pages(pages)`
4. Generate embeddings batch
5. Store chunks + embeddings
6. Update content status to `"ready"`
7. Error fallback to `"error"` status

#### 6c. `GET /contents`
```python
@router.get("/contents", response_model=ContentListResponse)
async def list_contents():
    result = supabase.table("contents").select("*").order("created_at", desc=True).execute()
    return {"contents": result.data}
```

#### 6d. `GET /contents/{id}`
```python
@router.get("/contents/{content_id}", response_model=ContentResponse)
async def get_content(content_id: str):
    result = supabase.table("contents").select("*").eq("id", content_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Content not found")
    return result.data
```

#### 6e. `DELETE /contents/{id}`
```python
@router.delete("/contents/{content_id}")
async def delete_content(content_id: str):
    # CASCADE will delete chunks, flashcards, quizzes, chat_history, study_progress
    supabase.table("contents").delete().eq("id", content_id).execute()
    return {"status": "deleted"}
```

---

### Step 7: Create Next.js API Route Proxies

Create proxy routes that forward frontend requests to the FastAPI backend:

#### 7a. `src/app/api/process-video/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${process.env.BACKEND_URL}/process-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ detail: 'Failed to process video' }, { status: 500 });
  }
}
```

#### 7b. `src/app/api/process-pdf/route.ts`
- Accept `FormData` from the frontend
- Forward the file to FastAPI's `/process-pdf` endpoint
- Handle multipart forwarding

#### 7c. Create similar proxy routes for:
- `src/app/api/contents/route.ts` — GET all contents
- `src/app/api/contents/[id]/route.ts` — GET / DELETE single content

---

### Step 8: Verification

1. **Backend unit tests** — create `backend/tests/test_content.py`:
   - Test YouTube URL parsing with valid/invalid URLs
   - Test PDF validation (size, format)
   - Test chunking with known text input → verify chunk count, overlap
2. **Integration test** — use `httpx` to call:
   - `POST /process-video` with a real YouTube URL → verify content created
   - `GET /contents` → verify the content appears in the list
   - Wait for processing → `GET /contents/{id}` → verify status is "ready"
3. **Verify in Supabase dashboard**:
   - Check `contents` table has the new row with status "ready"
   - Check `chunks` table has multiple rows with embeddings

---

## Completion Checklist

- [ ] YouTube service: URL parsing works for all 5+ URL formats
- [ ] YouTube service: Transcript extraction works with fallback to auto-captions
- [ ] PDF service: Text extraction works for multi-page PDFs
- [ ] PDF service: Validation rejects oversized/invalid files
- [ ] Chunking service: Sentence-aware splitting with configurable size/overlap
- [ ] Chunking service: Page-aware chunking for PDFs preserves page metadata
- [ ] Embedding service: Gemini embeddings generated (768 dimensions)
- [ ] Embedding service: Batch processing with rate limiting
- [ ] Embedding service: Retry logic with exponential backoff
- [ ] Vector store: Chunks stored in Supabase with embeddings
- [ ] Vector store: Semantic similarity search returns ranked results
- [ ] Content router: `POST /process-video` processes asynchronously
- [ ] Content router: `POST /process-pdf` handles file upload
- [ ] Content router: `GET /contents` lists all content
- [ ] Content router: `GET /contents/{id}` returns single content
- [ ] Content router: `DELETE /contents/{id}` cascades deletion
- [ ] Next.js API proxies created for all content endpoints
- [ ] All error cases handled with appropriate HTTP status codes
