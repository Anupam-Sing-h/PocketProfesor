"use client";

import { User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface ChatBubbleProps {
    message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
    const isUser = message.role === "user";

    return (
        <div className={cn("flex w-full gap-4 chat-message-enter", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <Avatar className="h-8 w-8 shrink-0 border-primary/20 bg-primary/10">
                    <AvatarFallback className="bg-transparent text-primary">
                        <Sparkles className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
            )}

            <div className={cn(
                "flex flex-col gap-2 max-w-[85%] md:max-w-[75%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div
                    className={cn(
                        "px-4 py-3 rounded-2xl shadow-sm overflow-hidden",
                        isUser
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-primary/10 rounded-tl-sm text-card-foreground"
                    )}
                >
                    <div className="prose prose-sm dark:prose-invert max-w-none 
                        prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border
                        prose-a:text-blue-500 hover:prose-a:text-blue-600">
                        <ReactMarkdown>{message.message}</ReactMarkdown>
                    </div>
                </div>

                {/* Sources / Citations for AI */}
                {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1 px-1">
                        <span className="text-xs text-muted-foreground font-medium flex items-center h-5">Sources:</span>
                        <TooltipProvider>
                            {message.sources.map((source, idx) => {
                                const sourceText = typeof source === "string"
                                    ? source
                                    : (source?.text_preview || `Source ${idx + 1}`);

                                return (
                                    <Tooltip key={idx} delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[10px] bg-background/50 cursor-help hover:bg-muted transition-colors">
                                                {sourceText.substring(0, 20)}...
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs text-xs z-50">
                                            <p>{sourceText}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </TooltipProvider>
                    </div>
                )}
            </div>

            {isUser && (
                <Avatar className="h-8 w-8 shrink-0 bg-primary text-primary-foreground">
                    <AvatarFallback className="bg-primary text-white">
                        <User className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}
