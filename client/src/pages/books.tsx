import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/AppHeader";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Check,
  Star,
  Loader2,
  Trash2,
  Library,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import type { Child, BookReadiness, Word, Book } from "@shared/schema";

type FilterType = "all" | "ready" | "almost" | "progress" | "custom" | "beta";

export default function Books() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newWords, setNewWords] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: readiness, isLoading: readinessLoading } = useQuery<BookReadiness[]>({
    queryKey: ["/api/children", childId, "book-readiness"],
    enabled: !!childId,
  });

  const { data: childWords } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const masteredWordSet = new Set(
    (childWords || [])
      .filter(w => w.status === "mastered")
      .map(w => w.word.toLowerCase())
  );

  const createBookMutation = useMutation({
    mutationFn: async () => {
      const wordList = newWords
        .split(/[\s,]+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0);
      
      return apiRequest("POST", "/api/books", {
        title: newTitle.trim(),
        author: newAuthor.trim() || null,
        words: wordList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "book-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setDialogOpen(false);
      setNewTitle("");
      setNewAuthor("");
      setNewWords("");
      toast({
        title: "Book Added",
        description: "The book has been added to the library",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add book",
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      return apiRequest("DELETE", `/api/books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "book-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Book Removed",
        description: "The book has been removed from the library",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove book",
        variant: "destructive",
      });
    },
  });

  if (childLoading || readinessLoading) {
    return <LoadingScreen message="Loading books..." />;
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

  const filterBooks = (items: BookReadiness[]) => {
    switch (filter) {
      case "ready":
        return items.filter(r => r.percent >= 90);
      case "almost":
        return items.filter(r => r.percent >= 70 && r.percent < 90);
      case "progress":
        return items.filter(r => r.percent < 70);
      case "custom":
        return items.filter(r => !r.book.isPreset);
      case "beta":
        return items.filter(r => r.book.isBeta);
      default:
        return items;
    }
  };

  const filteredBooks = filterBooks(readiness || []);
  const readyCount = (readiness || []).filter(r => r.percent >= 90).length;
  const almostCount = (readiness || []).filter(r => r.percent >= 70 && r.percent < 90).length;
  const progressCount = (readiness || []).filter(r => r.percent < 70).length;
  const customCount = (readiness || []).filter(r => !r.book.isPreset).length;
  const betaCount = (readiness || []).filter(r => r.book.isBeta).length;

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader
        title="Book Library"
        showBack
        backPath={`/child/${childId}`}
        rightAction={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-add-book">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add a Custom Book</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Book Title</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Enter book title"
                    data-testid="input-book-title"
                  />
                </div>
                <div>
                  <Label htmlFor="author">Author (optional)</Label>
                  <Input
                    id="author"
                    value={newAuthor}
                    onChange={e => setNewAuthor(e.target.value)}
                    placeholder="Enter author name"
                    data-testid="input-book-author"
                  />
                </div>
                <div>
                  <Label htmlFor="words">Words in this book</Label>
                  <Textarea
                    id="words"
                    value={newWords}
                    onChange={e => setNewWords(e.target.value)}
                    placeholder="Enter words separated by spaces or commas"
                    rows={4}
                    data-testid="input-book-words"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter all unique words from the book
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createBookMutation.mutate()}
                  disabled={!newTitle.trim() || !newWords.trim() || createBookMutation.isPending}
                  data-testid="button-save-book"
                >
                  {createBookMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Book
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => setLocation(`/child/${childId}/preset-books`)}
          data-testid="button-browse-preset-books"
        >
          <Library className="h-5 w-5" />
          Browse Preset Book Library
          <Badge variant="secondary" className="ml-auto">
            30+ Books
          </Badge>
        </Button>

        <p className="text-muted-foreground text-sm">
          Books become "Ready" when 90% or more words are mastered.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            All ({(readiness || []).length})
          </Button>
          <Button
            size="sm"
            variant={filter === "ready" ? "default" : "outline"}
            onClick={() => setFilter("ready")}
            className={filter === "ready" ? "bg-green-500 hover:bg-green-600" : ""}
            data-testid="filter-ready"
          >
            <Star className="h-3 w-3 mr-1" />
            Ready ({readyCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "almost" ? "default" : "outline"}
            onClick={() => setFilter("almost")}
            className={filter === "almost" ? "bg-amber-500 hover:bg-amber-600" : ""}
            data-testid="filter-almost"
          >
            Almost ({almostCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "progress" ? "default" : "outline"}
            onClick={() => setFilter("progress")}
            data-testid="filter-progress"
          >
            In Progress ({progressCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "custom" ? "default" : "outline"}
            onClick={() => setFilter("custom")}
            data-testid="filter-custom"
          >
            Custom ({customCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "beta" ? "default" : "outline"}
            onClick={() => setFilter("beta")}
            data-testid="filter-beta"
          >
            <FlaskConical className="h-3 w-3 mr-1" />
            Beta ({betaCount})
          </Button>
        </div>

        {filteredBooks.length > 0 ? (
          <div className="space-y-3">
            {filteredBooks.map(item => (
              <BookCard
                key={item.book.id}
                item={item}
                childId={childId!}
                onDelete={() => deleteBookMutation.mutate(item.book.id)}
                onCardClick={() => setSelectedBook(item.book)}
                isDeleting={deleteBookMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            type="sessions"
            title={filter === "all" ? "No books yet" : `No ${filter} books`}
            description={
              filter === "all"
                ? "Browse the preset library or add your own books to track reading readiness."
                : "Try a different filter or add more books."
            }
          />
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
                  {!selectedBook.isPreset && (
                    <Badge variant="outline" className="text-xs">
                      Custom
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

function BookCard({
  item,
  childId,
  onDelete,
  onCardClick,
  isDeleting,
}: {
  item: BookReadiness;
  childId: string;
  onDelete: () => void;
  onCardClick: () => void;
  isDeleting: boolean;
}) {
  const [, setLocation] = useLocation();
  
  const getCardStyle = () => {
    if (item.percent >= 90) return "border-green-500/50 bg-green-500/5";
    if (item.percent >= 70) return "border-amber-500/50 bg-amber-500/5";
    return "";
  };

  const getProgressColor = () => {
    if (item.percent >= 90) return "bg-green-500";
    if (item.percent >= 70) return "bg-amber-500";
    return "";
  };

  const getBadgeStyle = () => {
    if (item.percent >= 90) return "bg-green-500 text-white";
    if (item.percent >= 70) return "bg-amber-500 text-white";
    return "bg-white dark:bg-background text-foreground border border-foreground";
  };

  const unmasteredCount = item.totalCount - item.masteredCount;

  return (
    <Card className={getCardStyle()}>
      <CardHeader 
        className="pb-2 cursor-pointer hover-elevate" 
        onClick={onCardClick}
        data-testid={`card-book-${item.book.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {item.percent >= 90 && <Star className="h-4 w-4 text-green-500 flex-shrink-0" />}
              <span className="truncate">{item.book.title}</span>
              {item.book.isBeta && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  Beta
                </Badge>
              )}
              {!item.book.isPreset && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Custom
                </Badge>
              )}
            </CardTitle>
            {item.book.author && (
              <CardDescription className="mt-1">
                by {item.book.author}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={getBadgeStyle()}>
              {item.percent}%
            </Badge>
            {!item.book.isPreset && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                disabled={isDeleting}
                data-testid={`button-delete-book-${item.book.id}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor() || "bg-primary"}`}
              style={{ width: `${item.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {item.masteredCount} of {item.totalCount} words mastered
            </p>
            {unmasteredCount > 0 && (
              <Button
                size="sm"
                onClick={() => setLocation(`/child/${childId}/flashcards?bookId=${item.book.id}`)}
                data-testid={`button-practice-book-${item.book.id}`}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Practice
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
