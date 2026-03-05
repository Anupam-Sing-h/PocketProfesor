"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, History, Trash2, ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ChatMessage, Content } from "@/types";

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const contentId = params.id as string;

    const [content, setContent] = useState<Content | null>(null);
    const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const [inputValue, setInputValue] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [streamingSources, setStreamingSources] = useState<string[]>([]);
    const [sessionId, setSessionId] = useState<string>("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Generate new session on load if not set
        setSessionId(crypto.randomUUID());

        if (contentId) {
            fetchContentDetails();
            fetchHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentId]);

    const fetchContentDetails = async () => {
        try {
            const data = await api.getContent(contentId);
            setContent(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchHistory = async () => {
        try {
            const data = await api.getChatHistory(contentId);
            if (data && data.messages) {
                setAllMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const sessions = (() => {
        const map = new Map<string, { id: string, preview: string, date: string, count: number }>();
        allMessages.forEach(msg => {
            if (!msg.session_id) return;
            if (!map.has(msg.session_id)) {
                map.set(msg.session_id, {
                    id: msg.session_id,
                    preview: msg.role === 'user' ? msg.message : 'Chat Session',
                    date: msg.created_at,
                    count: 1
                });
            } else {
                const data = map.get(msg.session_id)!;
                data.count++;
                if (msg.role === 'user' && data.preview === 'Chat Session') {
                    data.preview = msg.message;
                }
            }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    })();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingText, isStreaming]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isStreaming) return;

        const userMessage = inputValue.trim();
        setInputValue("");

        const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            message: userMessage,
            created_at: new Date().toISOString(),
            session_id: sessionId
        };

        setMessages(prev => [...prev, newMsg]);
        setAllMessages(prev => [...prev, newMsg]);
        setIsStreaming(true);
        setStreamingText("");
        setStreamingSources([]);

        try {
            let fullText = "";
            let finalSources: string[] = [];

            const stream = api.chat(contentId, userMessage, sessionId);

            for await (const chunk of stream) {
                try {
                    const data = JSON.parse(chunk);
                    if (data.type === 'chunk') {
                        fullText += data.content;
                        setStreamingText(fullText);
                    } else if (data.type === 'sources') {
                        finalSources = data.sources;
                        setStreamingSources(finalSources);
                    } else if (data.type === 'done') {
                        break;
                    }
                } catch {
                    console.error("Parse error chunk", chunk);
                }
            }

            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                message: fullText,
                sources: finalSources,
                created_at: new Date().toISOString(),
                session_id: sessionId
            };

            setIsStreaming(false);
            setMessages(prev => [...prev, assistantMsg]);
            setAllMessages(prev => [...prev, assistantMsg]);
            setStreamingText("");
            setStreamingSources([]);

        } catch (error) {
            toast.error("Failed to send message", { description: error instanceof Error ? error.message : "Unknown error" });
            setIsStreaming(false);
        }
    };

    const clearHistory = async () => {
        try {
            await api.clearChatHistory(contentId);
            setAllMessages([]);
            setMessages([]);
            setSessionId(crypto.randomUUID());
            toast.success("Chat history cleared");
        } catch (error) {
            toast.error("Failed to clear history", { description: error instanceof Error ? error.message : "Unknown error" });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] max-w-5xl mx-auto w-full pt-4 pb-6 px-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-card border rounded-t-2xl p-4 shadow-sm z-10 glass">
                <div className="flex items-center gap-4 relative z-10">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/study/${contentId}`)} className="shrink-0 group">
                        <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    </Button>
                    <div className="overflow-hidden">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                            Chat: {content?.title || "Loading..."}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase font-medium">
                                AI Assistant
                            </Badge>
                            <span className="text-xs text-muted-foreground hidden md:inline">Ask anything about this document</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear Chat">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </Button>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="hidden sm:flex">
                                <History className="h-4 w-4 mr-2" /> History
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
                            <SheetHeader>
                                <SheetTitle>Chat History</SheetTitle>
                                <SheetDescription className="flex justify-between items-center pr-6">
                                    <span>Previous sessions for this document.</span>
                                    <Button size="sm" variant="outline" onClick={() => { setSessionId(crypto.randomUUID()); setMessages([]); }}>
                                        New Chat
                                    </Button>
                                </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="flex-1 mt-6 -mx-6 px-6">
                                <div className="space-y-4 pb-6 pt-2">
                                    {sessions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No history yet.</p>
                                    ) : (
                                        sessions.map((sess) => (
                                            <button
                                                key={sess.id}
                                                onClick={() => {
                                                    setSessionId(sess.id);
                                                    setMessages(allMessages.filter(m => m.session_id === sess.id));
                                                }}
                                                className={`w-full text-left p-4 rounded-xl border transition-all hover:bg-muted ${sessionId === sess.id ? 'bg-muted border-primary/50' : 'bg-background'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {new Date(sess.date).toLocaleDateString()} {new Date(sess.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px]">{sess.count} msgs</Badge>
                                                </div>
                                                <p className="text-sm font-medium line-clamp-2">
                                                    {sess.preview}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-muted/20 border-x relative overflow-hidden flex flex-col">
                {messages.length === 0 && !isStreaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 overflow-y-auto">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Bot className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">How can I help you?</h3>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            I&apos;m an AI assistant with deep knowledge of <strong>{content?.title || "this content"}</strong>. Ask me anything to jump-start your learning.
                        </p>
                        <div className="flex flex-col gap-2 w-full max-w-md">
                            <Button variant="outline" className="justify-start text-left h-auto py-3 px-4 bg-background hover:bg-muted/50 transition-colors" onClick={() => setInputValue("Summarize the main points of this content.")}>
                                Summarize the main points of this content
                            </Button>
                            <Button variant="outline" className="justify-start text-left h-auto py-3 px-4 bg-background hover:bg-muted/50 transition-colors" onClick={() => setInputValue("What are the key definitions I should remember?")}>
                                What are the key definitions I should remember?
                            </Button>
                        </div>
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-0">
                    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 md:p-6 pb-4">
                        {messages.map((msg, idx) => (
                            <ChatBubble key={msg.id || idx} message={msg} />
                        ))}

                        {isStreaming && (
                            <div className="flex flex-col gap-2">
                                {streamingText ? (
                                    <ChatBubble
                                        message={{
                                            id: "streaming",
                                            role: "assistant",
                                            message: streamingText,
                                            sources: streamingSources,
                                            created_at: new Date().toISOString()
                                        }}
                                    />
                                ) : (
                                    <div className="flex w-full justify-start">
                                        {/* Using the component directly to match structure */}
                                        <TypingIndicator />
                                    </div>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-px bg-transparent" />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="bg-card border rounded-b-2xl p-4 glass relative z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-3">
                    <div className="relative flex-1">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question about this content..."
                            className="py-6 pl-4 pr-12 rounded-xl border-primary/20 bg-background/50 focus-visible:ring-primary/30 text-base"
                            disabled={isStreaming}
                            autoFocus
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={!inputValue.trim() || isStreaming}
                        size="icon"
                        className="h-12 w-12 rounded-xl shrink-0 transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
                <div className="text-center mt-3 hidden md:block">
                    <span className="text-[10px] text-muted-foreground">AI can make mistakes. Verify important information with the original source.</span>
                </div>
            </div>
        </div>
    );
}
