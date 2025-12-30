import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Loader2, BookPlus } from "lucide-react";

const contributionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().optional(),
  isbn: z.string().optional(),
  gradeLevel: z.string().optional(),
  description: z.string().optional(),
  words: z.string().min(1, "Enter at least one word"),
  contributorLabel: z.string().optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface ContributeBookFormProps {
  onSuccess?: () => void;
}

export function ContributeBookForm({ onSuccess }: ContributeBookFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      gradeLevel: "",
      description: "",
      words: "",
      contributorLabel: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ContributionFormData) => {
      const wordsArray = data.words
        .split(/[,\n]/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0);
      
      return apiRequest("POST", "/api/book-contributions", {
        title: data.title,
        author: data.author || null,
        isbn: data.isbn || null,
        gradeLevel: data.gradeLevel || null,
        description: data.description || null,
        words: wordsArray,
        contributorLabel: data.contributorLabel || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-contributions"] });
      toast({
        title: "Book Submitted",
        description: "Your book has been submitted for review. Thank you for contributing!",
      });
      form.reset();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit book contribution",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContributionFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-contribute-book">
          <BookPlus className="h-4 w-4" />
          Contribute a Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookPlus className="h-5 w-5" />
            Contribute a Book
          </DialogTitle>
          <DialogDescription>
            Share a book and its word list with the community. Your submission will be reviewed before being added.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., The Cat in the Hat"
                      {...field}
                      data-testid="input-book-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Dr. Seuss"
                      {...field}
                      data-testid="input-book-author"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 978-0394800011"
                      {...field}
                      data-testid="input-book-isbn"
                    />
                  </FormControl>
                  <FormDescription>
                    Helps find book cover automatically
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-grade-level">
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Preschool">Preschool</SelectItem>
                      <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                      <SelectItem value="1st Grade">1st Grade</SelectItem>
                      <SelectItem value="2nd Grade">2nd Grade</SelectItem>
                      <SelectItem value="3rd Grade">3rd Grade</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="words"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Word List *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter words separated by commas or new lines:&#10;cat, hat, sat, mat&#10;or&#10;cat&#10;hat&#10;sat"
                      className="min-h-32"
                      {...field}
                      data-testid="textarea-words"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the vocabulary words from this book
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the book..."
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contributorLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., A Helpful Parent"
                      {...field}
                      data-testid="input-contributor-label"
                    />
                  </FormControl>
                  <FormDescription>
                    Displayed as credit if your contribution is approved
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                data-testid="button-cancel-contribution"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex-1 gap-2"
                data-testid="button-submit-contribution"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
