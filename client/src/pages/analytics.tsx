import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gamepad2, GraduationCap, UserCheck, ArrowRight, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface FunnelMetrics {
  totalSessions: number;
  sessionsPlayedGame: number;
  sessionsCompletedLesson: number;
  sessionsConverted: number;
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  loading 
}: { 
  title: string; 
  value: number | string; 
  description: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function FunnelStep({ 
  label, 
  value, 
  percentage, 
  conversionRate,
  loading 
}: { 
  label: string; 
  value: number;
  percentage: number;
  conversionRate?: number;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {loading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <span className="text-sm font-bold">{value.toLocaleString()}</span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-2 w-full" />
      ) : (
        <Progress value={percentage} className="h-2" />
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percentage.toFixed(1)}% of total</span>
        {conversionRate !== undefined && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {conversionRate.toFixed(1)}% conversion from previous
          </span>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: metrics, isLoading } = useQuery<FunnelMetrics>({
    queryKey: ["/api/analytics/funnel"],
  });

  const total = metrics?.totalSessions || 0;
  const played = metrics?.sessionsPlayedGame || 0;
  const completed = metrics?.sessionsCompletedLesson || 0;
  const converted = metrics?.sessionsConverted || 0;

  const playedPct = total > 0 ? (played / total) * 100 : 0;
  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const convertedPct = total > 0 ? (converted / total) * 100 : 0;

  const playedToCompletedRate = played > 0 ? (completed / played) * 100 : 0;
  const completedToConvertedRate = completed > 0 ? (converted / completed) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Session Analytics</h1>
          <p className="text-muted-foreground">Track anonymous session engagement and conversion funnel</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Sessions"
            value={total.toLocaleString()}
            description="Unique visitor sessions"
            icon={Users}
            loading={isLoading}
          />
          <MetricCard
            title="Played Game"
            value={played.toLocaleString()}
            description="Sessions that started a game"
            icon={Gamepad2}
            loading={isLoading}
          />
          <MetricCard
            title="Completed Lesson"
            value={completed.toLocaleString()}
            description="Full lesson completions"
            icon={GraduationCap}
            loading={isLoading}
          />
          <MetricCard
            title="Converted"
            value={converted.toLocaleString()}
            description="Created an account"
            icon={UserCheck}
            loading={isLoading}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conversion Funnel
            </CardTitle>
            <CardDescription>
              Journey from anonymous session to registered user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FunnelStep
              label="All Sessions"
              value={total}
              percentage={100}
              loading={isLoading}
            />
            
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <FunnelStep
              label="Started a Game"
              value={played}
              percentage={playedPct}
              conversionRate={playedPct}
              loading={isLoading}
            />
            
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <FunnelStep
              label="Completed a Lesson"
              value={completed}
              percentage={completedPct}
              conversionRate={playedToCompletedRate}
              loading={isLoading}
            />
            
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <FunnelStep
              label="Created Account"
              value={converted}
              percentage={convertedPct}
              conversionRate={completedToConvertedRate}
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Conversion Rates</CardTitle>
            <CardDescription>Summary of funnel step conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-3xl font-bold text-primary" data-testid="text-rate-session-to-game">
                  {isLoading ? <Skeleton className="h-9 w-16 mx-auto" /> : `${playedPct.toFixed(1)}%`}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Session → Game Started</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-3xl font-bold text-primary" data-testid="text-rate-game-to-lesson">
                  {isLoading ? <Skeleton className="h-9 w-16 mx-auto" /> : `${playedToCompletedRate.toFixed(1)}%`}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Game → Lesson Complete</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-3xl font-bold text-primary" data-testid="text-rate-lesson-to-signup">
                  {isLoading ? <Skeleton className="h-9 w-16 mx-auto" /> : `${completedToConvertedRate.toFixed(1)}%`}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Lesson → Account Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
