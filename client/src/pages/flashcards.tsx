import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { FlashcardDisplay } from "@/components/FlashcardDisplay";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSessionTracking } from "@/hooks/use-session-tracking";
import type { Child, Word, Book, PresetWordList } from "@shared/schema";

interface PrioritizedWord {
  word: string;
  leverageScore: number;
  bookCount: number;
  totalOccurrences: number;
}

export default function Flashcards() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const bookId = searchParams.get("bookId");
  const presetId = searchParams.get("presetId");
  const wordPopWordsParam = searchParams.get("wordPopWords");
  const childId = params.id;
  const { trackEvent } = useSessionTracking();

  // Track Flashcards started
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("flashcards_started", { childId, bookId, presetId });
    }
  }, []);

  // Parse Word Pop words passed from the lesson flow
  const wordPopWords = wordPopWordsParam 
    ? decodeURIComponent(wordPopWordsParam).split(",").filter(w => w.length > 0)
    : [];
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

  // Fetch prioritized words for this book (sorted by leverage score)
  // Only fetch when we have both a valid bookId and childId
  const hasValidBookId = bookId !== null && bookId !== "" && bookId !== undefined;
  const { data: prioritizedWords, isLoading: prioritizedLoading } = useQuery<PrioritizedWord[]>({
    queryKey: ["/api/children", childId, "books", bookId, "prioritized-words"],
    enabled: hasValidBookId && !!childId,
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

  // Auto-add book to library when lesson starts
  const addBookToLibraryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/children/${childId}/added-books`, { bookId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "added-books"] });
    },
  });

  useEffect(() => {
    if (bookId && book && !wordsImported && !importBookWordsMutation.isPending) {
      importBookWordsMutation.mutate();
      // Auto-add book to library
      addBookToLibraryMutation.mutate();
    }
  }, [bookId, book, wordsImported]);

  useEffect(() => {
    if (presetId && preset && !wordsImported && !importPresetWordsMutation.isPending) {
      importPresetWordsMutation.mutate();
      // Note: presets are already auto-added to library when add-preset is called
    }
  }, [presetId, preset, wordsImported]);

  const isLoading = wordsLoading || (hasValidBookId && bookLoading) || (hasValidBookId && !wordsImported) || (hasValidBookId && prioritizedLoading) || (presetId && presetLoading) || (presetId && !wordsImported);

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
    // Only show toast in standalone mode, not lesson mode
    if (wordPopWords.length === 0) {
      toast({
        title: "Session Complete!",
        description: `Unlocked ${masteredWordIds.length} words in this session.`,
      });
    }
  };

  // Called after final celebration in lesson mode - navigate to Lava Letters
  const handleLessonComplete = () => {
    // Combine wordPop words with flashcard deck words for Lava Letters
    const flashcardWords = limitedDeck.map(w => w.word);
    const allPracticedWords = Array.from(new Set([...wordPopWords, ...flashcardWords]));
    const wordsParam = encodeURIComponent(allPracticedWords.join(","));
    setLocation(`/child/${childId}/lava-letters?bookId=${bookId}&lessonMode=true&practicedWords=${wordsParam}`);
  };

  // Build the deck with prioritization - must be called before any early returns (hooks rule)
  const deckWords = useMemo(() => {
    // Get words that need learning (new or learning status)
    const learningWords = words?.filter((w) => w.status === "new" || w.status === "learning") || [];
    let filtered: Word[] = [];
    
    if (book && book.words && prioritizedWords) {
      // For books: use leverage-based prioritization
      // Create a map of word -> priority index from prioritized list
      const priorityMap = new Map<string, number>();
      prioritizedWords.forEach((pw, index) => {
        priorityMap.set(pw.word.toLowerCase(), index);
      });
      
      // Filter to book words that are still learning
      const bookWordsSet = new Set(book.words.map(w => w.toLowerCase()));
      filtered = learningWords.filter(w => bookWordsSet.has(w.word.toLowerCase()));
      
      // Sort by leverage priority (words appearing in more books come first)
      filtered.sort((a, b) => {
        const priorityA = priorityMap.get(a.word.toLowerCase()) ?? Infinity;
        const priorityB = priorityMap.get(b.word.toLowerCase()) ?? Infinity;
        return priorityA - priorityB;
      });
    } else if (book && book.words) {
      // Fallback for books without prioritized data yet
      const bookWordsSet = new Set(book.words.map(w => w.toLowerCase()));
      filtered = learningWords.filter(w => bookWordsSet.has(w.word.toLowerCase()));
    } else if (preset && preset.words) {
      // For presets: just filter to preset words (no cross-book prioritization)
      const presetWordsSet = new Set(preset.words.map(w => w.toLowerCase()));
      filtered = learningWords.filter(w => presetWordsSet.has(w.word.toLowerCase()));
    } else {
      filtered = learningWords;
    }
    
    return filtered;
  }, [words, book, prioritizedWords, preset]);

  if (isLoading) {
    return <LoadingScreen message={bookId ? "Preparing book words..." : "Preparing words..."} />;
  }
  
  const deckSize = child?.deckSize || 4;
  const masteryThreshold = child?.masteryThreshold || 4;
  const timerSeconds = child?.timerSeconds || 7;
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
            timerSeconds={timerSeconds}
            voicePreference={(child?.voicePreference as "nova" | "alloy" | "shimmer") || "nova"}
            initialWordCount={limitedDeck.length}
            wordPopWords={wordPopWords}
            onLessonComplete={wordPopWords.length > 0 ? handleLessonComplete : undefined}
            gifCelebrationsEnabled={child?.gifCelebrationsEnabled ?? true}
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
