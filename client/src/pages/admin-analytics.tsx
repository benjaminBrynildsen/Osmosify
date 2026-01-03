import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Gamepad2, GraduationCap, UserPlus, TrendingUp, Activity } from "lucide-react";
import { Link } from "wouter";

interface AnalyticsSummary {
  totalSessions: number;
  sessionsWithGames: number;
  sessionsWithLessonComplete: number;
  convertedSessions: number;
  eventCounts: Record<string, number>;
}

export default function AdminAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Error loading analytics</div>
      </div>
    );
  }

  const data = analytics!;
  
  const gameStartRate = data.totalSessions > 0 
    ? Math.round((data.sessionsWithGames / data.totalSessions) * 100) 
    : 0;
  
  const lessonCompletionRate = data.sessionsWithGames > 0 
    ? Math.round((data.sessionsWithLessonComplete / data.sessionsWithGames) * 100) 
    : 0;
  
  const conversionRate = data.sessionsWithLessonComplete > 0 
    ? Math.round((data.convertedSessions / data.sessionsWithLessonComplete) * 100) 
    : 0;
  
  const overallConversionRate = data.totalSessions > 0 
    ? Math.round((data.convertedSessions / data.totalSessions) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Product Analytics</h1>
            <p className="text-muted-foreground">User engagement and conversion funnel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-sessions">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                Unique visitor sessions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-games-started">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Games Started</CardTitle>
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.sessionsWithGames}</div>
              <p className="text-xs text-muted-foreground">
                {gameStartRate}% of sessions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-lessons-completed">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.sessionsWithLessonComplete}</div>
              <p className="text-xs text-muted-foreground">
                {lessonCompletionRate}% of game sessions
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-conversions">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Signups</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.convertedSessions}</div>
              <p className="text-xs text-muted-foreground">
                {overallConversionRate}% overall conversion
              </p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-funnel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>
              User journey from session start to account creation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sessions</span>
                <span className="font-medium">{data.totalSessions}</span>
              </div>
              <Progress value={100} className="h-3" data-testid="progress-sessions" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Started a Game</span>
                <span className="font-medium">{data.sessionsWithGames} ({gameStartRate}%)</span>
              </div>
              <Progress value={gameStartRate} className="h-3" data-testid="progress-games" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed a Lesson</span>
                <span className="font-medium">
                  {data.sessionsWithLessonComplete} ({data.totalSessions > 0 
                    ? Math.round((data.sessionsWithLessonComplete / data.totalSessions) * 100) 
                    : 0}%)
                </span>
              </div>
              <Progress 
                value={data.totalSessions > 0 ? (data.sessionsWithLessonComplete / data.totalSessions) * 100 : 0} 
                className="h-3" 
                data-testid="progress-lessons"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Created Account</span>
                <span className="font-medium">{data.convertedSessions} ({overallConversionRate}%)</span>
              </div>
              <Progress value={overallConversionRate} className="h-3" data-testid="progress-conversions" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-events">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Event Breakdown
            </CardTitle>
            <CardDescription>
              All tracked product events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.eventCounts).length === 0 ? (
                <p className="text-muted-foreground text-sm">No events tracked yet</p>
              ) : (
                Object.entries(data.eventCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([eventType, count]) => (
                    <Badge 
                      key={eventType} 
                      variant="secondary"
                      className="text-sm"
                      data-testid={`badge-event-${eventType}`}
                    >
                      {eventType.replace(/_/g, " ")}: {count}
                    </Badge>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-key-metrics">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-md">
                <div className="text-sm text-muted-foreground">Game Start Rate</div>
                <div className="text-xl font-bold">{gameStartRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Sessions that try a game
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-md">
                <div className="text-sm text-muted-foreground">Lesson Completion Rate</div>
                <div className="text-xl font-bold">{lessonCompletionRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Game sessions that complete
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-md">
                <div className="text-sm text-muted-foreground">Post-Lesson Conversion</div>
                <div className="text-xl font-bold">{conversionRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Completers that sign up
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
