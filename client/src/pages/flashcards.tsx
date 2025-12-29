import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { FlashcardDisplay } from "@/components/FlashcardDisplay";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Child, Word } from "@shared/schema";

export default function Flashcards() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const updateWordMutation = useMutation({
    mutationFn: async ({ wordId, isCorrect }: { wordId: string; isCorrect: boolean }) => {
      const response = await apiRequest("PATCH", `/api/words/${wordId}/result`, { isCorrect });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
    },
  });

  const handleResult = (wordId: string, isCorrect: boolean) => {
    updateWordMutation.mutate({ wordId, isCorrect });
  };

  const handleComplete = (results: { wordId: string; isCorrect: boolean }[]) => {
    const correctCount = results.filter((r) => r.isCorrect).length;
    toast({
      title: "Session Complete!",
      description: `You got ${correctCount} out of ${results.length} correct.`,
    });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading flashcards..." />;
  }

  const deckWords = words?.filter((w) => w.status === "new" || w.status === "learning") || [];
  const deckSize = child?.deckSize || 10;
  const limitedDeck = deckWords.slice(0, deckSize);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Flashcards"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="flex-1 flex flex-col">
        {limitedDeck.length > 0 ? (
          <FlashcardDisplay
            words={limitedDeck}
            onResult={handleResult}
            onComplete={handleComplete}
            mode="mastery"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              type="words"
              title="No words to practice"
              description="All words have been mastered! Try a History Test to review previously learned words."
            />
          </div>
        )}
      </main>
    </div>
  );
}
