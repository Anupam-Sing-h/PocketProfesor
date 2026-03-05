from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import content, flashcards, quiz, chat, study_progress

app = FastAPI(title="LearnAI API", version="1.0.0")

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
app.include_router(study_progress.router, tags=["Study Progress"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
