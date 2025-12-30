import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { useGuestModeContext } from "@/hooks/use-guest-mode";

const SAMPLE_WORD_LISTS = [
  {
    name: "Sight Words - Kindergarten",
    words: ["the", "and", "a", "to", "said", "in", "he", "she", "it", "was", "you", "for", "on", "are", "they", "with", "his", "her", "all", "have"],
  },
  {
    name: "Sight Words - First Grade",
    words: ["after", "again", "could", "every", "first", "from", "had", "just", "know", "little", "made", "may", "new", "old", "our", "over", "some", "take", "then", "when"],
  },
  {
    name: "Common Words",
    words: ["about", "because", "before", "around", "house", "school", "people", "water", "found", "thought", "through", "where", "does", "another", "while"],
  },
];

export default function GuestOnboarding() {
  const [, setLocation] = useLocation();
  const { createGuestChild, addGuestWords, guestData } = useGuestModeContext();
  const [step, setStep] = useState<"name" | "words">("name");
  const [childName, setChildName] = useState("");
  const [selectedList, setSelectedList] = useState<number | null>(null);

  const [createdChildId, setCreatedChildId] = useState<string | null>(null);

  const handleNameSubmit = () => {
    if (!childName.trim()) return;
    const child = createGuestChild(childName.trim());
    setCreatedChildId(child.id);
    setStep("words");
  };

  const handleStartPractice = () => {
    if (selectedList === null || !createdChildId) return;
    addGuestWords(SAMPLE_WORD_LISTS[selectedList].words);
    setLocation(`/guest/child/${createdChildId}/flashcards`);
  };

  if (step === "name") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Osmosify</span>
            </div>
            <CardTitle>Welcome! Let's get started</CardTitle>
            <CardDescription>
              What's your child's name?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="childName">Child's name</Label>
              <Input
                id="childName"
                placeholder="e.g., Emma"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                data-testid="input-child-name"
              />
            </div>
            <Button 
              onClick={handleNameSubmit} 
              className="w-full" 
              disabled={!childName.trim()}
              data-testid="button-continue"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose a word list for {guestData.child?.name}
          </CardTitle>
          <CardDescription>
            Pick a set of words to practice. You can add your own books after signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SAMPLE_WORD_LISTS.map((list, index) => (
            <button
              key={index}
              onClick={() => setSelectedList(index)}
              className={`w-full p-4 rounded-md text-left transition-colors ${
                selectedList === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover-elevate"
              }`}
              data-testid={`button-word-list-${index}`}
            >
              <div className="font-medium">{list.name}</div>
              <div className={`text-sm ${selectedList === index ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {list.words.length} words
              </div>
            </button>
          ))}
          <Button 
            onClick={handleStartPractice} 
            className="w-full mt-4" 
            disabled={selectedList === null}
            data-testid="button-start-practice"
          >
            Start Practicing
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
