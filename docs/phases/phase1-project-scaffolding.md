# Phase 1: Project Scaffolding & Foundation

## Objective
Set up the complete project skeleton — Next.js 15 frontend with TailwindCSS + shadcn/ui + Violet Bloom theme, and Python FastAPI backend — with all configuration, environment variables, database schema, and shared types in place. At the end of this phase, both servers should start cleanly and the UI should render a themed shell with sidebar and theme toggle.

---

## Prerequisites
- **Node.js** 18+ and **npm** installed
- **Python** 3.11+ and **pip** installed
- **Supabase** project created (URL + service role key available)
- **Google Gemini** API key available

---

## Step-by-Step Instructions

### Step 1: Create the Root Project Structure

Create the top-level directory layout:

```
c:\Assigment\Learning Platform\
├── frontend/
├── backend/
├── .env.example
└── README.md
```

Create `.env.example` at the root with:
```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Backend
BACKEND_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

### Step 2: Scaffold the Next.js 15 Frontend

1. Navigate to the project root: `c:\Assigment\Learning Platform\`
2. Run the following command to create the Next.js app inside `frontend/`:
   ```bash
   npx -y create-next-app@15 frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
   - This uses the App Router (`--app`), enables TypeScript, TailwindCSS, ESLint, creates a `src/` directory, and uses npm.
3. After creation, verify by running:
   ```bash
   cd frontend && npm run dev
   ```
   The app should start on `http://localhost:3000`.

---

### Step 3: Install Frontend Dependencies

From the `frontend/` directory, install all required packages:

```bash
npm install next-themes lucide-react class-variance-authority clsx tailwind-merge sonner react-markdown
```

**Package purposes:**
| Package | Purpose |
|---------|---------|
| `next-themes` | Dark/Light theme toggle system |
| `lucide-react` | Icon library (Sun, Moon, Upload, Book, etc.) |
| `class-variance-authority` | Variant-based component styling (required by shadcn) |
| `clsx` | Conditional className utility |
| `tailwind-merge` | Merge TailwindCSS classes without conflicts |
| `sonner` | Toast notification library |
| `react-markdown` | Render markdown in chat responses |

---

### Step 4: Initialize shadcn/ui

From the `frontend/` directory:

1. Run the shadcn init command:
   ```bash
   npx shadcn@latest init
   ```
2. When prompted, select the following options:
   - **Style**: Default
   - **Base color**: Neutral
   - **CSS variables**: Yes
   - **Tailwind CSS config**: `tailwind.config.ts`
   - **Components alias**: `@/components`
   - **Utils alias**: `@/lib/utils`
   - **React Server Components**: Yes

3. This creates:
   - `components.json` — shadcn/ui configuration
   - `src/lib/utils.ts` — the `cn()` utility function
   - Updates `tailwind.config.ts` with shadcn paths

---

### Step 5: Install All Required shadcn/ui Components

Install every shadcn component that will be used across all pages. Run from `frontend/`:

```bash
npx shadcn@latest add button card input badge progress skeleton dialog separator tooltip tabs scroll-area radio-group alert avatar sheet carousel sidebar sonner
```

This installs all components into `src/components/ui/`. The full list and their usage:

| Component | Used On |
|-----------|---------|
| `button` | Everywhere — CTAs, theme toggle, navigation |
| `card` | Upload cards, library items, flashcards, quiz, chat container |
| `input` | YouTube URL input, search bar, chat message input |
| `badge` | Source type labels, difficulty tags, status indicators |
| `progress` | Processing bar, flashcard/quiz progress |
| `skeleton` | Loading states on every page |
| `dialog` | Processing status modal, quiz score summary |
| `separator` | Visual dividers in sidebar and between sections |
| `tooltip` | Keyboard shortcut hints, collapsed sidebar labels |
| `tabs` | Library filter (All/YouTube/PDF) |
| `scroll-area` | Library grid, chat message list |
| `radio-group` | Quiz MCQ answer options |
| `alert` | Quiz explanation reveal |
| `avatar` | User and AI avatars in chat |
| `sheet` | Slide-out chat history panel |
| `carousel` | Flashcard swipe navigation (mobile) |
| `sidebar` | Main app navigation |
| `sonner` | Toast notifications |

---

### Step 6: Apply Violet Bloom Theme

Replace the contents of `src/app/globals.css` with the Violet Bloom theme tokens. This file must contain:

1. **Tailwind directives** at the top (`@tailwind base; @tailwind components; @tailwind utilities;`)

2. **Light mode CSS variables** inside `@layer base { :root { ... } }`:
   ```
   --background: #fdfdfd
   --foreground: #000000
   --card: #fdfdfd
   --card-foreground: #000000
   --popover: #fcfcfc
   --popover-foreground: #000000
   --primary: #7033ff
   --primary-foreground: #ffffff
   --secondary: #edf0f4
   --secondary-foreground: #080808
   --muted: #f5f5f5
   --muted-foreground: #525252
   --accent: #e2ebff
   --accent-foreground: #1e69dc
   --destructive: #e54b4f
   --destructive-foreground: #ffffff
   --border: #e7e7ee
   --input: #ebebeb
   --ring: #000000
   --radius: 1.4rem
   --sidebar-background: #f5f8fb
   --sidebar-foreground: #000000
   --sidebar-primary: #000000
   --sidebar-primary-foreground: #ffffff
   --sidebar-accent: #ebebeb
   --sidebar-accent-foreground: #000000
   --sidebar-border: #ebebeb
   --sidebar-ring: #000000
   ```

3. **Dark mode CSS variables** inside `.dark { ... }`:
   ```
   --background: #1a1b1e
   --foreground: #f0f0f0
   --card: #222327
   --card-foreground: #f0f0f0
   --popover: #222327
   --popover-foreground: #f0f0f0
   --primary: #8c5cff
   --primary-foreground: #ffffff
   --secondary: #2a2c33
   --secondary-foreground: #f0f0f0
   --muted: #2a2c33
   --muted-foreground: #a0a0a0
   --accent: #1e293b
   --accent-foreground: #79c0ff
   --destructive: #f87171
   --destructive-foreground: #ffffff
   --border: #33353a
   --input: #33353a
   --ring: #8c5cff
   --sidebar-background: #161618
   --sidebar-foreground: #f0f0f0
   --sidebar-primary: #8c5cff
   --sidebar-primary-foreground: #ffffff
   --sidebar-accent: #2a2c33
   --sidebar-accent-foreground: #8c5cff
   --sidebar-border: #33353a
   --sidebar-ring: #8c5cff
   ```

4. **Glassmorphism utility classes** after the base layer:
   ```css
   .glass {
     backdrop-filter: blur(12px);
     background: hsl(var(--card) / 0.6);
     border: 1px solid hsl(var(--border) / 0.3);
   }
   .glass-strong {
     backdrop-filter: blur(20px);
     background: hsl(var(--card) / 0.8);
   }
   .gradient-glow {
     background: linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.1));
   }
   .glow-border {
     box-shadow: 0 0 20px hsl(var(--primary) / 0.15);
   }
   ```

5. **Font import** — add to the very top of the file:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
   ```

6. **Body styles**:
   ```css
   body {
     font-family: 'Plus Jakarta Sans', sans-serif;
     letter-spacing: -0.025em;
   }
   ```

> [!IMPORTANT]
> The CSS variables must use HSL format for shadcn/ui compatibility. Convert the hex values above to HSL. For example, `--primary: #8c5cff` → `--primary: 259 100% 68%`.

---

### Step 7: Create Theme Provider & Toggle

#### 7a. Create `src/components/providers/theme-provider.tsx`
- Import `ThemeProvider` from `next-themes`
- Export a client component wrapper that passes:
  - `attribute="class"` — for TailwindCSS dark mode
  - `defaultTheme="dark"` — dark mode as default
  - `enableSystem={true}` — respect OS preference
  - `disableTransitionOnChange={false}` — smooth theme transitions

#### 7b. Create `src/components/layout/theme-toggle.tsx`
- Client component (`"use client"`)
- Import `useTheme` hook from `next-themes`
- Import `Sun`, `Moon` icons from `lucide-react`
- Render a shadcn `Button` (variant `"ghost"`, size `"icon"`)
- On click: toggle between `"light"` and `"dark"` theme
- Show `Sun` icon when dark mode is active (click to go light)
- Show `Moon` icon when light mode is active (click to go dark)
- Add CSS transition/animation: smooth 180° rotation on toggle

---

### Step 8: Create the App Shell (Root Layout + Sidebar)

#### 8a. Create `src/components/layout/app-sidebar.tsx`
- Use the shadcn `Sidebar` component with the following structure:
  - `SidebarHeader` — App logo/name "PocketProfesor" + branding
  - `SidebarContent` — Main navigation menu with `SidebarMenu` and `SidebarMenuItem`:
    - **Home** (icon: `Home`) → `/`
    - **Library** (icon: `Library`) → `/library`
  - `SidebarFooter` — Theme toggle button
- Use `SidebarMenuButton` for each nav item
- Highlight the active route using `usePathname()` from `next/navigation`
- Use `Tooltip` on each item for when the sidebar is collapsed

#### 8b. Create `src/components/layout/header.tsx`
- Horizontal top bar component
- Left: `SidebarTrigger` (hamburger icon to toggle sidebar)
- Center/Left: Page title (dynamic based on current route)
- Right: Theme toggle button

#### 8c. Update `src/app/layout.tsx`
- Import and wrap with `ThemeProvider`
- Import and wrap with `SidebarProvider` from shadcn
- Structure:
  ```tsx
  <ThemeProvider>
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <Header />
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
    <Toaster /> {/* from sonner */}
  </ThemeProvider>
  ```
- Add the Plus Jakarta Sans font via `next/font/google`
- Set metadata: title "PocketProfesor — AI Learning Assistant", description

---

### Step 9: Create Placeholder Pages

Create minimal placeholder pages so navigation works:

#### `src/app/page.tsx` (Home)
- Render a simple centered heading: "Upload Content to Get Started"
- Two placeholder cards (YouTube + PDF)
- Use shadcn `Card` components

#### `src/app/library/page.tsx`
- Heading: "Content Library"
- Empty state message: "No content processed yet"

#### `src/app/study/[id]/page.tsx`
- Heading: "Study Dashboard"
- Placeholder text

#### `src/app/study/[id]/flashcards/page.tsx`
- Heading: "Flashcards"

#### `src/app/study/[id]/quiz/page.tsx`
- Heading: "Quiz"

#### `src/app/study/[id]/chat/page.tsx`
- Heading: "Chat with Content"

---

### Step 10: Create TypeScript Types

Create `src/types/index.ts` with all shared types:

```typescript
// Content types
export interface Content {
  id: string;
  title: string;
  source_type: 'youtube' | 'pdf';
  source_url: string;
  raw_text: string;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
  thumbnail_url?: string;
}

// Flashcard types
export interface Flashcard {
  id: number;
  content_id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
}

export interface FlashcardSet {
  flashcards: Flashcard[];
  content_id: string;
}

// Quiz types
export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface Quiz {
  questions: QuizQuestion[];
  content_id: string;
}

export interface QuizEvaluation {
  score: number;
  total: number;
  percentage: number;
  results: {
    question_id: number;
    correct: boolean;
    selected_answer: string;
    correct_answer: string;
    explanation: string;
  }[];
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  sources?: string[];
  created_at: string;
}

// Study Progress
export interface StudyProgress {
  content_id: string;
  flashcards_reviewed: number;
  quiz_score: number;
  quiz_attempts: number;
  last_studied: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

---

### Step 11: Create API Client Utility

Create `src/lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Content
  processVideo(url: string) { ... }
  processPdf(file: File) { ... }
  getContents() { ... }
  getContent(id: string) { ... }
  deleteContent(id: string) { ... }

  // Flashcards
  generateFlashcards(contentId: string) { ... }
  getFlashcards(contentId: string) { ... }

  // Quiz
  generateQuiz(contentId: string) { ... }
  getQuiz(contentId: string) { ... }
  evaluateQuiz(contentId: string, answers: Record<number, string>) { ... }

  // Chat (streaming)
  async *chat(contentId: string, message: string, sessionId: string) { ... }
  getChatHistory(contentId: string) { ... }
  clearChatHistory(sessionId: string) { ... }
}

export const api = new ApiClient();
```

Implement each method as a stub that calls the correct endpoint. The `chat()` method should be an async generator that reads an SSE stream.

---

### Step 12: Scaffold the FastAPI Backend

1. Navigate to `c:\Assigment\Learning Platform\backend\`

2. Create the Python virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```

3. Create `requirements.txt`:
   ```
   fastapi==0.115.0
   uvicorn[standard]==0.30.0
   python-dotenv==1.0.1
   supabase==2.9.1
   google-generativeai==0.8.3
   youtube-transcript-api==0.6.2
   PyMuPDF==1.24.0
   python-multipart==0.0.12
   pydantic==2.9.0
   pydantic-settings==2.5.0
   sse-starlette==2.1.0
   httpx==0.27.0
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create the directory structure:
   ```
   backend/
   ├── app/
   │   ├── __init__.py
   │   ├── main.py
   │   ├── config.py
   │   ├── database.py
   │   ├── models/
   │   │   ├── __init__.py
   │   │   ├── schemas.py
   │   │   └── database.py
   │   ├── routers/
   │   │   ├── __init__.py
   │   │   ├── content.py
   │   │   ├── flashcards.py
   │   │   ├── quiz.py
   │   │   └── chat.py
   │   ├── services/
   │   │   ├── __init__.py
   │   │   ├── youtube_service.py
   │   │   ├── pdf_service.py
   │   │   ├── chunking_service.py
   │   │   ├── embedding_service.py
   │   │   ├── vector_store.py
   │   │   ├── ai_service.py
   │   │   └── rag_service.py
   │   └── prompts/
   │       ├── __init__.py
   │       ├── flashcard_prompt.py
   │       ├── quiz_prompt.py
   │       └── chat_prompt.py
   ├── tests/
   │   └── __init__.py
   ├── requirements.txt
   └── .env.example
   ```

6. Create `.env.example` in `backend/`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
   FRONTEND_URL=http://localhost:3000
   EMBEDDING_MODEL=models/text-embedding-004
   LLM_MODEL=models/gemini-2.0-flash
   ```

---

### Step 13: Create Backend Foundation Files

#### 13a. `app/config.py`
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str
    supabase_url: str
    supabase_service_key: str
    frontend_url: str = "http://localhost:3000"
    embedding_model: str = "models/text-embedding-004"
    llm_model: str = "models/gemini-2.0-flash"

    class Config:
        env_file = ".env"

settings = Settings()
```

#### 13b. `app/database.py`
```python
from supabase import create_client, Client
from app.config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)
```

#### 13c. `app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import content, flashcards, quiz, chat

app = FastAPI(title="PocketProfesor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(content.router, tags=["Content"])
app.include_router(flashcards.router, tags=["Flashcards"])
app.include_router(quiz.router, tags=["Quiz"])
app.include_router(chat.router, tags=["Chat"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
```

#### 13d. Create stub routers
Each router file (`content.py`, `flashcards.py`, `quiz.py`, `chat.py`) should contain:
- An `APIRouter` instance with appropriate prefix
- Stub endpoint functions that return `{"status": "not implemented"}` for now
- Correct HTTP methods and path patterns as defined in the implementation plan

---

### Step 14: Set Up Supabase Database Schema

Log into the Supabase dashboard and run the following SQL in the SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Contents table
CREATE TABLE contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'pdf')),
  source_url TEXT,
  raw_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  thumbnail_url TEXT,
  page_count INTEGER,
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chunks table with vector embeddings
CREATE TABLE chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(768),  -- Gemini text-embedding-004 uses 768 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Flashcards table
CREATE TABLE flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quizzes table
CREATE TABLE quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Chat history table
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Study progress table
CREATE TABLE study_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  flashcards_reviewed INTEGER DEFAULT 0,
  quiz_score FLOAT DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  last_studied TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id)
);

-- Create index for vector similarity search
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 5,
  filter_content_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.chunk_text,
    chunks.chunk_index,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE (filter_content_id IS NULL OR chunks.content_id = filter_content_id)
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

> [!IMPORTANT]
> Note: Gemini's `text-embedding-004` model uses **768 dimensions** (not 1536 like OpenAI). The schema reflects this. Update the TypeScript types accordingly if needed.

---

### Step 15: Create Pydantic Schemas

Create `app/models/schemas.py` with all request/response models:

- `ProcessVideoRequest` — `{ url: str }`
- `ProcessVideoResponse` — `{ content_id: str, title: str, status: str }`
- `ContentResponse` — Full content object matching the DB schema
- `ContentListResponse` — `{ contents: List[ContentResponse] }`
- `FlashcardResponse` — Single flashcard
- `FlashcardSetResponse` — `{ flashcards: List[FlashcardResponse], content_id: str }`
- `GenerateRequest` — `{ content_id: str }`
- `QuizQuestionResponse` — Single quiz question
- `QuizResponse` — `{ questions: List[QuizQuestionResponse], content_id: str }`
- `QuizAnswerRequest` — `{ content_id: str, answers: Dict[int, str] }`
- `QuizEvaluationResponse` — `{ score: int, total: int, percentage: float, results: List }`
- `ChatRequest` — `{ content_id: str, message: str, session_id: str }`
- `ChatMessageResponse` — `{ role: str, message: str, sources: List[str] }`
- `ErrorResponse` — `{ detail: str, error_code: str }`

---

### Step 16: Create Frontend Environment Config

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
BACKEND_URL=http://localhost:8000
```

Update `frontend/next.config.mjs` to handle API proxying (optional, API routes will proxy):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

---

### Step 17: Verify Both Servers Start

1. **Backend**: From `backend/`, run:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Verify `http://localhost:8000/health` returns `{"status": "healthy"}`.

2. **Frontend**: From `frontend/`, run:
   ```bash
   npm run dev
   ```
   Verify `http://localhost:3000` renders the app shell with:
   - Sidebar with navigation items
   - Theme toggle button
   - Dark mode enabled by default
   - Home page with placeholder content

---

## Completion Checklist

- [ ] Next.js 15 project created with App Router + TailwindCSS
- [ ] All 18 shadcn/ui components installed
- [ ] Violet Bloom theme applied (light + dark CSS variables)
- [ ] Glassmorphism utility classes added
- [ ] Theme provider + toggle working (dark ↔ light)
- [ ] App shell: sidebar + header + content area rendering
- [ ] All 6 placeholder pages created with navigation
- [ ] TypeScript types defined for all data models
- [ ] API client utility created with all method stubs
- [ ] FastAPI backend scaffolded with all directories
- [ ] Backend dependencies installed
- [ ] Config, database, and main.py created
- [ ] Stub routers created for all 4 route groups
- [ ] Pydantic schemas defined for all request/response models
- [ ] Supabase database schema applied (6 tables + vector function)
- [ ] Both servers start without errors
- [ ] `.env.example` files created for both frontend and backend
