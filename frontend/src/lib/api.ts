import type {
    Content,
    FlashcardSet,
    Quiz,
    QuizEvaluation,
    ChatMessage,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
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
    throw new Error("Request failed after retries");
}

class ApiClient {
    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const response = await fetchWithRetry(`${API_BASE}${endpoint}`, {
            headers: { "Content-Type": "application/json", ...options?.headers },
            ...options,
        });

        if (!response.ok) {
            const error = await response
                .json()
                .catch(() => ({ detail: "Network error" }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // ─── Content ───

    async processVideo(url: string) {
        return this.request<{ content_id: string; title: string; status: string }>(
            "/process-video",
            { method: "POST", body: JSON.stringify({ url }) }
        );
    }

    async processPdf(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE}/process-pdf`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const error = await response
                .json()
                .catch(() => ({ detail: "Upload failed" }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        return response.json() as Promise<{
            content_id: string;
            title: string;
            status: string;
        }>;
    }

    async getContents() {
        return this.request<{ contents: Content[] }>("/contents");
    }

    async getContent(id: string) {
        return this.request<Content>(`/contents/${id}`);
    }

    async deleteContent(id: string) {
        return this.request<{ status: string }>(`/contents/${id}`, {
            method: "DELETE",
        });
    }

    // ─── Flashcards ───

    async generateFlashcards(contentId: string) {
        return this.request<FlashcardSet>("/generate-flashcards", {
            method: "POST",
            body: JSON.stringify({ content_id: contentId }),
        });
    }

    async getFlashcards(contentId: string) {
        return this.request<FlashcardSet>(`/flashcards/${contentId}`);
    }

    // ─── Quiz ───

    async generateQuiz(contentId: string) {
        return this.request<Quiz>("/generate-quiz", {
            method: "POST",
            body: JSON.stringify({ content_id: contentId }),
        });
    }

    async getQuiz(contentId: string) {
        return this.request<Quiz>(`/quiz/${contentId}`);
    }

    async evaluateQuiz(contentId: string, answers: Record<number, string>) {
        return this.request<QuizEvaluation>("/quiz/evaluate", {
            method: "POST",
            body: JSON.stringify({ content_id: contentId, answers }),
        });
    }

    // ─── Chat (SSE streaming) ───

    async *chat(
        contentId: string,
        message: string,
        sessionId: string
    ): AsyncGenerator<string, void, unknown> {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content_id: contentId,
                message,
                session_id: sessionId,
            }),
        });

        if (!response.ok) {
            const error = await response
                .json()
                .catch(() => ({ detail: "Chat failed" }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Wait until we have a complete line and process one by one
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);

                if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") return;
                    if (data) yield data;
                }
            }
        }
    }

    async getChatHistory(contentId: string) {
        return this.request<{ messages: ChatMessage[] }>(
            `/chat/history/${contentId}`
        );
    }

    async clearChatHistory(sessionId: string) {
        return this.request<{ status: string }>(`/chat/history/${sessionId}`, {
            method: "DELETE",
        });
    }

    // ─── Study Progress ───

    async getStudyProgress(contentId: string) {
        return this.request<{ content_id: string; flashcards_reviewed: number; quiz_score: number; quiz_attempts: number; }>(`/study-progress/${contentId}`);
    }

    async updateFlashcardProgress(contentId: string) {
        return this.request<{ status: string, flashcards_reviewed: number }>(`/study-progress/${contentId}/flashcard-reviewed`, {
            method: "POST"
        });
    }
}

export const api = new ApiClient();
