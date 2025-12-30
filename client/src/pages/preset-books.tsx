import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { BookCoverCard } from "@/components/BookCoverCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Check,
  Star,
  FlaskConical,
  Search,
  Sparkles,
  Gamepad2,
  Grid3X3,
  List,
} from "lucide-react";
import type { Child, Book, Word } from "@shared/schema";

type ViewMode = "grid" | "list";
type SortMode = "readiness" | "title" | "author";
type GradeFilter = "all" | "Preschool" | "Kindergarten" | "1st Grade" | "2nd Grade";

export default function PresetBooks() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("readiness");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: presetBooks, isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/preset-books"],
  });

  const { data: childWords, isLoading: wordsLoading } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const masteredWordSet = useMemo(() => new Set(
    (childWords || [])
      .filter(w => w.status === "mastered")
      .map(w => w.word.toLowerCase())
  ), [childWords]);

  const booksWithReadiness = useMemo(() => {
    return (presetBooks || []).map(book => {
      const bookWords = book.words.map(w => w.toLowerCase());
      const uniqueWords = Array.from(new Set(bookWords));
      const totalCount = uniqueWords.length;
      let masteredCount = 0;
      for (const word of uniqueWords) {
        if (masteredWordSet.has(word)) {
          masteredCount++;
        }
      }
      const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
      return { book, masteredCount, totalCount, percent };
    });
  }, [presetBooks, masteredWordSet]);

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...booksWithReadiness];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.book.title.toLowerCase().includes(query) ||
          item.book.author?.toLowerCase().includes(query)
      );
    }

    if (gradeFilter !== "all") {
      result = result.filter(item => item.book.gradeLevel === gradeFilter);
    }

    switch (sortMode) {
      case "readiness":
        result.sort((a, b) => b.percent - a.percent);
        break;
      case "title":
        result.sort((a, b) => a.book.title.localeCompare(b.book.title));
        break;
      case "author":
        result.sort((a, b) => (a.book.author || "").localeCompare(b.book.author || ""));
        break;
    }

    return result;
  }, [booksWithReadiness, searchQuery, gradeFilter, sortMode]);

  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: booksWithReadiness.length };
    for (const item of booksWithReadiness) {
      const grade = item.book.gradeLevel || "Unknown";
      counts[grade] = (counts[grade] || 0) + 1;
    }
    return counts;
  }, [booksWithReadiness]);

  const readyCount = booksWithReadiness.filter(b => b.percent >= 90).length;
  const almostReadyCount = booksWithReadiness.filter(b => b.percent >= 70 && b.percent < 90).length;

  if (childLoading || booksLoading || wordsLoading) {
    return <LoadingScreen message="Loading book library..." />;
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Not Found" showBack backPath="/" />
        <div className="p-4 text-center text-muted-foreground">
          Child not found
        </div>
      </div>
    );
  }

  const selectedBookReadiness = selectedBook
    ? booksWithReadiness.find(b => b.book.id === selectedBook.id)
    : null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader
        title="Book Library"
        showBack
        backPath={`/child/${childId}/books`}
      />

      <main className="container mx-auto max-w-4xl p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Star className="h-3 w-3 text-green-500" />
            {readyCount} Ready
          </Badge>
          <Badge variant="outline" className="gap-1 bg-amber-500/10">
            {almostReadyCount} Almost Ready
          </Badge>
          <Badge variant="secondary">
            {booksWithReadiness.length} Total Books
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-books"
            />
          </div>
          
          <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as GradeFilter)}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-grade-filter">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades ({gradeCounts.all})</SelectItem>
              <SelectItem value="Preschool">Preschool ({gradeCounts["Preschool"] || 0})</SelectItem>
              <SelectItem value="Kindergarten">Kindergarten ({gradeCounts["Kindergarten"] || 0})</SelectItem>
              <SelectItem value="1st Grade">1st Grade ({gradeCounts["1st Grade"] || 0})</SelectItem>
              <SelectItem value="2nd Grade">2nd Grade ({gradeCounts["2nd Grade"] || 0})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-sort">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="readiness">By Readiness</SelectItem>
              <SelectItem value="title">By Title</SelectItem>
              <SelectItem value="author">By Author</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {filteredAndSortedBooks.length === 0 ? (
          <EmptyState
            type="sessions"
            title={searchQuery ? "No books found" : "No books available"}
            description={searchQuery 
              ? "Try a different search term" 
              : "Books will be added soon."}
          />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredAndSortedBooks.map(({ book, masteredCount, totalCount, percent }) => (
              <BookCoverCard
                key={book.id}
                book={book}
                readinessPercent={percent}
                masteredCount={masteredCount}
                totalCount={totalCount}
                onClick={() => setSelectedBook(book)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedBooks.map(({ book, masteredCount, totalCount, percent }) => (
              <div
                key={book.id}
                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover-elevate ${
                  percent >= 90 ? "border-green-500/50 bg-green-500/5" : ""
                }`}
                onClick={() => setSelectedBook(book)}
                data-testid={`list-book-${book.id}`}
              >
                <div className="w-10 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{book.title}</h3>
                  {book.author && (
                    <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge className={percent >= 90 ? "bg-green-500" : percent >= 70 ? "bg-amber-500" : ""}>
                    {percent}%
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {masteredCount}/{totalCount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedBook && selectedBookReadiness && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <BookOpen className="h-5 w-5" />
                  {selectedBook.title}
                  {selectedBook.isBeta && (
                    <Badge variant="outline" className="text-xs">
                      <FlaskConical className="h-3 w-3 mr-1" />
                      Beta
                    </Badge>
                  )}
                </DialogTitle>
                {selectedBook.author && (
                  <p className="text-sm text-muted-foreground">by {selectedBook.author}</p>
                )}
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Readiness</span>
                  <Badge className={selectedBookReadiness.percent >= 90 ? "bg-green-500" : selectedBookReadiness.percent >= 70 ? "bg-amber-500" : ""}>
                    {selectedBookReadiness.percent}%
                  </Badge>
                </div>
                
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      selectedBookReadiness.percent >= 90 ? "bg-green-500" :
                      selectedBookReadiness.percent >= 70 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${selectedBookReadiness.percent}%` }}
                  />
                </div>

                <p className="text-sm">
                  <span className="font-medium">{selectedBookReadiness.masteredCount}</span>
                  <span className="text-muted-foreground"> of </span>
                  <span className="font-medium">{selectedBookReadiness.totalCount}</span>
                  <span className="text-muted-foreground"> words unlocked</span>
                </p>

                {selectedBookReadiness.percent < 100 && (
                  <p className="text-sm text-muted-foreground">
                    Prepare {selectedBookReadiness.totalCount - selectedBookReadiness.masteredCount} more words to unlock this book!
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedBook(null);
                      setLocation(`/child/${childId}/flashcards?bookId=${selectedBook.id}`);
                    }}
                    data-testid="button-prepare-words"
                  >
                    <Sparkles className="h-4 w-4" />
                    Prepare Words
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
                    onClick={() => {
                      setSelectedBook(null);
                      setLocation(`/child/${childId}/word-pop?bookId=${selectedBook.id}`);
                    }}
                    data-testid="button-play-word-pop"
                  >
                    <Gamepad2 className="h-4 w-4 text-purple-500" />
                    Play Word Pop
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">
                    Words in this book ({selectedBook.words.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {selectedBook.words.map((word, index) => {
                      const isMastered = masteredWordSet.has(word.toLowerCase());
                      return (
                        <span
                          key={`${word}-${index}`}
                          className={`px-2 py-1 rounded-md text-sm ${
                            isMastered
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 line-through"
                              : "bg-muted text-foreground"
                          }`}
                          data-testid={`word-${word}-${isMastered ? "mastered" : "not-mastered"}`}
                        >
                          {isMastered && <Check className="inline h-3 w-3 mr-1" />}
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
