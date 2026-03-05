"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Flashcard } from "@/types";

interface FlipCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
    className?: string;
}

export function FlipCard({ flashcard, isFlipped, onFlip, className }: FlipCardProps) {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "hard": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-primary/10 text-primary border-primary/20";
        }
    };

    return (
        <div
            className={cn("flip-card w-full h-[350px] md:h-[400px] cursor-pointer group", className)}
            onClick={onFlip}
        >
            <div className={cn("flip-card-inner relative w-full h-full", isFlipped && "flipped")}>
                {/* Front */}
                <Card className="flip-card-front absolute inset-0 w-full h-full glass flex flex-col items-center justify-center p-8 text-center transition-all group-hover:glow-border border-2">
                    <div className="absolute top-4 left-4">
                        <Badge variant="outline" className="text-xs uppercase bg-background/50">Question</Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                        <Badge variant="outline" className={cn("capitalize", getDifficultyColor(flashcard.difficulty))}>
                            {flashcard.difficulty}
                        </Badge>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-medium leading-relaxed">{flashcard.front}</h3>

                    <div className="absolute bottom-6 flex flex-col items-center text-muted-foreground animate-pulse">
                        <span className="text-sm">Click or press Space to reveal</span>
                    </div>
                </Card>

                {/* Back */}
                <Card className="flip-card-back absolute inset-0 w-full h-full glass flex flex-col items-center justify-center p-8 text-center transition-all group-hover:glow-border border-2 border-primary/30">
                    <div className="absolute top-4 left-4">
                        <Badge variant="outline" className="text-xs uppercase bg-primary/10 text-primary border-primary/30">Answer</Badge>
                    </div>

                    <div className="overflow-y-auto max-h-[80%] w-full px-4 scrollbar-thin">
                        <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">{flashcard.back}</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
