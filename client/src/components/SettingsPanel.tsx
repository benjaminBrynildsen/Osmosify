import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Volume2, Palette } from "lucide-react";
import type { Child, ThemeOption } from "@shared/schema";
import { GRADE_LEVELS } from "@/lib/gradeLevels";
import { speakWord, type VoiceOption } from "@/lib/speech";
import { THEME_OPTIONS, getTheme } from "@/lib/themes";

const VOICE_OPTIONS: { value: VoiceOption; label: string; description: string }[] = [
  { value: "nova", label: "Voice 1", description: "Warm and friendly" },
  { value: "alloy", label: "Voice 2", description: "Clear and neutral" },
  { value: "shimmer", label: "Voice 3", description: "Soft and gentle" },
];

const TIMER_OPTIONS = [
  { value: 3, label: "3 seconds" },
  { value: 5, label: "5 seconds" },
  { value: 7, label: "7 seconds" },
  { value: 10, label: "10 seconds" },
];

const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gradeLevel: z.string().optional(),
  stopWordsEnabled: z.boolean(),
  gradeLevelFilterEnabled: z.boolean(),
  masteryThreshold: z.number().min(3).max(10),
  deckSize: z.number().min(3).max(10),
  timerSeconds: z.number().min(3).max(10),
  demoteOnMiss: z.boolean(),
  voicePreference: z.enum(["nova", "alloy", "shimmer"]),
  gifCelebrationsEnabled: z.boolean(),
  theme: z.enum(["default", "space", "jungle", "ocean", "candy"]),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsPanelProps {
  child: Child;
  onSave: (data: SettingsFormData) => void;
  isSaving?: boolean;
}

export function SettingsPanel({ child, onSave, isSaving = false }: SettingsPanelProps) {
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: child.name,
      gradeLevel: child.gradeLevel || "",
      stopWordsEnabled: child.stopWordsEnabled,
      gradeLevelFilterEnabled: child.gradeLevelFilterEnabled,
      masteryThreshold: child.masteryThreshold,
      deckSize: child.deckSize,
      timerSeconds: child.timerSeconds || 7,
      demoteOnMiss: child.demoteOnMiss,
      voicePreference: (child.voicePreference as VoiceOption) || "shimmer",
      gifCelebrationsEnabled: child.gifCelebrationsEnabled ?? true,
      theme: (child.theme as ThemeOption) || "default",
    },
  });

  const handlePreviewVoice = (voice: VoiceOption) => {
    speakWord("Hello! This is how I sound.", voice);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6" data-testid="form-settings">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Child's name" data-testid="input-child-name" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level (optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-grade-level">
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GRADE_LEVELS.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Word Filtering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="stopWordsEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Filter Stop Words</FormLabel>
                    <FormDescription>
                      Exclude common words like "the", "and", "is"
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-stop-words"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gradeLevelFilterEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Grade-Level Filter</FormLabel>
                    <FormDescription>
                      Only include age-appropriate words
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-grade-filter"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flashcard Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="masteryThreshold"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Mastery Threshold</FormLabel>
                    <span className="text-sm font-medium text-primary">{field.value}</span>
                  </div>
                  <FormDescription className="mb-3">
                    Correct answers needed to master a word
                  </FormDescription>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      min={3}
                      max={10}
                      step={1}
                      data-testid="slider-mastery-threshold"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deckSize"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Deck Size</FormLabel>
                    <span className="text-sm font-medium text-primary">{field.value}</span>
                  </div>
                  <FormDescription className="mb-3">
                    Number of words per flashcard session
                  </FormDescription>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      min={3}
                      max={10}
                      step={1}
                      data-testid="slider-deck-size"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timerSeconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timer Duration</FormLabel>
                  <FormDescription className="mb-3">
                    Time given to answer each flashcard
                  </FormDescription>
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-timer-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="demoteOnMiss"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Demote on Miss</FormLabel>
                    <FormDescription>
                      Move mastered words back to learning if missed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-demote-on-miss"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="voicePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voice for Reading Words</FormLabel>
                  <FormDescription className="mb-3">
                    Choose the voice used during flashcard sessions
                  </FormDescription>
                  <div className="space-y-2">
                    {VOICE_OPTIONS.map((voice) => (
                      <div
                        key={voice.value}
                        className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                          field.value === voice.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover-elevate"
                        }`}
                        onClick={() => field.onChange(voice.value)}
                        data-testid={`voice-option-${voice.value}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{voice.label}</div>
                          <div className="text-sm text-muted-foreground">{voice.description}</div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVoice(voice.value);
                          }}
                          data-testid={`button-preview-voice-${voice.value}`}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Celebrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="gifCelebrationsEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>GIF Celebrations</FormLabel>
                    <FormDescription>
                      Show animated GIFs when completing lessons
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-gif-celebrations"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Game Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormDescription className="mb-3">
                    Choose a visual theme for games like Lava Letters
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {THEME_OPTIONS.map((themeOpt) => {
                      const themeData = getTheme(themeOpt.value);
                      return (
                        <div
                          key={themeOpt.value}
                          className={`relative p-3 rounded-md border cursor-pointer transition-all ${
                            field.value === themeOpt.value
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover-elevate"
                          }`}
                          onClick={() => field.onChange(themeOpt.value)}
                          data-testid={`theme-option-${themeOpt.value}`}
                        >
                          <div 
                            className={`w-full h-12 rounded-md mb-2 ${themeData.background}`}
                          />
                          <div className="font-medium text-sm">{themeData.name}</div>
                          <div className="text-xs text-muted-foreground">{themeOpt.description}</div>
                        </div>
                      );
                    })}
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-12"
          disabled={isSaving}
          data-testid="button-save-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  );
}
