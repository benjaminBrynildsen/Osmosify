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
import type { Child, PresetWordList, Book } from "@shared/schema";

interface ChildAddedPreset {
  id: string;
  childId: string;
  presetId: string;
  addedAt: string;
  preset: PresetWordList;
}

interface ChildAddedBook {
  id: string;
  childId: string;
  bookId: string;
  addedAt: string;
  book: Book;
}

export default function MyLibrary() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: addedBooks, isLoading: booksLoading } = useQuery<ChildAddedBook[]>({
    queryKey: ["/api/children", childId, "added-books"],
    enabled: !!childId,
  });

  const { data: addedPresets, isLoading: presetsLoading } = useQuery<ChildAddedPreset[]>({
    queryKey: ["/api/children", childId, "added-presets"],
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

  const isLoading = booksLoading || presetsLoading;
  
  const hasBooks = addedBooks && addedBooks.length > 0;
  const hasPresets = addedPresets && addedPresets.length > 0;
  const hasContent = hasBooks || hasPresets;

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
            <p className="text-sm text-muted-foreground">Books and word lists you've added</p>
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
            description="Start reading books or add word lists to see them here."
          />
        ) : (
          <>
            {/* My Books */}
            {hasBooks && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-emerald-500" />
                  My Books ({addedBooks.length})
                </h3>
                <div className="space-y-3">
                  {addedBooks.map((ab) => (
                    <Card 
                      key={ab.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => {
                        setLocation(`/child/${childId}/word-pop?bookId=${ab.bookId}&lessonMode=true`);
                      }}
                      data-testid={`card-my-book-${ab.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {ab.book.coverImageUrl || ab.book.customCoverUrl ? (
                            <img 
                              src={ab.book.customCoverUrl || ab.book.coverImageUrl || ""} 
                              alt={ab.book.title}
                              className="w-12 h-16 object-cover rounded-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md flex items-center justify-center flex-shrink-0">
                              <BookMarked className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{ab.book.title}</h4>
                            {ab.book.author && (
                              <p className="text-sm text-muted-foreground truncate">by {ab.book.author}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">{ab.book.words?.length || 0} words</p>
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
            )}

            {/* My Word Lists */}
            {hasPresets && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-blue-500" />
                  My Word Lists ({addedPresets.length})
                </h3>
                <div className="space-y-3">
                  {addedPresets.map((ap) => (
                    <Card 
                      key={ap.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/child/${childId}/presets`)}
                      data-testid={`card-my-preset-${ap.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md flex items-center justify-center flex-shrink-0">
                            <ListPlus className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{ap.preset.name}</h4>
                            {ap.preset.description && (
                              <p className="text-sm text-muted-foreground truncate">{ap.preset.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">{ap.preset.words?.length || 0} words</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
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
