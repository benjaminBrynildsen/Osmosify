import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingSpinner";
import {
  BookMarked,
  ListPlus,
  ChevronRight,
  FolderHeart,
  Play,
} from "lucide-react";
import type { Child, ReadingSession } from "@shared/schema";

export default function MyLibrary() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<ReadingSession[]>({
    queryKey: ["/api/children", childId, "sessions"],
    enabled: !!childId,
  });

  if (childLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Not Found" showBack backPath="/" />
        <div className="p-4">
          <EmptyState
            type="children"
            title="Child not found"
            description="This profile doesn't exist or has been deleted."
          />
        </div>
      </div>
    );
  }

  const isLoading = sessionsLoading;
  
  // Get unique books from sessions (by title)
  const uniqueBooks = sessions?.reduce((acc, session) => {
    if (session.bookTitle && !acc.some(b => b.title === session.bookTitle)) {
      acc.push({
        title: session.bookTitle,
        bookId: session.bookId,
        lastRead: session.createdAt,
        wordCount: session.newWordsCount || 0,
      });
    }
    return acc;
  }, [] as { title: string; bookId: string | null; lastRead: Date; wordCount: number }[]) || [];

  const hasContent = uniqueBooks.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title="My Library"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
            <FolderHeart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">{child.name}'s Library</h2>
            <p className="text-sm text-muted-foreground">Books and word lists you've explored</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !hasContent ? (
          <EmptyState
            type="sessions"
            title="Your library is empty"
            description="Start reading books to add them to your library."
          />
        ) : (
          <>
            {/* My Books */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-emerald-500" />
                My Books ({uniqueBooks.length})
              </h3>
              <div className="space-y-3">
                {uniqueBooks.map((book, index) => (
                  <Card 
                    key={`${book.title}-${index}`}
                    className="cursor-pointer hover-elevate"
                    onClick={() => {
                      if (book.bookId) {
                        setLocation(`/child/${childId}/word-pop?bookId=${book.bookId}&lessonMode=true`);
                      } else {
                        setLocation(`/child/${childId}/books?openBook=${encodeURIComponent(book.title)}`);
                      }
                    }}
                    data-testid={`card-my-book-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md flex items-center justify-center flex-shrink-0">
                          <BookMarked className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{book.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {book.wordCount > 0 ? `${book.wordCount} words learned` : "Tap to continue"}
                          </p>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Add more to your library</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => setLocation(`/child/${childId}/books`)}
              data-testid="button-browse-books"
            >
              <BookMarked className="h-5 w-5" />
              <span className="text-sm">Browse Books</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => setLocation(`/child/${childId}/presets`)}
              data-testid="button-browse-word-lists"
            >
              <ListPlus className="h-5 w-5" />
              <span className="text-sm">Word Lists</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
