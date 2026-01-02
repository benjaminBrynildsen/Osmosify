import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { StatBlock, StatsGrid } from "@/components/StatBlock";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles, BookOpen, FileText, Calendar, Play } from "lucide-react";
import { format } from "date-fns";
import type { ReadingSession } from "@shared/schema";

interface SessionDetailsResponse extends ReadingSession {
  newWords: string[];
  topRepeatedWords: { word: string; count: number }[];
}

export default function SessionDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const sessionId = params.id;

  const { data: session, isLoading } = useQuery<SessionDetailsResponse>({
    queryKey: ["/api/sessions", sessionId],
  });

  if (isLoading) {
    return <LoadingScreen message="Loading session..." />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Not Found" showBack backPath="/" />
        <div className="p-4">
          <EmptyState
            type="sessions"
            title="Session not found"
            description="This session doesn't exist or has been deleted."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title={session.bookTitle || "Reading Session"}
        showBack
        backPath={`/child/${session.childId}`}
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(session.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
        </div>

        <StatsGrid>
          <StatBlock
            value={session.newWordsCount}
            label="New Words"
            icon={Sparkles}
          />
          <StatBlock
            value={session.totalWordsCount}
            label="Total Words"
            icon={BookOpen}
          />
        </StatsGrid>

        {session.newWords && session.newWords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                New Words Discovered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {session.newWords.map((word, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium"
                    data-testid={`badge-session-new-word-${index}`}
                  >
                    {word}
                  </span>
                ))}
              </div>
              <Button
                variant="link"
                className="px-0 mt-4"
                onClick={() => setLocation(`/child/${session.childId}/flashcards`)}
                data-testid="link-practice-session-words"
              >
                <Play className="h-4 w-4 mr-1" />
                Practice these words
              </Button>
            </CardContent>
          </Card>
        )}

        {session.topRepeatedWords && session.topRepeatedWords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Top Repeated Words
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {session.topRepeatedWords.slice(0, 10).map(({ word, count }, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    data-testid={`row-repeated-word-${index}`}
                  >
                    <span className="font-medium">{word}</span>
                    <Badge variant="secondary">{count}x</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {session.cleanedText && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                  {session.cleanedText}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
