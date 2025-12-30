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
  Camera,
  BookOpen,
  Sparkles,
  Unlock,
  RefreshCw,
  Library,
  Settings,
  GraduationCap,
  TrendingUp,
  ListPlus,
  BookMarked,
  Gamepad2,
} from "lucide-react";
import type { Child, ReadingSession, Word } from "@shared/schema";

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

  const newWords = words?.filter((w) => w.status === "new") || [];
  const learningWords = words?.filter((w) => w.status === "learning") || [];
  const unlockedWords = words?.filter((w) => w.status === "mastered") || [];
  const recentSessions = sessions?.slice(0, 5) || [];

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
        <StatsGrid>
          <StatBlock
            value={words?.length || 0}
            label="Total Words"
            icon={BookOpen}
          />
          <StatBlock
            value={unlockedWords.length}
            label="Unlocked"
            icon={Unlock}
          />
          <StatBlock
            value={newWords.length}
            label="New Words"
            icon={Sparkles}
          />
          <StatBlock
            value={sessions?.length || 0}
            label="Sessions"
            icon={GraduationCap}
          />
        </StatsGrid>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="secondary"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/child/${childId}/flashcards`)}
            disabled={newWords.length + learningWords.length === 0}
            data-testid="button-flashcards"
          >
            <Sparkles className="h-6 w-6" />
            <span>Unlock Words</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/child/${childId}/books`)}
            data-testid="button-books"
          >
            <BookMarked className="h-6 w-6" />
            <span>Unlock Books</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/child/${childId}/presets`)}
            data-testid="button-presets"
          >
            <ListPlus className="h-6 w-6" />
            <span>Word Lists</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/child/${childId}/library`)}
            data-testid="button-word-library"
          >
            <Library className="h-6 w-6" />
            <span>Word Library</span>
          </Button>
          <Button
            size="lg"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/child/${childId}/upload`)}
            data-testid="button-new-session"
          >
            <Camera className="h-6 w-6" />
            <span>Upload Book</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/child/${childId}/history-test`)}
            disabled={unlockedWords.length + learningWords.length === 0}
            data-testid="button-history-test"
          >
            <RefreshCw className="h-6 w-6" />
            <span>Keep Words Strong</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
            onClick={() => setLocation(`/child/${childId}/word-pop`)}
            disabled={(words?.length || 0) < 4}
            data-testid="button-word-pop"
          >
            <Gamepad2 className="h-6 w-6 text-purple-500" />
            <span>Word Pop</span>
          </Button>
        </div>

        {newWords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Words Ready to Unlock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {newWords.slice(0, 10).map((word) => (
                  <span
                    key={word.id}
                    className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium"
                    data-testid={`badge-new-word-${word.id}`}
                  >
                    {word.word}
                  </span>
                ))}
                {newWords.length > 10 && (
                  <span className="px-3 py-1.5 text-sm text-muted-foreground">
                    +{newWords.length - 10} more
                  </span>
                )}
              </div>
              {newWords.length > 0 && (
                <Button
                  variant="ghost"
                  className="px-0 mt-3 text-primary"
                  onClick={() => setLocation(`/child/${childId}/flashcards`)}
                  data-testid="link-practice-new-words"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Start unlocking these words
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Sessions</h3>
            {sessions && sessions.length > 5 && (
              <Button variant="ghost" className="px-0 text-primary" onClick={() => setLocation(`/child/${childId}/sessions`)}>
                View all
              </Button>
            )}
          </div>
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState
              type="sessions"
              title="No reading sessions yet"
              description="Upload pages from a book to start tracking vocabulary."
            />
          )}
        </div>
      </main>
    </div>
  );
}
