import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RotateCcw, Play, Clock, Shuffle, TrendingUp } from "lucide-react";

interface HistoryTestSetupProps {
  masteredCount: number;
  learningCount: number;
  onStartTest: (config: { size: number; mode: "oldest" | "random" | "frequent"; includeSource: "mastered" | "learning" | "both" }) => void;
}

export function HistoryTestSetup({ masteredCount, learningCount, onStartTest }: HistoryTestSetupProps) {
  const [testSize, setTestSize] = useState("10");
  const [testMode, setTestMode] = useState<"oldest" | "random" | "frequent">("oldest");
  const [includeSource, setIncludeSource] = useState<"mastered" | "learning" | "both">("mastered");

  const totalAvailable = 
    includeSource === "mastered" ? masteredCount :
    includeSource === "learning" ? learningCount :
    masteredCount + learningCount;

  const effectiveSize = Math.min(parseInt(testSize), totalAvailable);

  return (
    <div className="space-y-6 p-4" data-testid="history-test-setup">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <RotateCcw className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">History Test</h2>
        <p className="text-muted-foreground">
          Review previously learned words to keep them fresh
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Size</CardTitle>
          <CardDescription>How many words do you want to review?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={testSize} onValueChange={setTestSize}>
            <SelectTrigger data-testid="select-test-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 words</SelectItem>
              <SelectItem value="20">20 words</SelectItem>
              <SelectItem value="30">30 words</SelectItem>
              <SelectItem value="50">50 words</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Word Selection</CardTitle>
          <CardDescription>Which words should be included?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={includeSource} onValueChange={(v) => setIncludeSource(v as typeof includeSource)}>
            <div className="flex items-center space-x-3 py-2">
              <RadioGroupItem value="mastered" id="mastered" data-testid="radio-mastered" />
              <Label htmlFor="mastered" className="flex-1 cursor-pointer">
                <span className="font-medium">Mastered words only</span>
                <span className="text-sm text-muted-foreground ml-2">({masteredCount} available)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 py-2">
              <RadioGroupItem value="learning" id="learning" data-testid="radio-learning" />
              <Label htmlFor="learning" className="flex-1 cursor-pointer">
                <span className="font-medium">Learning words only</span>
                <span className="text-sm text-muted-foreground ml-2">({learningCount} available)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 py-2">
              <RadioGroupItem value="both" id="both" data-testid="radio-both" />
              <Label htmlFor="both" className="flex-1 cursor-pointer">
                <span className="font-medium">Both mastered and learning</span>
                <span className="text-sm text-muted-foreground ml-2">({masteredCount + learningCount} available)</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selection Mode</CardTitle>
          <CardDescription>How should words be picked?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={testMode} onValueChange={(v) => setTestMode(v as typeof testMode)}>
            <div className="flex items-start space-x-3 py-2">
              <RadioGroupItem value="oldest" id="oldest" className="mt-1" data-testid="radio-oldest" />
              <Label htmlFor="oldest" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Oldest tested first</span>
                </div>
                <p className="text-sm text-muted-foreground">Words not tested in the longest time</p>
              </Label>
            </div>
            <div className="flex items-start space-x-3 py-2">
              <RadioGroupItem value="random" id="random" className="mt-1" data-testid="radio-random" />
              <Label htmlFor="random" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Random sample</span>
                </div>
                <p className="text-sm text-muted-foreground">Randomly selected words</p>
              </Label>
            </div>
            <div className="flex items-start space-x-3 py-2">
              <RadioGroupItem value="frequent" id="frequent" className="mt-1" data-testid="radio-frequent" />
              <Label htmlFor="frequent" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Most frequent</span>
                </div>
                <p className="text-sm text-muted-foreground">Words seen most often in reading</p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Button
        className="w-full h-14 text-lg"
        disabled={totalAvailable === 0}
        onClick={() => onStartTest({ size: effectiveSize, mode: testMode, includeSource })}
        data-testid="button-start-history-test"
      >
        <Play className="h-5 w-5 mr-2" />
        {totalAvailable === 0
          ? "No words available"
          : `Start Test (${effectiveSize} words)`}
      </Button>
    </div>
  );
}
