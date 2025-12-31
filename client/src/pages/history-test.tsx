import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { HistoryTestSetup } from "@/components/HistoryTestSetup";
import { FlashcardDisplay } from "@/components/FlashcardDisplay";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Child, Word } from "@shared/schema";

export default function HistoryTest() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();

  const [testDeck, setTestDeck] = useState<Word[]>([]);
  const [isTestActive, setIsTestActive] = useState(false);

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const updateWordMutation = useMutation({
    mutationFn: async ({ wordId, isCorrect, isHistoryTest }: { wordId: string; isCorrect: boolean; isHistoryTest: boolean }) => {
      const response = await apiRequest("PATCH", `/api/words/${wordId}/result`, { isCorrect, isHistoryTest });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
    },
  });

  const handleStartTest = (config: { size: number; mode: "oldest" | "random" | "frequent"; includeSource: "mastered" | "learning" | "both" }) => {
    if (!words) return;

    let eligibleWords = words.filter((w) => {
      if (config.includeSource === "mastered") return w.status === "mastered";
      if (config.includeSource === "learning") return w.status === "learning";
      return w.status === "mastered" || w.status === "learning";
    });

    if (config.mode === "oldest") {
      eligibleWords = eligibleWords.sort((a, b) => {
        const aDate = a.lastTested ? new Date(a.lastTested).getTime() : 0;
        const bDate = b.lastTested ? new Date(b.lastTested).getTime() : 0;
        return aDate - bDate;
      });
    } else if (config.mode === "frequent") {
      eligibleWords = eligibleWords.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    } else {
      eligibleWords = eligibleWords.sort(() => Math.random() - 0.5);
    }

    const selectedWords = eligibleWords.slice(0, config.size);
    setTestDeck(selectedWords);
    setIsTestActive(true);
  };

  const handleResult = (wordId: string, isCorrect: boolean) => {
    updateWordMutation.mutate({ wordId, isCorrect, isHistoryTest: true });
  };

  const handleComplete = (results: { wordId: string; isCorrect: boolean }[]) => {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const missedCount = results.length - correctCount;
    
    toast({
      title: "Review Complete!",
      description: child?.demoteOnMiss && missedCount > 0
        ? `${correctCount}/${results.length} correct. ${missedCount} words moved back to learning.`
        : `You got ${correctCount} out of ${results.length} correct.`,
    });
    
    setIsTestActive(false);
    setTestDeck([]);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading words..." />;
  }

  const masteredWords = words?.filter((w) => w.status === "mastered") || [];
  const learningWords = words?.filter((w) => w.status === "learning") || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Keep Words Strong"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="flex-1 flex flex-col">
        {isTestActive ? (
          <FlashcardDisplay
            words={testDeck}
            onResult={handleResult}
            onComplete={handleComplete}
            mode="history"
            timerSeconds={child?.timerSeconds || 7}
            voicePreference={(child?.voicePreference as "nova" | "alloy" | "shimmer") || "nova"}
            gifCelebrationsEnabled={child?.gifCelebrationsEnabled ?? true}
          />
        ) : (
          <HistoryTestSetup
            masteredCount={masteredWords.length}
            learningCount={learningWords.length}
            onStartTest={handleStartTest}
          />
        )}
      </main>
    </div>
  );
}
