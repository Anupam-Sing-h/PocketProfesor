"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageLoading } from "@/components/ui/page-loading";
import { FlipCard } from "@/components/flashcard/flip-card";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSwipe } from "@/hooks/use-swipe";
import type { Flashcard } from "@/types";

export default function FlashcardsPage() {
    const params = useParams();
    const router = useRouter();
    const contentId = params.id as string;

    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const fetchFlashcards = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.getFlashcards(contentId);
            if (data && data.flashcards) {
                setFlashcards(data.flashcards);
            } else {
                setFlashcards([]);
            }
            setCurrentIndex(0);
            setIsFlipped(false);
        } catch {
            setFlashcards([]);
        } finally {
            setIsLoading(false);
        }
    }, [contentId]);

    // Track unique card views
    const [viewedCards, setViewedCards] = useState<Set<number>>(new Set([0]));

    useEffect(() => {
        if (contentId) {
            fetchFlashcards();
        }
    }, [contentId, fetchFlashcards]);

    useEffect(() => {
        if (flashcards.length > 0 && !viewedCards.has(currentIndex)) {
            setViewedCards(prev => new Set(prev).add(currentIndex));
            // Fire and forget to backend
            api.updateFlashcardProgress(contentId).catch(console.error);
        }
    }, [currentIndex, contentId, flashcards.length, viewedCards]);

    const handleNext = useCallback(() => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150); // slight delay for unflip
        }
    }, [currentIndex, flashcards.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    }, [currentIndex]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        toast.message("Generating flashcards...");
        try {
            const data = await api.generateFlashcards(contentId);
            setFlashcards(data.flashcards);
            setCurrentIndex(0);
            setIsFlipped(false);
            toast.success("Flashcards generated successfully!");
        } catch (error) {
            toast.error("Generation failed", { description: error instanceof Error ? error.message : "Unknown error" });
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                setIsFlipped(prev => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNext, handlePrev]);

    const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(handleNext, handlePrev);

    if (isLoading) {
        return <PageLoading count={1} />;
    }

    if (flashcards.length === 0) {
        return (
            <div className="mx-auto max-w-3xl space-y-6 pt-6 px-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/study/${contentId}`)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
                </div>

                <div className="flex flex-col items-center justify-center py-24 text-center glass rounded-2xl border-dashed border-2 p-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6 text-primary">
                        <BookOpen className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">No flashcards yet</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mb-8">
                        Flashcards haven&apos;t been generated for this content yet. Click &quot;Generate&quot; to create a deck.
                    </p>
                    <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
                        {isGenerating ? "Generating..." : "Generate Flashcards"}
                    </Button>
                </div>
            </div>
        );
    }

    const progress = ((currentIndex + 1) / flashcards.length) * 100;

    return (
        <div className="mx-auto max-w-4xl space-y-8 pt-6 px-4 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/study/${contentId}`)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Flashcards Review</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Card {currentIndex + 1} of {flashcards.length}
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {isGenerating ? "Regenerating..." : "Regenerate"}
                </Button>
            </div>

            <Progress value={progress} className="h-2" />

            <div
                className="flex flex-col items-center justify-center pt-8 md:pt-12"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <FlipCard
                    flashcard={flashcards[currentIndex]}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped(!isFlipped)}
                />

                <div className="mt-12 w-full flex items-center justify-between md:justify-center md:gap-8 gap-4 px-4 sm:px-0">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="w-[45%] md:w-40 h-14"
                        title="Arrow Left"
                    >
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Previous
                    </Button>

                    <Button
                        size="lg"
                        onClick={handleNext}
                        disabled={currentIndex === flashcards.length - 1}
                        className="w-[45%] md:w-40 h-14"
                        title="Arrow Right"
                    >
                        Next
                        <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                </div>

                <div className="mt-8 text-sm text-muted-foreground hidden md:flex items-center gap-6">
                    <span className="flex items-center gap-1"><kbd className="px-2 py-1 bg-muted rounded-md text-xs font-mono">←</kbd> Previous</span>
                    <span className="flex items-center gap-1"><kbd className="px-2 py-1 bg-muted rounded-md text-xs border font-mono w-16 text-center">Space</kbd> Flip</span>
                    <span className="flex items-center gap-1">Next <kbd className="px-2 py-1 bg-muted rounded-md text-xs font-mono">→</kbd></span>
                </div>
            </div>
        </div>
    );
}
