import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Check,
  Star,
  FlaskConical,
  ChevronRight,
} from "lucide-react";
import type { Child, Book, Word } from "@shared/schema";

export default function PresetBooks() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

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

  if (childLoading || booksLoading || wordsLoading) {
    return <LoadingScreen message="Loading preset books..." />;
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

  const masteredWordSet = new Set(
    (childWords || [])
      .filter(w => w.status === "mastered")
      .map(w => w.word.toLowerCase())
  );

  const booksWithReadiness = (presetBooks || []).map(book => {
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
  }).sort((a, b) => b.percent - a.percent);

  const getStatusColor = (percent: number) => {
    if (percent >= 90) return "text-green-500";
    if (percent >= 70) return "text-amber-500";
    return "text-muted-foreground";
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 90) return { variant: "default" as const, label: "Ready!", className: "bg-green-500" };
    if (percent >= 70) return { variant: "secondary" as const, label: "Almost!", className: "bg-amber-500 text-white" };
    return { variant: "secondary" as const, label: `${percent}%`, className: "" };
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader
        title="Preset Book Library"
        showBack
        backPath={`/child/${childId}/books`}
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-4">
        <p className="text-muted-foreground">
          Browse popular children's books. Tap a book to see which words {child.name} has already mastered.
        </p>

        {booksWithReadiness.length === 0 ? (
          <EmptyState
            type="sessions"
            title="No preset books available"
            description="Preset books will be added soon."
          />
        ) : (
          <div className="space-y-3">
            {booksWithReadiness.map(({ book, masteredCount, totalCount, percent }) => {
              const statusBadge = getStatusBadge(percent);
              return (
                <Card
                  key={book.id}
                  className={`cursor-pointer hover-elevate ${percent >= 90 ? "border-green-500/50 bg-green-500/5" : ""}`}
                  onClick={() => setSelectedBook(book)}
                  data-testid={`card-preset-book-${book.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          {percent >= 90 && <Star className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          <span className="truncate">{book.title}</span>
                          {book.isBeta && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              <FlaskConical className="h-3 w-3 mr-1" />
                              Beta
                            </Badge>
                          )}
                        </CardTitle>
                        {book.author && (
                          <CardDescription className="mt-1">
                            by {book.author}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percent >= 90 ? "bg-green-500" : percent >= 70 ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getStatusColor(percent)}`}>
                        {masteredCount}/{totalCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedBook && (
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

              <div className="mt-4">
                <h4 className="text-sm font-medium mb-3">
                  Words in this book ({selectedBook.words.length})
                </h4>
                <div className="flex flex-wrap gap-2">
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

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mastered words</span>
                    <span className="font-medium">
                      {selectedBook.words.filter(w => masteredWordSet.has(w.toLowerCase())).length} / {selectedBook.words.length}
                    </span>
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
