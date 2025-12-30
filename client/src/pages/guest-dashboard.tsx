import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { StatBlock, StatsGrid } from "@/components/StatBlock";
import { useGuestModeContext } from "@/hooks/use-guest-mode";
import {
  BookOpen,
  Sparkles,
  Unlock,
  Gamepad2,
  CheckCircle2,
} from "lucide-react";

export default function GuestDashboard() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { guestData } = useGuestModeContext();
  const childId = params.id;

  const child = guestData.child;
  const words = guestData.words;

  if (!child || child.id !== childId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Not Found" showBack backPath="/" />
        <div className="p-4 text-center text-muted-foreground">
          Guest profile not found.
        </div>
      </div>
    );
  }

  const newWords = words.filter((w) => w.status === "new");
  const learningWords = words.filter((w) => w.status === "learning");
  const unlockedWords = words.filter((w) => w.status === "mastered");

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title={child.name}
        showBack
        backPath="/"
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        <StatsGrid>
          <StatBlock
            value={words.length}
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
        </StatsGrid>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              variant="secondary"
              className="flex-1 h-auto py-4 flex-col gap-2"
              onClick={() => setLocation(`/guest/child/${childId}/flashcards`)}
              disabled={newWords.length + learningWords.length === 0}
              data-testid="button-flashcards"
            >
              <Sparkles className="h-6 w-6" />
              <span>Unlock Words</span>
            </Button>
            {guestData.flashcardSessionCompleted && (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-auto py-4 flex-col gap-2"
              onClick={() => setLocation(`/guest/child/${childId}/word-pop`)}
              disabled={words.length === 0}
              data-testid="button-word-pop"
            >
              <Gamepad2 className="h-6 w-6" />
              <span>Pop Game</span>
            </Button>
            {guestData.popGameCompleted && (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            )}
          </div>
        </div>

        {words.length > 0 && (
          <div className="bg-muted/50 rounded-md p-4">
            <h3 className="font-medium mb-3">Your Practice Words</h3>
            <div className="flex flex-wrap gap-2">
              {words.slice(0, 20).map((word) => (
                <span
                  key={word.id}
                  className={`px-2 py-1 rounded text-sm ${
                    word.status === "mastered"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : word.status === "learning"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`word-${word.word}`}
                >
                  {word.word}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Try both activities to see all Osmosify has to offer!
        </p>
      </main>
    </div>
  );
}
