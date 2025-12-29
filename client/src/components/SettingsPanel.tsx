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
import { Save } from "lucide-react";
import type { Child } from "@shared/schema";
import { GRADE_LEVELS } from "@/lib/gradeLevels";

const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gradeLevel: z.string().optional(),
  stopWordsEnabled: z.boolean(),
  gradeLevelFilterEnabled: z.boolean(),
  masteryThreshold: z.number().min(1).max(20),
  deckSize: z.number().min(5).max(50),
  demoteOnMiss: z.boolean(),
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
      demoteOnMiss: child.demoteOnMiss,
    },
  });

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
                      min={1}
                      max={20}
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
                      min={5}
                      max={50}
                      step={5}
                      data-testid="slider-deck-size"
                    />
                  </FormControl>
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
