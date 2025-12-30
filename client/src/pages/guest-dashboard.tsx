import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { StatBlock, StatsGrid } from "@/components/StatBlock";
import { useGuestModeContext } from "@/hooks/use-guest-mode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Sparkles,
  Unlock,
  Gamepad2,
  CheckCircle2,
  Lock,
  BookMarked,
  ListPlus,
  Library,
  Camera,
  RefreshCw,
  Mail,
} from "lucide-react";

export default function GuestDashboard() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { guestData } = useGuestModeContext();
  const childId = params.id;
  const [showSignupDialog, setShowSignupDialog] = useState(false);

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

  const handleLockedClick = () => {
    setShowSignupDialog(true);
  };

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

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-auto py-4 flex-col gap-2"
              onClick={() => setLocation(`/guest/child/${childId}/flashcards`)}
              disabled={newWords.length + learningWords.length === 0}
              data-testid="button-flashcards"
            >
              <Sparkles className="h-6 w-6" />
              <span>Flashcards</span>
            </Button>
            {guestData.flashcardSessionCompleted && (
              <CheckCircle2 className="absolute -top-1 -right-1 h-5 w-5 text-green-500 bg-background rounded-full" />
            )}
          </div>

          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-books-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <BookMarked className="h-6 w-6" />
            <span>Book Library</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-presets-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <ListPlus className="h-6 w-6" />
            <span>Word Lists</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-library-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <Library className="h-6 w-6" />
            <span>Word Library</span>
          </Button>

          <Button
            size="lg"
            className="h-auto py-4 flex-col gap-2 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-upload-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <Camera className="h-6 w-6" />
            <span>Upload Book</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-history-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <RefreshCw className="h-6 w-6" />
            <span>Keep Words Strong</span>
          </Button>

          <div className="relative col-span-2">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-auto py-4 flex-col gap-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
              onClick={() => setLocation(`/guest/child/${childId}/word-pop`)}
              disabled={words.length < 4}
              data-testid="button-word-pop"
            >
              <Gamepad2 className="h-6 w-6 text-purple-500" />
              <span>Word Pop</span>
            </Button>
            {guestData.popGameCompleted && (
              <CheckCircle2 className="absolute -top-1 -right-1 h-5 w-5 text-green-500 bg-background rounded-full" />
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
          Try Flashcards and Word Pop to see what Osmosify can do!
        </p>
      </main>

      <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock All Features</DialogTitle>
            <DialogDescription className="pt-2">
              Sign up to access the full Osmosify experience including book library, 
              word lists, progress tracking, and more!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-center text-lg font-medium text-primary">
              It's free!
            </p>
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-signup-email"
            >
              <Mail className="h-5 w-5" />
              Sign up with Email
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Your guest progress will be saved when you sign up.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
