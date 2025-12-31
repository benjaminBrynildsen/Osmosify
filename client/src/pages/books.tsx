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
import { BookCoverCard } from "@/components/BookCoverCard";
import { BookCoverUpload } from "@/components/BookCoverUpload";
import { BookPurchaseLinks } from "@/components/BookPurchaseLinks";
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
  Gamepad2,
  PlusCircle,
  Camera,
  Type,
  Upload,
  Grid3X3,
  List,
  Search,
  Crown,
} from "lucide-react";
import type { Child, BookReadiness, Word, Book } from "@shared/schema";

type FilterType = "all" | "ready" | "almost" | "progress" | "mybooks" | "beta";
type ViewMode = "grid" | "list";

export default function Books() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addWordsBook, setAddWordsBook] = useState<Book | null>(null);
  const [addWordsMode, setAddWordsMode] = useState<"manual" | "upload" | null>(null);
  const [manualWords, setManualWords] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newWords, setNewWords] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");

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

  const appendWordsMutation = useMutation({
    mutationFn: async ({ bookId, words }: { bookId: string; words: string[] }) => {
      const response = await apiRequest("POST", `/api/books/${bookId}/append-words`, { words, childId });
      return response.json();
    },
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "book-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setAddWordsBook(null);
      setAddWordsMode(null);
      setManualWords("");
      toast({
        title: "Words Added",
        description: `Book now has ${book.wordCount} words`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add words to book",
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
    let result = items;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.book.title.toLowerCase().includes(query) ||
        (r.book.author && r.book.author.toLowerCase().includes(query))
      );
    }
    
    switch (filter) {
      case "ready":
        return result.filter(r => r.percent >= 90);
      case "almost":
        return result.filter(r => r.percent >= 70 && r.percent < 90);
      case "progress":
        return result.filter(r => r.percent < 70);
      case "mybooks":
        return result.filter(r => !r.book.isPreset);
      case "beta":
        return result.filter(r => r.book.isBeta);
      default:
        return result;
    }
  };

  const filteredBooks = filterBooks(readiness || []);
  
  const featuredBook = (readiness || []).find(r => 
    r.book.title.toLowerCase().includes("cat in the hat")
  );
  const readyCount = (readiness || []).filter(r => r.percent >= 90).length;
  const almostCount = (readiness || []).filter(r => r.percent >= 70 && r.percent < 90).length;
  const progressCount = (readiness || []).filter(r => r.percent < 70).length;
  const myBooksCount = (readiness || []).filter(r => !r.book.isPreset).length;
  const betaCount = (readiness || []).filter(r => r.book.isBeta).length;

  const handleAddManualWords = () => {
    if (!addWordsBook || !manualWords.trim()) return;
    const wordList = manualWords
      .split(/[\s,]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);
    if (wordList.length > 0) {
      appendWordsMutation.mutate({ bookId: addWordsBook.id, words: wordList });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader
        title="Book Library"
        showBack
        backPath={`/child/${childId}`}
        rightAction={
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setLocation(`/child/${childId}/upload`)}
            data-testid="button-add-book"
          >
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <main className="container mx-auto max-w-4xl p-4 space-y-4">
        {featuredBook && (
          <Card 
            className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 cursor-pointer hover-elevate"
            onClick={() => setSelectedBook(featuredBook.book)}
            data-testid="card-featured-book"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center shadow-md">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Featured Book</span>
                  </div>
                  <h3 className="font-bold text-lg truncate">{featuredBook.book.title}</h3>
                  {featuredBook.book.author && (
                    <p className="text-sm text-muted-foreground">by {featuredBook.book.author}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={featuredBook.percent} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{featuredBook.percent}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search books by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-books"
          />
        </div>

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
          Books become "Ready" when 90% or more words are unlocked.
        </p>

        <div className="flex flex-wrap gap-2 items-center">
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
            variant={filter === "mybooks" ? "default" : "outline"}
            onClick={() => setFilter("mybooks")}
            data-testid="filter-mybooks"
          >
            <Upload className="h-3 w-3 mr-1" />
            My Books ({myBooksCount})
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
          <div className="ml-auto flex gap-1">
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

        {filteredBooks.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredBooks.map(item => (
                <BookCoverCard
                  key={item.book.id}
                  book={item.book}
                  readinessPercent={item.percent}
                  masteredCount={item.masteredCount}
                  totalCount={item.totalCount}
                  onClick={() => setSelectedBook(item.book)}
                />
              ))}
            </div>
          ) : (
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
          )
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
                    <Badge variant="secondary" className="text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      My Book
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
                    <span className="text-muted-foreground">Unlocked words</span>
                    <span className="font-medium">
                      {selectedBook.words.filter(w => masteredWordSet.has(w.toLowerCase())).length} / {selectedBook.words.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <BookPurchaseLinks book={selectedBook} />
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    className="w-full gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    onClick={() => {
                      setSelectedBook(null);
                      setLocation(`/child/${childId}/word-pop?bookId=${selectedBook.id}&lessonMode=true`);
                    }}
                    data-testid="button-start-lesson"
                  >
                    <BookOpen className="h-4 w-4" />
                    Start Lesson
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedBook(null);
                      setLocation(`/child/${childId}/flashcards?bookId=${selectedBook.id}`);
                    }}
                    data-testid="button-unlock-words"
                  >
                    <Sparkles className="h-4 w-4" />
                    Flashcards
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
                  {!selectedBook.isPreset && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setAddWordsBook(selectedBook);
                          setSelectedBook(null);
                        }}
                        data-testid="button-add-words-to-book"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add More Words
                      </Button>
                      <BookCoverUpload 
                        book={selectedBook} 
                        childId={childId!}
                        onSuccess={() => setSelectedBook(null)}
                      />
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!addWordsBook} onOpenChange={() => { setAddWordsBook(null); setAddWordsMode(null); setManualWords(""); }}>
        <DialogContent className="max-w-lg">
          {addWordsBook && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Add Words to "{addWordsBook.title}"
                </DialogTitle>
              </DialogHeader>

              {!addWordsMode ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    How would you like to add more words?
                  </p>
                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                    onClick={() => setAddWordsMode("manual")}
                    data-testid="button-add-words-manual"
                  >
                    <Type className="h-4 w-4" />
                    Type words manually
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 justify-start"
                    onClick={() => {
                      setAddWordsBook(null);
                      setAddWordsMode(null);
                      setLocation(`/child/${childId}/upload?bookId=${addWordsBook.id}&bookTitle=${encodeURIComponent(addWordsBook.title)}`);
                    }}
                    data-testid="button-add-words-upload"
                  >
                    <Camera className="h-4 w-4" />
                    Upload more photos
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="manualWords">Enter words (separated by spaces or commas)</Label>
                    <Textarea
                      id="manualWords"
                      value={manualWords}
                      onChange={(e) => setManualWords(e.target.value)}
                      placeholder="cat dog house tree..."
                      className="mt-2 min-h-32"
                      data-testid="textarea-manual-words"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAddWordsMode(null)}
                      data-testid="button-back"
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAddManualWords}
                      disabled={!manualWords.trim() || appendWordsMutation.isPending}
                      data-testid="button-save-words"
                    >
                      {appendWordsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Add Words
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
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
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  <Upload className="h-3 w-3 mr-1" />
                  My Book
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
              {item.masteredCount} of {item.totalCount} words unlocked
            </p>
            {unmasteredCount > 0 && (
              <Button
                size="sm"
                onClick={() => setLocation(`/child/${childId}/flashcards?bookId=${item.book.id}`)}
                data-testid={`button-practice-book-${item.book.id}`}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Unlock
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
