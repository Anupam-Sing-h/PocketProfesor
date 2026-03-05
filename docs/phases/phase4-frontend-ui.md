# Phase 4: Frontend — Core UI Pages with shadcn/ui

## Objective
Build all user-facing pages with a premium, responsive design using shadcn/ui components and the Violet Bloom theme. This includes the Home/Upload page, Content Library, Study Dashboard, Flashcard Viewer (with 3D flip), Quiz Interface (with MCQ evaluation), and RAG Chat (with streaming). All pages must support dark/light theme toggle and mobile responsiveness.

---

## Prerequisites
- Phase 1 completed (Next.js + shadcn/ui + Violet Bloom theme + app shell working)
- Phase 2 & 3 completed (backend API endpoints functional)
- All shadcn/ui components installed (button, card, input, badge, progress, skeleton, dialog, separator, tooltip, tabs, scroll-area, radio-group, alert, avatar, sheet, carousel, sidebar, sonner)
- API client utility (`src/lib/api.ts`) created

---

## Design Principles (Apply to EVERY Page)

1. **Glassmorphism**: Use `.glass` and `.glass-strong` classes on cards for frosted effect
2. **Gradient accents**: Apply `.gradient-glow` backgrounds on hero sections and feature cards
3. **Glow effects**: Use `.glow-border` on hover states for interactive cards
4. **Smooth transitions**: All hover/focus states should have `transition-all duration-300`
5. **Dark mode priority**: Design for dark mode first, ensure light mode also looks premium
6. **Responsive**: Mobile-first design with sidebar collapsing on small screens
7. **Loading states**: Every async operation must show shadcn `Skeleton` or `Progress` while loading
8. **Error feedback**: All errors shown via `sonner` toast notifications

---

## Step-by-Step Instructions

### Step 1: Home / Upload Page (`src/app/page.tsx`)

This is the landing page — it must wow the user immediately.

#### 1a. Layout Structure
```
┌────────────────────────────────────────────┐
│  Animated gradient hero section            │
│  "Transform any content into learning"     │
│  Subtitle description                      │
├────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────┐   │
│  │  YouTube URL  │  │  Upload PDF      │   │
│  │  Card         │  │  Card            │   │
│  │  [Input]      │  │  [Drop Zone]     │   │
│  │  [Process]    │  │  [Upload]        │   │
│  └──────────────┘  └──────────────────┘   │
├────────────────────────────────────────────┤
│  Recent Uploads Section (if any)           │
└────────────────────────────────────────────┘
```

#### 1b. shadcn Components Used
- `Card` (CardHeader, CardTitle, CardDescription, CardContent, CardFooter) — two upload cards
- `Input` — YouTube URL text field
- `Button` — "Process Video" and "Upload File" buttons
- `Badge` — "YouTube" and "PDF" labels on cards
- `Progress` — Processing progress bar (shown during processing)
- `Dialog` — Processing status modal (optional)
- `Skeleton` — Loading state

#### 1c. Implementation Details

**Hero Section** (client component):
- Full-width gradient background using `gradient-glow` class
- Animated subtle gradient shift (CSS `@keyframes` — slow color rotation)
- Main heading: "Transform Any Content Into Interactive Learning" using `text-4xl font-bold tracking-tight`
- Subheading: "Paste a YouTube URL or upload a PDF to generate flashcards, quizzes, and chat with AI" using `text-muted-foreground`

**YouTube Card**:
- CardHeader: YouTube icon (from lucide-react: `Youtube`), title "YouTube Video", Badge "Video"
- CardContent: shadcn `Input` with `placeholder="https://youtube.com/watch?v=..."` and URL validation pattern
  - Validate URL format on change using regex (same as backend)
  - Show green checkmark icon when valid, red X when invalid
- CardFooter: `Button` with loading spinner when processing
  - onClick: call `api.processVideo(url)` → show toast → on success navigate to `/study/[id]`
- Apply `.glass` class to the card for glassmorphism effect

**PDF Card**:
- CardHeader: FileText icon, title "PDF Document", Badge "PDF"
- CardContent: Custom drag-and-drop zone:
  ```
  - Dashed border area with "Drag & drop your PDF here" text
  - "or click to browse" link
  - Hidden <input type="file" accept=".pdf" />
  - Show filename and file size after selection
  - File size validation (max 20MB client-side)
  ```
- CardFooter: `Button` "Upload & Process"
  - onClick: create FormData → call `api.processPdf(file)` → toast → navigate

**Processing State**:
- When either form is submitted, show:
  1. Button changes to loading state (spinner + "Processing...")
  2. `Progress` bar appears below the card showing estimated steps:
     - "Extracting content..." (33%)
     - "Generating embeddings..." (66%)
     - "Storing in database..." (90%)
     - "Ready!" (100%)
  3. On success: `sonner` toast "Content processed successfully!" + auto-redirect to `/study/[id]`
  4. On error: `sonner` toast with error message

**Recent Uploads Section**:
- Fetch `api.getContents()` on page load
- Show last 3-5 items as small horizontal cards
- Each shows: title, source type badge, status badge, date
- Click navigates to `/study/[id]`
- If no uploads exist, show empty state: "No content processed yet"

---

### Step 2: Content Library Page (`src/app/library/page.tsx`)

A grid/list view of all processed content.

#### 2a. Layout Structure
```
┌────────────────────────────────────────────┐
│  "Content Library" heading                 │
│  [Search Input]         [Tabs: All|YT|PDF] │
├────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐        │
│  │Content │ │Content │ │Content │ ...     │
│  │ Card 1 │ │ Card 2 │ │ Card 3 │        │
│  └────────┘ └────────┘ └────────┘        │
└────────────────────────────────────────────┘
```

#### 2b. shadcn Components Used
- `Input` — search bar with search icon
- `Tabs`, `TabsList`, `TabsTrigger` — filter: All / YouTube / PDF
- `Card` — content item cards
- `Badge` — source type + status
- `Skeleton` — loading grid (3x2 skeleton cards)
- `ScrollArea` — scrollable grid container

#### 2c. Implementation Details

**Search & Filter Bar**:
- `Input` with `Search` icon prefix, placeholder "Search content..."
- Filter in real-time as user types (debounce 300ms)
- `Tabs` with three triggers: "All", "YouTube", "PDF"
- Combined filtering: search query + source type tab

**Content Cards**:
- Each card shows:
  - **Thumbnail**: For YouTube (use `thumbnail_url`), for PDF (show a generic document icon)
  - **Title**: truncated to 2 lines
  - **Badge**: Source type ("YouTube" in red, "PDF" in blue)
  - **Badge**: Status ("Ready" in green, "Processing" in yellow, "Error" in red)
  - **Date**: relative time ("2 hours ago") using a simple formatter
  - **Progress indicator**: small ring/bar showing study progress if available
- Apply `.glass` class for glassmorphism
- Hover: `.glow-border` effect + slight scale transform (`hover:scale-[1.02]`)
- Click → navigate to `/study/[content.id]`
- **Delete button**: Small `X` button in top-right corner with confirmation dialog

**Empty State**:
- If no content: Show centered illustration + "No content yet" + button "Upload Your First Content" linking to `/`

**Loading State**:
- Grid of 6 `Skeleton` cards matching the card layout

---

### Step 3: Study Dashboard (`src/app/study/[id]/page.tsx`)

Overview page for a single piece of content with study actions.

#### 3a. Layout Structure
```
┌────────────────────────────────────────────┐
│  Content Title + Source Badge              │
│  Content summary/preview                   │
├────────────────────────────────────────────┤
│  Study Progress Overview                   │
│  [Progress Ring] Flashcards reviewed       │
│  [Progress Ring] Quiz best score           │
│  [Progress Ring] Chat sessions             │
├────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Flashcards│ │  Quiz    │ │   Chat   │  │
│  │  Card    │ │  Card    │ │   Card   │  │
│  │ [Start]  │ │ [Start]  │ │  [Open]  │  │
│  └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────────────────────────┘
```

#### 3b. shadcn Components Used
- `Card` — three action cards + content overview
- `Badge` — difficulty level, question count indicators
- `Progress` — study completion indicators
- `Button` — "Start Flashcards", "Take Quiz", "Open Chat"
- `Separator` — between sections

#### 3c. Implementation Details

**Content Header**:
- Fetch content details: `api.getContent(id)`
- Show title (large `text-2xl font-bold`)
- Source badge (YouTube/PDF)
- Content preview: first 200 chars of raw_text, truncated
- For YouTube: show thumbnail image

**Progress Rings** (Custom SVG Component):
- Create `src/components/ui/progress-ring.tsx`:
  - Circular SVG progress indicator
  - Animated stroke-dashoffset transition
  - Center text showing percentage or count
- Three rings showing:
  1. Flashcards reviewed (out of total generated)
  2. Quiz best score (percentage)
  3. Total chat messages sent

**Action Cards**:
- **Flashcards Card**: icon `Layers`, description "Review X flashcards", button "Start Flashcards" → `/study/[id]/flashcards`
- **Quiz Card**: icon `ClipboardCheck`, description "X questions available", button "Take Quiz" → `/study/[id]/quiz`
- **Chat Card**: icon `MessageSquare`, description "Ask questions about this content", button "Open Chat" → `/study/[id]/chat`
- Each card: `.glass` background, hover `.glow-border`, gradient icon background
- If flashcards/quiz not yet generated: button says "Generate" instead of "Start"

---

### Step 4: Flashcard Viewer (`src/app/study/[id]/flashcards/page.tsx`)

Interactive flashcard viewer with 3D flip animation.

#### 4a. shadcn Components Used
- `Card` — flashcard container
- `Button` — Prev / Next / Flip / Regenerate
- `Progress` — position in deck
- `Badge` — difficulty tag
- `Tooltip` — keyboard shortcut hints

#### 4b. FlipCard Component (`src/components/flashcard/flip-card.tsx`)

Create a client component with CSS 3D flip animation:

```css
/* In globals.css or a module */
.flip-card {
  perspective: 1000px;
  width: 100%;
  max-width: 600px;
  height: 350px;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.flip-card-inner.flipped {
  transform: rotateY(180deg);
}
.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.flip-card-back {
  transform: rotateY(180deg);
}
```

Component behavior:
- Clicking the card flips it (toggle `.flipped` class)
- Front: Question text + "Click to reveal" hint
- Back: Answer text + `Badge` with difficulty
- Both sides use `Card` styling with `.glass` effect

#### 4c. Page Implementation
- Fetch flashcards: `api.getFlashcards(contentId)` — if 404, show "Generate" button
- State: `currentIndex`, `isFlipped`
- **Navigation controls**:
  - `Button` "Previous" (disabled at index 0)
  - Text: "3 / 15"
  - `Button` "Next" (disabled at last index)
  - `Progress` bar showing position
- **Keyboard support** (via `useEffect` + `keydown` listener):
  - `ArrowLeft` → previous card
  - `ArrowRight` → next card
  - `Space` → flip card
- **Mobile gestures**: Use `touchstart`/`touchend` events for swipe left/right
- **Regenerate button**: `Button` variant `outline` "Regenerate Flashcards" → calls `api.generateFlashcards(contentId)` → refreshes
- **Keyboard hints**: `Tooltip` on navigation buttons showing shortcuts
- **Difficulty badge**: Show easy (green), medium (yellow), hard (red) `Badge` on each card

---

### Step 5: Quiz Interface (`src/app/study/[id]/quiz/page.tsx`)

One-question-per-screen quiz with instant feedback.

#### 5a. shadcn Components Used
- `Card` — question container
- `RadioGroup` + `RadioGroupItem` — MCQ options
- `Button` — "Submit Answer", "Next Question", "Retry", "Generate New Quiz"
- `Progress` — quiz progress bar
- `Badge` — correct/incorrect status
- `Alert` — explanation reveal
- `Dialog` — final score summary

#### 5b. Quiz States

The quiz has multiple states. Track them with a state machine:

```typescript
type QuizState = 'loading' | 'answering' | 'feedback' | 'completed';
```

#### 5c. Page Implementation

**Loading State**:
- Fetch quiz: `api.getQuiz(contentId)` — if 404, show "Generate Quiz" button
- Show `Skeleton` loader while fetching

**Answering State** (per question):
- Show `Card` with question text
- `Progress` bar: "Question 3 of 8"
- `RadioGroup` with 4 `RadioGroupItem` options:
  - Each option has hover effect (slight background change)
  - Selected option highlighted with primary color
- "Submit Answer" `Button` (disabled until option selected)

**Feedback State** (after submitting):
- Selected option turns green (correct) or red (incorrect)
- Correct answer highlighted in green if user was wrong
- `Badge` shows "Correct ✓" (green) or "Incorrect ✗" (red)
- `Alert` component appears below with `explanation` text
- "Next Question" `Button`
- Smooth transition/animation between states

**Completed State**:
- `Dialog` modal appears showing:
  - Score: "7 / 10" (large text)
  - Percentage: "70%"
  - Visual breakdown: list of questions with ✓/✗ icons
  - Performance message:
    - 90-100%: "Outstanding! 🎉"
    - 70-89%: "Great job! 👏"
    - 50-69%: "Good effort! Keep studying 📚"
    - Below 50%: "Keep learning, you'll get there! 💪"
  - Buttons: "Retry Quiz" (same questions), "Generate New Quiz", "Back to Dashboard"

**Auto-Evaluation**:
- After the last question is answered, automatically call `api.evaluateQuiz(contentId, answers)`
- Store results and show the completed state dialog

---

### Step 6: RAG Chat Interface (`src/app/study/[id]/chat/page.tsx`)

Chat-style interface with streaming AI responses.

#### 6a. shadcn Components Used
- `Card` — chat container
- `Input` — message text field
- `Button` — send + clear history
- `ScrollArea` — scrollable message list
- `Avatar` — user and AI indicators
- `Badge` — source citation chips
- `Skeleton` — typing indicator
- `Sheet` — slide-out chat history panel
- `Separator` — between message groups

#### 6b. Layout Structure
```
┌────────────────────────────────────────────┐
│  Header: "Chat about: [Content Title]"      │
│  [Chat History Button]  [Clear Chat Button] │
├────────────────────────────────────────────┤
│  ┌── ScrollArea ─────────────────────────┐ │
│  │                                        │ │
│  │  [User Avatar] User message            │ │
│  │                                        │ │
│  │  [AI Avatar] AI response...            │ │
│  │  [Source 1] [Source 2] [Source 3]       │ │
│  │                                        │ │
│  │  [User Avatar] Another message         │ │
│  │                                        │ │
│  │  [AI Avatar] Streaming response...█    │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│  [Input: "Ask a question..."]  [Send ➤]   │
└────────────────────────────────────────────┘
```

#### 6c. Chat Message Components

**Create `src/components/chat/chat-bubble.tsx`**:
- User messages: Right-aligned, primary color background
- AI messages: Left-aligned, muted/card background
- Each bubble has:
  - `Avatar` (user icon or AI sparkle icon)
  - Message text (rendered with `react-markdown` for formatting)
  - Timestamp (optional, small text)
- AI messages additionally show:
  - Source citations as `Badge` chips below the message
  - Each badge shows "Source 1", "Source 2" etc.
  - `Tooltip` on hover shows the text preview from that chunk

**Create `src/components/chat/typing-indicator.tsx`**:
- Three bouncing dots animation while AI is generating
- Use `Skeleton` or custom CSS animation

#### 6d. Streaming Implementation

```typescript
// In Chat page component
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
const [streamingText, setStreamingText] = useState('');

async function sendMessage(message: string) {
  // 1. Add user message to UI immediately
  setMessages(prev => [...prev, { role: 'user', message, ... }]);
  setIsStreaming(true);
  setStreamingText('');

  // 2. Call SSE endpoint
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_id: contentId, message, session_id: sessionId }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let sources = [];

  // 3. Read SSE stream
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'chunk') {
          fullText += data.content;
          setStreamingText(fullText);
        } else if (data.type === 'sources') {
          sources = data.sources;
        } else if (data.type === 'done') {
          setIsStreaming(false);
          setMessages(prev => [...prev, { role: 'assistant', message: fullText, sources }]);
          setStreamingText('');
        }
      }
    }
  }
}
```

#### 6e. Auto-Scroll
- Use a `useRef` on the `ScrollArea` to auto-scroll to bottom on new messages
- Scroll triggered on: new user message, streaming text update, stream complete

#### 6f. Chat History Panel
- `Sheet` (slide from right) showing past chat sessions
- `Button` in header to toggle sheet
- Each session listed with first message preview and date
- Click loads that session's messages

#### 6g. Session Management
- Generate a unique `session_id` using `crypto.randomUUID()` on page load
- Store current session_id in `useState`
- "Clear Chat" button: calls `api.clearChatHistory(sessionId)` + resets messages state

---

### Step 7: Loading & Error States (Global)

Implement consistent loading and error patterns across all pages.

#### 7a. Page Loading Wrapper
Create a reusable loading wrapper component:
```tsx
// src/components/ui/page-loading.tsx
export function PageLoading({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass">
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 7b. Error Boundary
- Wrap each page in an error boundary
- On error: show a card with error message + "Try Again" button
- Log errors to console

#### 7c. Toast Notifications
Use `sonner` consistently:
```typescript
import { toast } from 'sonner';

// Success
toast.success("Flashcards generated successfully!", {
  description: "12 flashcards ready for review"
});

// Error
toast.error("Failed to process video", {
  description: error.message
});

// Loading
toast.loading("Processing your content...");
```

---

### Step 8: Responsive Design

Ensure all pages work well on these breakpoints:
- **Mobile** (< 768px): Sidebar hidden by default (toggle via `SidebarTrigger`), single column layouts, stacked cards
- **Tablet** (768px - 1024px): Sidebar collapsed (icon-only), 2-column grids
- **Desktop** (> 1024px): Sidebar expanded, 3-column grids, full layouts

Specific responsive rules:
- Upload page: Cards stack vertically on mobile
- Library: 1 column on mobile, 2 on tablet, 3 on desktop
- Flashcards: Full-width card on all sizes, controls below on mobile
- Quiz: Full-width, options stack naturally
- Chat: Full-height viewport minus header/input on mobile
- All buttons: Full-width on mobile (`w-full sm:w-auto`)

---

## Completion Checklist

- [ ] Home page: Hero section with animated gradient
- [ ] Home page: YouTube URL input with validation
- [ ] Home page: PDF drag-and-drop upload zone
- [ ] Home page: Processing progress indicator
- [ ] Home page: Recent uploads section
- [ ] Library page: Grid of content cards with glassmorphism
- [ ] Library page: Search bar with real-time filtering
- [ ] Library page: Tab filters (All/YouTube/PDF)
- [ ] Library page: Empty state + loading skeleton grid
- [ ] Library page: Delete content with confirmation
- [ ] Study dashboard: Content overview with title/preview
- [ ] Study dashboard: Progress rings (flashcards, quiz, chat)
- [ ] Study dashboard: Three action cards (Flashcards, Quiz, Chat)
- [ ] Flashcard viewer: 3D CSS flip animation working
- [ ] Flashcard viewer: Prev/Next navigation with keyboard support (arrow keys, space)
- [ ] Flashcard viewer: Progress bar showing position in deck
- [ ] Flashcard viewer: Difficulty badge on each card
- [ ] Flashcard viewer: Regenerate button
- [ ] Flashcard viewer: Mobile swipe gestures
- [ ] Quiz interface: One question per screen with RadioGroup
- [ ] Quiz interface: Submit → instant feedback (green/red + explanation)
- [ ] Quiz interface: Progress bar (X of Y)
- [ ] Quiz interface: Final score Dialog with breakdown
- [ ] Quiz interface: Retry + Generate New Quiz buttons
- [ ] Chat interface: Message bubbles (user right, AI left)
- [ ] Chat interface: SSE streaming text rendering
- [ ] Chat interface: Typing indicator during streaming
- [ ] Chat interface: Auto-scroll to latest message
- [ ] Chat interface: Source citation Badge chips
- [ ] Chat interface: Chat history Sheet panel
- [ ] Chat interface: Clear chat functionality
- [ ] All pages: Dark/light theme toggle working correctly
- [ ] All pages: Glassmorphism effects on cards
- [ ] All pages: Skeleton loading states
- [ ] All pages: Toast notifications for success/error
- [ ] All pages: Responsive on mobile/tablet/desktop
