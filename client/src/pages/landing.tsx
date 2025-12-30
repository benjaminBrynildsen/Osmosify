import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Unlock, Sparkles, ArrowRight, Eye, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

interface LandingProps {
  onTryFree?: () => void;
}

export default function Landing({ onTryFree }: LandingProps) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Osmosify</span>
        </div>
        <Button asChild data-testid="button-sign-in">
          <a href="/login">Sign In</a>
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            They don't struggle through books.
            <br />
            <span className="text-primary">They unlock the words first.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Osmosify quietly prepares your child's vocabulary so when it's time to read, the book finally clicks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/login" className="gap-2">
                Sign In
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            {onTryFree && (
              <Button size="lg" variant="outline" onClick={onTryFree} data-testid="button-try-free">
                Try it Free
              </Button>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No account needed to try. Sign in anytime to save your progress.
          </p>
        </div>

        <div className="w-full max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">How Osmosify Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                1
              </div>
              <CardContent className="pt-8 pb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Words First</h3>
                <p className="text-sm text-muted-foreground">
                  Osmosify collects and tracks the words your child is exposed to through reading sessions and book preparation.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                2
              </div>
              <CardContent className="pt-8 pb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Quiet Unlocking</h3>
                <p className="text-sm text-muted-foreground">
                  Words are practiced naturally until they're truly known. No pressure, no drills, no forced reading.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                3
              </div>
              <CardContent className="pt-8 pb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">The Reveal</h3>
                <p className="text-sm text-muted-foreground">
                  When your child opens the book, the words feel familiar. Reading suddenly works.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI Page Scanner</h3>
              <p className="text-sm text-muted-foreground">
                Snap a photo of any book page and instantly extract words for preparation
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Unlock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Word Unlocking</h3>
              <p className="text-sm text-muted-foreground">
                Words move from new to learning to unlocked with 7 correct answers
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Multi-Child Profiles</h3>
              <p className="text-sm text-muted-foreground">
                Track progress for each child with customized settings
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Built for parents and teachers who love reading</p>
      </footer>
    </div>
  );
}
