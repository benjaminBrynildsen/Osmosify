import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { SessionCard } from "@/components/SessionCard";
import { StatBlock, StatsGrid } from "@/components/StatBlock";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingSpinner";
import {
  BookOpen,
  Unlock,
  Library,
  Settings,
  GraduationCap,
  BookMarked,
  Play,
  ChevronRight,
  MessageSquareText,
  FolderHeart,
  ListPlus,
} from "lucide-react";
import type { Child, ReadingSession, Word, Book } from "@shared/schema";

interface GradeLevelResponse {
  gradeLevel: string;
  numericLevel: number;
  masteredCount: number;
  avgWordLength: string;
}

interface FeaturedBook {
  id: string;
  book: Book;
  expiresAt: string;
}

export default function ChildDashboard() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: sessions } = useQuery<ReadingSession[]>({
    queryKey: ["/api/children", childId, "sessions"],
    enabled: !!childId,
  });

  const { data: words } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const { data: gradeLevel } = useQuery<GradeLevelResponse>({
    queryKey: ["/api/children", childId, "grade-level"],
    enabled: !!childId,
  });

  const { data: featuredBook } = useQuery<FeaturedBook | null>({
    queryKey: ["/api/featured-book"],
  });

  if (childLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
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

  const unlockedWords = words?.filter((w) => w.status === "mastered") || [];
  
  const sortedSessions = [...(sessions || [])].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const lastSession = sortedSessions.find(s => s.bookTitle);
  const hasRecentActivity = lastSession && lastSession.bookTitle;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title={child.name}
        showBack
        backPath="/"
        rightAction={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation(`/child/${childId}/settings`)}
            data-testid="button-child-settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        }
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        {/* 1. Featured Book */}
        {featuredBook && featuredBook.book && (
          <Card 
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 cursor-pointer hover-elevate overflow-hidden"
            onClick={() => setLocation(`/child/${childId}/books?openBook=${encodeURIComponent(featuredBook.book.title)}`)}
            data-testid="card-featured-book"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {featuredBook.book.coverImageUrl || featuredBook.book.customCoverUrl ? (
                  <img 
                    src={featuredBook.book.customCoverUrl || featuredBook.book.coverImageUrl || ""} 
                    alt={featuredBook.book.title}
                    className="w-16 h-20 object-cover rounded-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-md flex items-center justify-center flex-shrink-0">
                    <BookMarked className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Featured Book</p>
                  <h3 className="font-semibold truncate">{featuredBook.book.title}</h3>
                  {featuredBook.book.author && (
                    <p className="text-sm text-muted-foreground truncate">by {featuredBook.book.author}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. Stat Boxes: Words in My Library, Words Unlocked, Grade Level, Sentences Read */}
        <StatsGrid>
          <StatBlock
            value={words?.length || 0}
            label="My Words"
            icon={BookOpen}
          />
          <StatBlock
            value={unlockedWords.length}
            label="Unlocked"
            icon={Unlock}
          />
          <StatBlock
            value={gradeLevel?.gradeLevel || "Pre-K"}
            label="Grade Level"
            icon={GraduationCap}
          />
          <StatBlock
            value={child.sentencesRead || 0}
            label="Sentences Read"
            icon={MessageSquareText}
          />
        </StatsGrid>

        {/* 3. Jump Back In */}
        {hasRecentActivity && (
          <Card 
            className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 cursor-pointer hover-elevate"
            onClick={() => {
              if (lastSession.bookId) {
                setLocation(`/child/${childId}/word-pop?bookId=${lastSession.bookId}&lessonMode=true`);
              } else {
                setLocation(`/child/${childId}/books?openBook=${encodeURIComponent(lastSession.bookTitle || '')}`);
              }
            }}
            data-testid="card-jump-back-in"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Jump Back In</p>
                  <h3 className="font-semibold truncate">{lastSession.bookTitle}</h3>
                  <p className="text-sm text-muted-foreground">Continue where you left off</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Book Library */}
        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation(`/child/${childId}/books`)}
          data-testid="card-book-library"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Book Library</h3>
                <p className="text-sm text-muted-foreground">Browse and add new books</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {/* 5. My Library Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FolderHeart className="w-5 h-5 text-primary" />
            My Library
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setLocation(`/child/${childId}/library`)}
              data-testid="button-my-words"
            >
              <Library className="h-6 w-6" />
              <span>My Words</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setLocation(`/child/${childId}/presets`)}
              data-testid="button-word-lists"
            >
              <ListPlus className="h-6 w-6" />
              <span>Word Lists</span>
            </Button>
          </div>
        </div>

        {/* Recent Sessions */}
        {sortedSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Sessions</h3>
              {sessions && sessions.length > 5 && (
                <Button variant="ghost" className="px-0 text-primary" onClick={() => setLocation(`/child/${childId}/sessions`)}>
                  View all
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {sortedSessions.slice(0, 3).map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
