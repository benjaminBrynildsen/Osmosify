import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Star, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Osmosify</span>
        </div>
        <Button asChild data-testid="button-sign-in">
          <a href="/api/login">Sign In</a>
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Build Readers, One Word at a Time
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Track your child's reading progress with AI-powered page scanning.
            Build vocabulary through adaptive flashcards and fun word games.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login">Get Started Free</a>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI Page Scanner</h3>
              <p className="text-sm text-muted-foreground">
                Snap a photo of any book page and instantly extract words for practice
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Adaptive Flashcards</h3>
              <p className="text-sm text-muted-foreground">
                Words move from learning to mastered with 7 correct answers
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
