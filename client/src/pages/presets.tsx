import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  BookOpen,
  Plus,
  Loader2,
  Sparkles,
  Gamepad2,
} from "lucide-react";
import type { Child, PresetWordList } from "@shared/schema";

export default function Presets() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();

  const { data: child, isLoading: childLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: presets, isLoading: presetsLoading } = useQuery<PresetWordList[]>({
    queryKey: ["/api/presets"],
  });

  const addPresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      return apiRequest("POST", `/api/children/${childId}/add-preset`, { presetId });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
      toast({
        title: "Words Added",
        description: `Added ${data.added} new words from "${data.presetName}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add preset words",
        variant: "destructive",
      });
    },
  });

  if (childLoading || presetsLoading) {
    return <LoadingScreen message="Loading word lists..." />;
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Not Found" showBack backPath="/" />
        <div className="p-4 text-center text-muted-foreground">
          Child not found
        </div>
      </div>
    );
  }

  const groupedPresets: Record<string, PresetWordList[]> = {};
  presets?.forEach(preset => {
    if (!groupedPresets[preset.category]) {
      groupedPresets[preset.category] = [];
    }
    groupedPresets[preset.category].push(preset);
  });

  const categoryOrder = ["alphabet", "phonics", "cvc", "sight_words"];
  const categoryLabels: Record<string, string> = {
    alphabet: "Alphabet",
    phonics: "Phonics Sounds",
    cvc: "CVC Words",
    sight_words: "Sight Words",
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader
        title="Word Lists"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        <p className="text-muted-foreground">
          Add word lists to {child.name}'s vocabulary, or jump right in to prepare words and play Word Pop.
        </p>

        {categoryOrder.map(category => {
          const categoryPresets = groupedPresets[category];
          if (!categoryPresets?.length) return null;

          return (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {categoryLabels[category] || category}
              </h2>
              <div className="space-y-3">
                {categoryPresets.map(preset => (
                  <Card key={preset.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{preset.name}</CardTitle>
                          {preset.description && (
                            <CardDescription className="mt-1">
                              {preset.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {preset.words.length} words
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {preset.words.slice(0, 12).map((word, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-muted text-sm"
                          >
                            {word}
                          </span>
                        ))}
                        {preset.words.length > 12 && (
                          <span className="px-2 py-0.5 text-sm text-muted-foreground">
                            +{preset.words.length - 12} more
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => addPresetMutation.mutate(preset.id)}
                          disabled={addPresetMutation.isPending}
                          data-testid={`button-add-preset-${preset.id}`}
                        >
                          {addPresetMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add to Library
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setLocation(`/child/${childId}/flashcards?presetId=${preset.id}`)}
                          data-testid={`button-unlock-preset-${preset.id}`}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Unlock Words
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/child/${childId}/word-pop?presetId=${preset.id}`)}
                          data-testid={`button-wordpop-preset-${preset.id}`}
                        >
                          <Gamepad2 className="h-4 w-4 mr-2" />
                          Word Pop
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
