"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrainCircuit, CheckCircle2, XCircle, ArrowRight, RotateCcw, ArrowLeft, Info, Trophy } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Quiz, QuizEvaluation } from "@/types";
import { cn } from "@/lib/utils";

type QuizState = 'loading' | 'answering' | 'feedback' | 'completed';

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const contentId = params.id as string;

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [state, setState] = useState<QuizState>('loading');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [answers, setAnswers] = useState<Record<number, string>>({});

    // For feedback state
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // For completed state
    const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);

    useEffect(() => {
        if (contentId) {
            fetchQuiz();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentId]);

    const fetchQuiz = async () => {
        try {
            setState('loading');
            const data = await api.getQuiz(contentId);
            if (data && data.questions && data.questions.length > 0) {
                setQuiz(data);
                resetQuizState();
            } else {
                setQuiz(null);
                setState('answering');
            }
        } catch {
            setQuiz(null);
            setState('answering');
        }
    };

    const resetQuizState = () => {
        setCurrentIndex(0);
        setSelectedOption("");
        setAnswers({});
        setIsCorrect(null);
        setEvaluation(null);
        setState('answering');
    };

    const handleGenerateContent = async () => {
        setIsGenerating(true);
        try {
            const data = await api.generateQuiz(contentId);
            setQuiz(data);
            resetQuizState();
            toast.success("Quiz generated successfully!");
        } catch (error) {
            toast.error("Generation failed", { description: error instanceof Error ? error.message : "Unknown error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmitAnswer = useCallback(() => {
        if (!selectedOption || !quiz) return;

        const question = quiz.questions[currentIndex];
        const correct = selectedOption === question.correct_answer;

        setIsCorrect(correct);
        setAnswers(prev => ({ ...prev, [question.id]: selectedOption }));
        setState('feedback');
    }, [selectedOption, quiz, currentIndex]);

    const handleNextQuestion = useCallback(async () => {
        if (!quiz) return;

        if (currentIndex < quiz.questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption("");
            setIsCorrect(null);
            setState('answering');
        } else {
            // Finish quiz
            await finishQuiz();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quiz, currentIndex]);

    const finishQuiz = async () => {
        if (!quiz) return;

        setIsEvaluating(true);
        setState('loading');

        try {
            const result = await api.evaluateQuiz(contentId, answers);
            setEvaluation(result);
            setState('completed');
        } catch (error) {
            toast.error("Evaluation failed", { description: error instanceof Error ? error.message : "Unknown error" });
            // Fallback: evaluate locally if API fails
            const localEval = evaluateLocally(quiz, answers);
            setEvaluation(localEval);
            setState('completed');
        } finally {
            setIsEvaluating(false);
        }
    };

    const evaluateLocally = (quizObj: Quiz, userAnswers: Record<number, string>): QuizEvaluation => {
        let score = 0;
        const results = quizObj.questions.map(q => {
            const correct = userAnswers[q.id] === q.correct_answer;
            if (correct) score++;
            return {
                question_id: q.id,
                correct,
                selected_answer: userAnswers[q.id] || "",
                correct_answer: q.correct_answer,
                explanation: q.explanation
            };
        });

        return {
            score,
            total: quizObj.questions.length,
            percentage: Math.round((score / quizObj.questions.length) * 100),
            results
        };
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (state === 'answering' && quiz && quiz.questions.length > 0) {
            const question = quiz.questions[currentIndex];
            const key = e.key;

            // Map 1-4 to options
            if (['1', '2', '3', '4'].includes(key)) {
                const index = parseInt(key) - 1;
                if (index < question.options.length) {
                    setSelectedOption(question.options[index]);
                }
            }

            // Enter to submit
            if (key === 'Enter' && selectedOption) {
                handleSubmitAnswer();
            }
        } else if (state === 'feedback') {
            // Enter or Right Arrow to go to next question
            if (e.key === 'Enter' || e.key === 'ArrowRight') {
                handleNextQuestion();
            }
        }
    }, [state, quiz, currentIndex, selectedOption, handleSubmitAnswer, handleNextQuestion]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    if (state === 'loading' && !isEvaluating) {
        return <PageLoading count={1} />;
    }

    if (!quiz || quiz.questions.length === 0) {
        return (
            <div className="mx-auto max-w-3xl space-y-6 pt-6 px-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/study/${contentId}`)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Quiz</h1>
                </div>

                <div className="flex flex-col items-center justify-center py-24 text-center glass rounded-2xl border-dashed border-2 p-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6 text-primary">
                        <BrainCircuit className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">No quiz yet</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mb-8">
                        A quiz hasn&apos;t been generated for this content. Click &quot;Generate&quot; to create multiple-choice questions.
                    </p>
                    <Button onClick={handleGenerateContent} disabled={isGenerating} size="lg">
                        {isGenerating ? "Generating..." : "Generate Quiz"}
                    </Button>
                </div>
            </div>
        );
    }

    const question = quiz.questions[currentIndex];
    const progressNumber = ((currentIndex + 1) / quiz.questions.length) * 100;

    const getOptionClass = (option: string) => {
        if (state !== 'feedback') {
            return selectedOption === option ? "border-primary bg-primary/5" : "border-muted";
        }

        if (option === question.correct_answer) {
            return "border-green-500 bg-green-500/10";
        } else if (option === selectedOption && !isCorrect) {
            return "border-red-500 bg-red-500/10";
        }
        return "border-muted opacity-50";
    };

    const getPerformanceMessage = (percentage: number) => {
        if (percentage >= 90) return "Outstanding! 🎉";
        if (percentage >= 70) return "Great job! 👏";
        if (percentage >= 50) return "Good effort! Keep studying 📚";
        return "Keep learning, you'll get there! 💪";
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8 pt-6 px-4 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/study/${contentId}`)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Knowledge Check</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Question {currentIndex + 1} of {quiz.questions.length}
                        </p>
                    </div>
                </div>
            </div>

            <Progress value={progressNumber} className="h-2" />

            <div className={`transition-all duration-300 ${state === 'feedback' ? '' : 'fade-in'}`}>
                <Card className="glass shadow-lg border-primary/10">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="bg-background/50">Multiple Choice</Badge>
                            {state === 'feedback' && (
                                <Badge
                                    className={isCorrect ? "bg-green-500 hover:bg-green-600 text-white border-transparent" : "bg-red-500 hover:bg-red-600 text-white border-transparent"}
                                >
                                    {isCorrect ? "Correct ✓" : "Incorrect ✗"}
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="text-xl md:text-2xl leading-relaxed mt-2">{question.question}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <RadioGroup
                            value={selectedOption}
                            onValueChange={setSelectedOption}
                            disabled={state === 'feedback'}
                            className="space-y-3"
                        >
                            {question.options.map((option, idx) => (
                                <div key={idx} className="relative">
                                    <Label
                                        htmlFor={`option-${idx}`}
                                        className={cn(
                                            "flex items-center rounded-xl border-2 p-4 cursor-pointer transition-all hover:bg-muted/50",
                                            getOptionClass(option),
                                            state === 'feedback' && "cursor-default hover:bg-transparent"
                                        )}
                                    >
                                        <RadioGroupItem
                                            value={option}
                                            id={`option-${idx}`}
                                            className="sr-only"
                                        />

                                        <div className={cn(
                                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border mr-4 transition-colors",
                                            selectedOption === option ? "border-primary text-primary" : "border-muted-foreground/50",
                                            state === 'feedback' && option === question.correct_answer && "border-green-500 text-green-500",
                                            state === 'feedback' && option === selectedOption && !isCorrect && "border-red-500 text-red-500"
                                        )}>
                                            {(selectedOption === option || (state === 'feedback' && option === question.correct_answer)) && (
                                                <div className="h-2.5 w-2.5 rounded-full bg-current" />
                                            )}
                                        </div>

                                        <span className="text-base font-medium leading-relaxed">{option}</span>

                                        {/* State Icons */}
                                        {state === 'feedback' && option === question.correct_answer && (
                                            <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                                        )}
                                        {state === 'feedback' && option === selectedOption && !isCorrect && (
                                            <XCircle className="h-5 w-5 text-red-500 ml-auto" />
                                        )}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>

                        {state === 'feedback' && (
                            <Alert className="mt-6 bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-bottom-2">
                                <Info className="h-4 w-4 text-primary" />
                                <AlertDescription className="ml-2 text-base leading-relaxed text-foreground">
                                    <strong>Explanation:</strong> {question.explanation}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>

                    <CardFooter className="pt-2 pb-6 px-6">
                        {state === 'answering' ? (
                            <Button
                                onClick={handleSubmitAnswer}
                                disabled={!selectedOption}
                                className="w-full text-base h-12"
                                size="lg"
                            >
                                Submit Answer
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNextQuestion}
                                className="w-full text-base h-12"
                                size="lg"
                            >
                                {currentIndex < quiz.questions.length - 1 ? (
                                    <>Next Question <ArrowRight className="ml-2 h-4 w-4" /></>
                                ) : (
                                    <>Complete Quiz <Trophy className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {/* Completed Dialog */}
            <Dialog open={state === 'completed'} onOpenChange={(open) => {
                if (!open) router.push(`/study/${contentId}`);
            }}>
                <DialogContent className="sm:max-w-md text-center p-8">
                    <DialogHeader className="flex flex-col items-center">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Trophy className="h-10 w-10 text-primary" />
                        </div>
                        <DialogTitle className="text-3xl font-bold">Quiz Complete!</DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            {evaluation ? getPerformanceMessage(evaluation.percentage) : ""}
                        </DialogDescription>
                    </DialogHeader>

                    {evaluation && (
                        <div className="my-8">
                            <div className="text-5xl font-black text-primary mb-2">
                                {evaluation.score} <span className="text-2xl text-muted-foreground mr-1">/</span> <span className="text-3xl text-muted-foreground">{evaluation.total}</span>
                            </div>
                            <Badge variant="outline" className="text-lg px-4 py-1">{evaluation.percentage}%</Badge>

                            <div className="flex justify-center gap-1.5 mt-8 max-w-[80%] mx-auto flex-wrap">
                                {evaluation.results.map((result, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-6 h-2 rounded-full",
                                            result.correct ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                        )}
                                        title={`Question ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-col gap-3">
                        <Button
                            className="w-full h-12 text-base"
                            onClick={resetQuizState}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Retry Quiz
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base"
                            onClick={handleGenerateContent}
                            disabled={isGenerating}
                        >
                            {isGenerating ? "Generating..." : "Generate New Test"}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full h-12"
                            onClick={() => router.push(`/study/${contentId}`)}
                        >
                            Back to Dashboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
