import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, ArrowRight } from "lucide-react";
import { useGuestModeContext } from "@/hooks/use-guest-mode";

const SAMPLE_WORDS = [
  "the", "and", "a", "to", "said", "in", "he", "she", "it", "was",
  "you", "for", "on", "are", "they", "with", "his", "her", "all", "have"
];

export default function GuestOnboarding() {
  const [, setLocation] = useLocation();
  const { createGuestChild, addGuestWords } = useGuestModeContext();
  const [childName, setChildName] = useState("");

  const handleStart = () => {
    if (!childName.trim()) return;
    const child = createGuestChild(childName.trim());
    addGuestWords(SAMPLE_WORDS);
    setLocation(`/guest/child/${child.id}`);
  };

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
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              data-testid="input-child-name"
            />
          </div>
          <Button 
            onClick={handleStart} 
            className="w-full" 
            disabled={!childName.trim()}
            data-testid="button-continue"
          >
            Start Exploring
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
