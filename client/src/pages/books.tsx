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
} from "lucide-react";
import type { Child, BookReadiness } from "@shared/schema";

export default function Books() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newWords, setNewWords] = useState("");

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: readiness, isLoading: readinessLoading } = useQuery<BookReadiness[]>({
    queryKey: ["/api/children", childId, "book-readiness"],
    enabled: !!childId,
  });

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

  const readyBooks = readiness?.filter(r => r.isReady) || [];
  const inProgressBooks = readiness?.filter(r => !r.isReady && r.percent > 0) || [];
  const notStartedBooks = readiness?.filter(r => r.percent === 0) || [];

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
                <DialogTitle>Add a Book</DialogTitle>
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

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        <p className="text-muted-foreground">
          Track which books {child.name} is ready to read. Books become "ready" when 80% or more of their words are mastered.
        </p>

        {readyBooks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Ready to Read ({readyBooks.length})
            </h2>
            <div className="space-y-3">
              {readyBooks.map(item => (
                <BookCard
                  key={item.book.id}
                  item={item}
                  onDelete={() => deleteBookMutation.mutate(item.book.id)}
                  isDeleting={deleteBookMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {inProgressBooks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              In Progress ({inProgressBooks.length})
            </h2>
            <div className="space-y-3">
              {inProgressBooks.map(item => (
                <BookCard
                  key={item.book.id}
                  item={item}
                  onDelete={() => deleteBookMutation.mutate(item.book.id)}
                  isDeleting={deleteBookMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {notStartedBooks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
              Not Started ({notStartedBooks.length})
            </h2>
            <div className="space-y-3">
              {notStartedBooks.map(item => (
                <BookCard
                  key={item.book.id}
                  item={item}
                  onDelete={() => deleteBookMutation.mutate(item.book.id)}
                  isDeleting={deleteBookMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {(!readiness || readiness.length === 0) && (
          <EmptyState
            type="sessions"
            title="No books yet"
            description="Add books to track which ones your child is ready to read."
          />
        )}
      </main>
    </div>
  );
}

function BookCard({
  item,
  onDelete,
  isDeleting,
}: {
  item: BookReadiness;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card className={item.isReady ? "border-yellow-500/50 bg-yellow-500/5" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {item.isReady && <Check className="h-4 w-4 text-green-500 flex-shrink-0" />}
              <span className="truncate">{item.book.title}</span>
            </CardTitle>
            {item.book.author && (
              <CardDescription className="mt-1">
                by {item.book.author}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={item.isReady ? "default" : "secondary"}>
              {item.percent}%
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              disabled={isDeleting}
              data-testid={`button-delete-book-${item.book.id}`}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={item.percent} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {item.masteredCount} of {item.totalCount} words mastered
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
