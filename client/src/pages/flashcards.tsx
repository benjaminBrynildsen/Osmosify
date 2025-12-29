import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { FlashcardDisplay } from "@/components/FlashcardDisplay";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Child, Word, Book, PresetWordList } from "@shared/schema";

export default function Flashcards() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const bookId = searchParams.get("bookId");
  const presetId = searchParams.get("presetId");
  const childId = params.id;
  const { toast } = useToast();
  const [wordsImported, setWordsImported] = useState(false);

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: words, isLoading: wordsLoading, refetch: refetchWords } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const { data: book, isLoading: bookLoading } = useQuery<Book>({
    queryKey: ["/api/books", bookId],
    enabled: !!bookId,
  });

  const { data: preset, isLoading: presetLoading } = useQuery<PresetWordList>({
    queryKey: [`/api/presets/${presetId}`],
    enabled: !!presetId,
  });

  const importBookWordsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/children/${childId}/import-book-words`, {
        bookId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setWordsImported(true);
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
      if (data.added > 0) {
        toast({
          title: "Words ready",
          description: `Added ${data.added} new words from "${data.bookTitle}" to prepare.`,
        });
      }
    },
    onError: () => {
      setWordsImported(true);
      toast({
        title: "Error",
        description: "Failed to load book words. Please try again.",
        variant: "destructive",
      });
    },
  });

  const importPresetWordsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/children/${childId}/add-preset`, {
        presetId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setWordsImported(true);
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
      if (data.added > 0) {
        toast({
          title: "Words ready",
          description: `Added ${data.added} new words from "${data.presetName}" to prepare.`,
        });
      }
    },
    onError: () => {
      setWordsImported(true);
      toast({
        title: "Error",
        description: "Failed to load preset words. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    setWordsImported(false);
  }, [bookId, presetId]);

  useEffect(() => {
    if (bookId && book && !wordsImported && !importBookWordsMutation.isPending) {
      importBookWordsMutation.mutate();
    }
  }, [bookId, book, wordsImported]);

  useEffect(() => {
    if (presetId && preset && !wordsImported && !importPresetWordsMutation.isPending) {
      importPresetWordsMutation.mutate();
    }
  }, [presetId, preset, wordsImported]);

  const isLoading = wordsLoading || (bookId && bookLoading) || (bookId && !wordsImported) || (presetId && presetLoading) || (presetId && !wordsImported);

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
      description: `Unlocked ${masteredWordIds.length} words in this session.`,
    });
  };

  if (isLoading) {
    return <LoadingScreen message={bookId ? "Preparing book words..." : "Preparing words..."} />;
  }

  let deckWords = words?.filter((w) => w.status === "new" || w.status === "learning") || [];
  
  if (book && book.words) {
    const bookWordsSet = new Set(book.words.map(w => w.toLowerCase()));
    deckWords = deckWords.filter(w => bookWordsSet.has(w.word.toLowerCase()));
  } else if (preset && preset.words) {
    const presetWordsSet = new Set(preset.words.map(w => w.toLowerCase()));
    deckWords = deckWords.filter(w => presetWordsSet.has(w.word.toLowerCase()));
  }
  
  const deckSize = child?.deckSize || 7;
  const masteryThreshold = child?.masteryThreshold || 7;
  const limitedDeck = deckWords.slice(0, deckSize);
  const headerTitle = book ? `Prepare: ${book.title}` : preset ? `Prepare: ${preset.name}` : "Word Preparation";
  const backPath = bookId ? `/child/${childId}/books` : presetId ? `/child/${childId}/presets` : `/child/${childId}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={headerTitle}
        showBack
        backPath={backPath}
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
              title="No words to prepare"
              description="All words have been unlocked! Use 'Keep Words Strong' to review previously learned words."
            />
          </div>
        )}
      </main>
    </div>
  );
}
