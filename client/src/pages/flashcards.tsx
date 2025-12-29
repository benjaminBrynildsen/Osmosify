import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { FlashcardDisplay } from "@/components/FlashcardDisplay";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Child, Word, Book } from "@shared/schema";

export default function Flashcards() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const bookId = searchParams.get("bookId");
  const childId = params.id;
  const { toast } = useToast();

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: words, isLoading: wordsLoading } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const { data: book, isLoading: bookLoading } = useQuery<Book>({
    queryKey: ["/api/books", bookId],
    enabled: !!bookId,
  });

  const isLoading = wordsLoading || (bookId && bookLoading);

  const masterWordMutation = useMutation({
    mutationFn: async (wordId: string) => {
      const response = await apiRequest("PATCH", `/api/words/${wordId}/master`);
      return response.json();
    },
  });

  const handleWordMastered = (wordId: string) => {
    masterWordMutation.mutate(wordId);
  };

  const handleComplete = (masteredWordIds: string[]) => {
    queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
    toast({
      title: "Session Complete!",
      description: `Mastered ${masteredWordIds.length} words in this session.`,
    });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading flashcards..." />;
  }

  let deckWords = words?.filter((w) => w.status === "new" || w.status === "learning") || [];
  
  if (book && book.words) {
    const bookWordsSet = new Set(book.words.map(w => w.toLowerCase()));
    deckWords = deckWords.filter(w => bookWordsSet.has(w.word.toLowerCase()));
  }
  
  const deckSize = child?.deckSize || 7;
  const masteryThreshold = child?.masteryThreshold || 7;
  const limitedDeck = deckWords.slice(0, deckSize);
  const headerTitle = book ? `Practice: ${book.title}` : "Flashcards";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={headerTitle}
        showBack
        backPath={bookId ? `/child/${childId}/books` : `/child/${childId}`}
      />

      <main className="flex-1 flex flex-col">
        {limitedDeck.length > 0 ? (
          <FlashcardDisplay
            words={limitedDeck}
            onWordMastered={handleWordMastered}
            onComplete={handleComplete}
            mode="mastery"
            masteryThreshold={masteryThreshold}
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
