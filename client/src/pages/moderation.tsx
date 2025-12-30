import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  BookOpen,
  Check,
  X,
  Loader2,
  ShieldCheck,
  User,
  Clock,
} from "lucide-react";
import type { Book } from "@shared/schema";

export default function ModerationQueue() {
  const { toast } = useToast();

  const { data: pendingBooks, isLoading } = useQuery<Book[]>({
    queryKey: ["/api/book-contributions/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (bookId: string) => {
      return apiRequest("POST", `/api/book-contributions/${bookId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-contributions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/preset-books"] });
      toast({
        title: "Book Approved",
        description: "The book has been added to the community library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Could not approve book",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (bookId: string) => {
      return apiRequest("POST", `/api/book-contributions/${bookId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-contributions/pending"] });
      toast({
        title: "Book Rejected",
        description: "The contribution has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Could not reject book",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Loading moderation queue..." />;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader
        title="Moderation Queue"
        showBack
        backPath="/"
      />

      <main className="container mx-auto max-w-3xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Pending Book Contributions</h2>
          <Badge variant="secondary">
            {pendingBooks?.length || 0} pending
          </Badge>
        </div>

        {!pendingBooks || pendingBooks.length === 0 ? (
          <EmptyState
            type="moderation"
            title="No Pending Contributions"
            description="All book contributions have been reviewed."
          />
        ) : (
          <div className="space-y-4">
            {pendingBooks.map((book) => (
              <Card key={book.id} data-testid={`card-pending-book-${book.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {book.title}
                      </CardTitle>
                      {book.author && (
                        <CardDescription>by {book.author}</CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    {book.gradeLevel && (
                      <Badge variant="secondary">{book.gradeLevel}</Badge>
                    )}
                    <Badge variant="outline">{book.wordCount} words</Badge>
                    {book.isbn && (
                      <Badge variant="outline">ISBN: {book.isbn}</Badge>
                    )}
                  </div>

                  {book.description && (
                    <p className="text-sm text-muted-foreground">
                      {book.description}
                    </p>
                  )}

                  <div className="bg-muted/50 p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Word List Preview</h4>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {book.words.slice(0, 30).map((word, index) => (
                        <span
                          key={`${word}-${index}`}
                          className="px-2 py-0.5 bg-background rounded text-xs"
                        >
                          {word}
                        </span>
                      ))}
                      {book.words.length > 30 && (
                        <span className="px-2 py-0.5 text-xs text-muted-foreground">
                          +{book.words.length - 30} more
                        </span>
                      )}
                    </div>
                  </div>

                  {book.contributorLabel && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Contributed by: {book.contributorLabel}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      className="flex-1 gap-2"
                      onClick={() => approveMutation.mutate(book.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      data-testid={`button-approve-${book.id}`}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => rejectMutation.mutate(book.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      data-testid={`button-reject-${book.id}`}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
