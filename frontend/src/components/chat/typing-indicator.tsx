"use client";

export function TypingIndicator() {
    return (
        <div className="flex items-center space-x-1.5 p-4 py-5 max-w-[100px] w-full bg-card/50 rounded-2xl rounded-tl-sm border border-primary/10">
            <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
    );
}
