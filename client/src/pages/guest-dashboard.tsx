import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Lock,
  BookMarked,
  ListPlus,
  Library,
  Camera,
  RefreshCw,
  Mail,
  GraduationCap,
  ChevronRight,
  Flame,
  FolderHeart,
  TrendingUp,
  MessageSquareText,
} from "lucide-react";
import type { Book } from "@shared/schema";

interface FeaturedBook {
  id: string;
  book: Book;
  expiresAt: string;
}

export default function GuestDashboard() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { guestData } = useGuestModeContext();
  const childId = params.id;
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  const child = guestData.child;
  const words = guestData.words;

  const { data: featuredBook } = useQuery<FeaturedBook | null>({
    queryKey: ["/api/featured-book"],
  });

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
        {featuredBook?.book && (
          <Card 
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 cursor-pointer hover-elevate overflow-hidden relative"
            onClick={handleLockedClick}
            data-testid="card-featured-book"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground z-10" />
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

        <StatsGrid>
          <StatBlock
            value={words.length}
            label="Words in Library"
            icon={BookOpen}
          />
          <StatBlock
            value={unlockedWords.length}
            label="Unlocked"
            icon={Unlock}
          />
          <StatBlock
            value="Pre-K"
            label="Reading Level"
            icon={GraduationCap}
          />
          <StatBlock
            value={0}
            label="Sentences Read"
            icon={MessageSquareText}
          />
        </StatsGrid>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="secondary"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => setLocation(`/guest/child/${childId}/flashcards`)}
            disabled={newWords.length + learningWords.length === 0}
            data-testid="button-flashcards"
          >
            <Sparkles className="h-6 w-6" />
            <span>Flashcards</span>
          </Button>
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
            className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
            onClick={() => setLocation(`/guest/child/${childId}/word-pop`)}
            disabled={words.length < 4}
            data-testid="button-word-pop"
          >
            <Gamepad2 className="h-6 w-6 text-purple-500" />
            <span>Word Pop</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-my-library-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <FolderHeart className="h-6 w-6 text-rose-500" />
            <span>My Library</span>
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
            data-testid="button-presets-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <ListPlus className="h-6 w-6" />
            <span>Word Lists</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 relative opacity-60"
            onClick={handleLockedClick}
            data-testid="button-lava-letters-locked"
          >
            <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            <Badge className="absolute top-1 left-1 text-xs bg-green-500 text-white">NEW</Badge>
            <Flame className="h-6 w-6 text-orange-500" />
            <span>Lava Letters</span>
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

          <div className="invisible" />
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
                  onClick={() => setLocation(`/guest/child/${childId}/flashcards`)}
                  data-testid="link-practice-new-words"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Start unlocking these words
                </Button>
              )}
            </CardContent>
          </Card>
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
              onClick={() => setLocation("/login")}
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
