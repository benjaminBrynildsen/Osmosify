import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, RotateCcw } from "lucide-react";
import type { Word } from "@shared/schema";

interface FlashcardDisplayProps {
  words: Word[];
  onResult: (wordId: string, isCorrect: boolean) => void;
  onComplete: (results: { wordId: string; isCorrect: boolean }[]) => void;
  mode: "mastery" | "history";
}

export function FlashcardDisplay({ words, onResult, onComplete, mode }: FlashcardDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ wordId: string; isCorrect: boolean }[]>([]);
  const [showFeedback, setShowFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [deck, setDeck] = useState<Word[]>([]);

  useEffect(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setResults([]);
  }, [words]);

  const currentWord = deck[currentIndex];
  const progress = ((currentIndex) / deck.length) * 100;
  const isComplete = currentIndex >= deck.length;

  const handleAnswer = (isCorrect: boolean) => {
    if (!currentWord) return;

    setShowFeedback(isCorrect ? "correct" : "incorrect");
    
    const newResult = { wordId: currentWord.id, isCorrect };
    const newResults = [...results, newResult];
    setResults(newResults);
    onResult(currentWord.id, isCorrect);

    setTimeout(() => {
      setShowFeedback(null);
      if (currentIndex + 1 >= deck.length) {
        onComplete(newResults);
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleRestart = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setResults([]);
  };

  if (deck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-4" data-testid="flashcard-empty">
        <p className="text-lg font-medium text-foreground mb-2">No words to practice</p>
        <p className="text-sm text-muted-foreground text-center">
          {mode === "mastery"
            ? "All words have been mastered! Try a History Test to review."
            : "No words available for review."}
        </p>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const percentage = Math.round((correctCount / results.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-4 space-y-6" data-testid="flashcard-complete">
        <div className="text-center">
          <p className="text-5xl font-bold text-primary mb-2">{percentage}%</p>
          <p className="text-lg font-medium text-foreground">
            {correctCount} of {results.length} correct
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {percentage >= 80 ? "Great job!" : percentage >= 60 ? "Keep practicing!" : "Don't give up!"}
          </p>
        </div>
        <Button onClick={handleRestart} className="gap-2" data-testid="button-restart-flashcards">
          <RotateCcw className="h-4 w-4" />
          Practice Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="flashcard-active">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{currentIndex + 1} of {deck.length}</span>
          <span>{mode === "mastery" ? "Mastery Mode" : "History Test"}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card
          className={`w-full max-w-md min-h-96 flex items-center justify-center transition-all ${
            showFeedback === "correct"
              ? "ring-2 ring-emerald-500 bg-emerald-500/5"
              : showFeedback === "incorrect"
              ? "ring-2 ring-red-500 bg-red-500/5"
              : ""
          }`}
          data-testid="flashcard-word-display"
        >
          <CardContent className="p-8 text-center">
            <p
              className="text-5xl md:text-6xl font-bold text-foreground break-words"
              data-testid="text-flashcard-word"
            >
              {currentWord?.word}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 border-t">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
            onClick={() => handleAnswer(false)}
            disabled={showFeedback !== null}
            data-testid="button-incorrect"
          >
            <X className="h-6 w-6 mr-2" />
            Incorrect
          </Button>
          <Button
            size="lg"
            className="h-16 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleAnswer(true)}
            disabled={showFeedback !== null}
            data-testid="button-correct"
          >
            <Check className="h-6 w-6 mr-2" />
            Correct
          </Button>
        </div>
      </div>
    </div>
  );
}
