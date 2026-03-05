# Phase 5: Integration, Polish & Enhanced Features

## Objective
Wire the frontend to the backend, add all polish features (loading states, error handling, progress tracking, animations), implement enhanced features (keyboard navigation, mobile gestures, content search, regeneration), and ensure the entire application works end-to-end. At the end of this phase, the app should feel like a production-ready premium learning platform.

---

## Prerequisites
- Phase 4 completed (all UI pages built with shadcn/ui)
- Phase 3 completed (all backend API endpoints working)
- Both servers running (`frontend` on :3000, `backend` on :8000)
- At least one content item processed in the database

---

## Step-by-Step Instructions

### Step 1: Wire All Frontend Pages to Backend API

Ensure every page correctly calls the backend through the Next.js API route proxies.

#### 1a. Home Page → Content Processing
- YouTube form `onSubmit`:
  1. Validate URL client-side (regex match)
  2. Show loading toast: `toast.loading("Processing video...")`
  3. Call `POST /api/process-video` with `{ url }`
  4. On success: dismiss toast → success toast → `router.push(/study/${data.content_id})`
  5. On error: dismiss toast → error toast with `error.detail`
- PDF form `onSubmit`:
  1. Validate file size (< 20MB) and type (.pdf)
  2. Create `FormData`, append file
  3. Show loading toast
  4. Call `POST /api/process-pdf` with FormData
  5. Same success/error flow

#### 1b. Library Page → Content Listing
- Fetch on mount: `GET /api/contents`
- Store in state, apply search filter and tab filter client-side
- Delete: `DELETE /api/contents/[id]` with confirmation dialog
- Poll for status updates: if any content is "processing", poll every 5 seconds until "ready"

#### 1c. Study Dashboard → Content Details + Progress
- Fetch on mount: `GET /api/contents/[id]`
- Fetch progress: `GET /api/study-progress/[id]` (or derive from flashcards/quiz existence)
- Check if flashcards exist: `GET /api/flashcards/[id]` — handle 404 gracefully
- Check if quiz exists: `GET /api/quiz/[id]` — handle 404 gracefully
- Show "Generate" vs "Start" button based on existence

#### 1d. Flashcards → Generate + Fetch
- On mount: try `GET /api/flashcards/[id]`
  - If 404 → show "Generate Flashcards" button
  - If success → show flashcard viewer
- Generate: `POST /api/generate-flashcards` with `{ content_id }`
- Regenerate: same call (backend deletes old + creates new)

#### 1e. Quiz → Generate + Fetch + Evaluate
- On mount: try `GET /api/quiz/[id]`
  - If 404 → show "Generate Quiz" button
- Submit answers: `POST /api/quiz/evaluate` with `{ content_id, answers: { "0": "Option A", ... } }`
- Handle evaluation response → show score dialog

#### 1f. Chat → Streaming SSE
- Follow the streaming implementation from Phase 4 Step 6d
- On mount: fetch history `GET /api/chat/history/[content_id]?session_id=xxx`
- Pre-populate messages from history
- Clear chat: `DELETE /api/chat/history/[session_id]`

---

### Step 2: Content Status Polling

When content is in "processing" status, the frontend needs to check for completion.

#### 2a. Create a Polling Hook
```typescript
// src/hooks/use-content-status.ts
export function useContentStatus(contentId: string) {
  const [status, setStatus] = useState<string>('processing');
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    if (status !== 'processing') return;

    const interval = setInterval(async () => {
      const data = await api.getContent(contentId);
      setContent(data);
      setStatus(data.status);
      if (data.status !== 'processing') {
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [contentId, status]);

  return { status, content };
}
```

#### 2b. Use in Study Dashboard
- If content status is "processing", show a progress indicator with "Content is being processed..."
- When status changes to "ready", enable the action cards with a smooth transition
- If status is "error", show error message with option to retry or delete

---

### Step 3: Study Progress Tracking

Track learning progress across flashcards, quiz, and chat.

#### 3a. Backend: Add Progress Endpoints (if not already done)

Add to `app/routers/content.py`:
```python
@router.get("/study-progress/{content_id}")
async def get_study_progress(content_id: str):
    result = supabase.table("study_progress") \
        .select("*") \
        .eq("content_id", content_id) \
        .single() \
        .execute()
    if not result.data:
        return {"content_id": content_id, "flashcards_reviewed": 0, "quiz_score": 0, "quiz_attempts": 0}
    return result.data

@router.post("/study-progress/{content_id}/flashcard-reviewed")
async def update_flashcard_progress(content_id: str):
    # Increment flashcards_reviewed count
    existing = supabase.table("study_progress").select("*").eq("content_id", content_id).execute()
    if existing.data:
        new_count = existing.data[0]["flashcards_reviewed"] + 1
        supabase.table("study_progress").update({
            "flashcards_reviewed": new_count,
            "last_studied": "now()"
        }).eq("content_id", content_id).execute()
    else:
        supabase.table("study_progress").insert({
            "content_id": content_id,
            "flashcards_reviewed": 1
        }).execute()
```

#### 3b. Frontend: Track Flashcard Reviews
- Each time user navigates to a new flashcard, call `POST /api/study-progress/[id]/flashcard-reviewed`
- Debounce to avoid excessive calls (only count unique cards viewed)
- Store viewed card indices in local state to avoid duplicate counting

#### 3c. Frontend: Quiz Score Updates
- Already handled in Phase 3's quiz evaluation endpoint
- After evaluation, refresh the study dashboard progress display

#### 3d. Progress Ring Component
Create `src/components/ui/progress-ring.tsx`:
```typescript
interface ProgressRingProps {
  value: number;    // 0-100
  size?: number;    // Default 80
  strokeWidth?: number;  // Default 8
  label: string;    // Center text
}
```
- SVG circle with animated `stroke-dashoffset`
- Primary color stroke for progress, muted for background
- Smooth transition on value change: `transition: stroke-dashoffset 0.6s ease`

---

### Step 4: Keyboard Navigation & Accessibility

#### 4a. Flashcard Keyboard Shortcuts
In flashcard viewer, add keyboard listener:
```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft':
        goToPrevious();
        break;
      case 'ArrowRight':
        goToNext();
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        toggleFlip();
        break;
    }
  }
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentIndex, isFlipped]);
```

Show keyboard hint bar below flashcards:
- "← Previous  |  Space to Flip  |  Next →"
- Use shadcn `Tooltip` wrapping each navigation button

#### 4b. Quiz Keyboard Support
- Number keys (1-4) to select options
- Enter to submit answer
- Right arrow to go to next question

#### 4c. Chat Keyboard Support
- Enter to send message
- Shift+Enter for new line

#### 4d. Global Accessibility
- All interactive elements have `aria-label` attributes
- Focus states visible (shadcn handles this via `ring` color)
- Tab order is logical on all pages

---

### Step 5: Mobile Gestures (Flashcard Swipe)

#### 5a. Touch Event Handler
In the flashcard viewer, implement swipe detection:

```typescript
// src/hooks/use-swipe.ts
export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) onSwipeLeft();  // Swipe left → next
      else onSwipeRight();               // Swipe right → previous
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
```

#### 5b. Apply to Flashcard Container
```tsx
const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(goToNext, goToPrevious);

<div
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
>
  <FlipCard ... />
</div>
```

---

### Step 6: Animations & Micro-Interactions

#### 6a. Page Transitions
Add subtle enter animations to page content:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: fadeInUp 0.4s ease-out;
}
```
Apply `page-enter` class to the main content wrapper of each page.

#### 6b. Card Hover Effects
All interactive cards should have:
```css
.interactive-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.interactive-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 30px hsl(var(--primary) / 0.2);
}
```

#### 6c. Button Press Feedback
```css
button:active {
  transform: scale(0.97);
}
```

#### 6d. Chat Message Animation
New messages should slide in:
```css
@keyframes slideInMessage {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message-enter {
  animation: slideInMessage 0.3s ease-out;
}
```

#### 6e. Theme Toggle Animation
The Sun/Moon icon should rotate on toggle:
```css
.theme-icon {
  transition: transform 0.5s ease;
}
.theme-icon.rotating {
  transform: rotate(180deg);
}
```

---

### Step 7: Error Handling & Edge Cases

#### 7a. Network Error Recovery
```typescript
// In API client, add retry logic for network errors
async function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 500 && i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

#### 7b. Handle Content Processing Errors
- If content status is "error":
  - Show error card with message
  - "Retry Processing" button to re-submit the URL/file
  - "Delete" button to remove the failed content

#### 7c. Handle Empty States Gracefully
- No flashcards → "Generate your first flashcards"
- No quiz → "Create a quiz to test your knowledge"
- No chat history → "Start a conversation about this content"
- No content in library → "Upload your first YouTube video or PDF"

#### 7d. Handle AI Generation Failures
- If flashcard/quiz generation fails (Gemini error):
  - Show error toast with "Generation failed. Please try again."
  - Don't lose existing data
  - "Retry" button

#### 7e. Session Expiry
- If SSE stream disconnects during chat:
  - Show "Connection lost. Reconnecting..." message
  - Attempt to reconnect once
  - If retry fails, show "Connection lost. Please send your message again."

---

### Step 8: Final Polish

#### 8a. Favicon & Metadata
- Add a custom favicon (create using the generate_image tool or use a simple icon)
- Update `layout.tsx` metadata:
  ```typescript
  export const metadata = {
    title: 'LearnAI — AI Learning Assistant',
    description: 'Transform YouTube videos and PDFs into interactive flashcards, quizzes, and AI-powered study sessions.',
    icons: { icon: '/favicon.ico' },
  };
  ```

#### 8b. 404 Page
Create `src/app/not-found.tsx`:
- "Page Not Found" with illustration
- "Go Home" button

#### 8c. Loading Page
Create `src/app/loading.tsx`:
- Full-page centered spinner or skeleton
- Uses shadcn `Skeleton`

#### 8d. Console Warnings
- Remove all `console.log` statements from production code
- Ensure no React key warnings or hydration mismatches

---

## Completion Checklist

- [ ] All pages wired to backend API through Next.js proxy routes
- [ ] Content status polling (3-second interval during processing)
- [ ] Study progress tracking (flashcards reviewed, quiz scores)
- [ ] Progress ring SVG component created
- [ ] Keyboard navigation: flashcards (arrows, space), quiz (1-4, enter), chat (enter)
- [ ] Mobile swipe gestures for flashcard navigation
- [ ] Page enter animations (fade in up)
- [ ] Card hover effects (lift + glow)
- [ ] Chat message slide-in animation
- [ ] Theme toggle rotation animation
- [ ] Network error retry logic (2 retries with backoff)
- [ ] Content error state handling (retry/delete)
- [ ] Empty state designs for all pages
- [ ] AI generation failure handling with retry
- [ ] SSE stream disconnect recovery
- [ ] Favicon and metadata configured
- [ ] 404 page created
- [ ] Loading page created
- [ ] No console warnings in production
