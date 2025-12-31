import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, PartyPopper } from "lucide-react";
import { FlashcardDisplay } from "@/components/FlashcardDisplay";
import { useGuestModeContext } from "@/hooks/use-guest-mode";
import type { Word } from "@shared/schema";

export default function GuestFlashcards() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { guestData, markFlashcardSessionCompleted, updateGuestWordStatus } = useGuestModeContext();
  const [isComplete, setIsComplete] = useState(false);
  const childId = params.id || guestData.child?.id || "";

  const sessionWordsRef = useRef<Word[] | null>(null);
  const deckSize = 4;
  
  if (sessionWordsRef.current === null) {
    const allWords = guestData.words
      .filter(w => w.status !== "mastered")
      .map(w => ({
        id: w.id,
        word: w.word,
        childId: guestData.child?.id || "",
        status: w.status,
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalOccurrences: 1,
        sessionsSeenCount: 1,
        masteryCorrectCount: w.correctCount,
        incorrectCount: 0,
        lastTested: null,
      }));
    sessionWordsRef.current = allWords.slice(0, deckSize);
  }
  
  const words = sessionWordsRef.current;

  const handleWordMastered = (wordId: string) => {
    updateGuestWordStatus(wordId, 7, "mastered");
  };

  const handleComplete = (masteredWordIds: string[]) => {
    setIsComplete(true);
    markFlashcardSessionCompleted();
  };

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No words to practice yet.</p>
        <Button onClick={() => setLocation(`/guest/child/${childId}`)}>
          <Home className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <PartyPopper className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Great job, {guestData.child?.name}!</h1>
        <p className="text-muted-foreground mb-6">
          You completed the practice session!
        </p>
        <Button onClick={() => setLocation(`/guest/child/${childId}`)} data-testid="button-done">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 flex items-center gap-2 border-b">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/guest/child/${childId}`)} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Practice Words</h1>
      </header>
      <main className="flex-1 p-4">
        <FlashcardDisplay
          words={words}
          mode="mastery"
          onWordMastered={handleWordMastered}
          onComplete={handleComplete}
          masteryThreshold={3}
          timerSeconds={10}
          voicePreference="shimmer"
          initialWordCount={words.length}
        />
      </main>
    </div>
  );
}
