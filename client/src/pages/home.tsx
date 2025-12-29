import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { ChildCard } from "@/components/ChildCard";
import { AddChildDialog } from "@/components/AddChildDialog";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { UserPlus } from "lucide-react";
import type { Child } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: children, isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const { data: wordCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/children/word-counts"],
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: { name: string; gradeLevel?: string }) => {
      const response = await apiRequest("POST", "/api/children", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setAddDialogOpen(false);
      toast({
        title: "Child added",
        description: "You can now start tracking their reading progress.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add child",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Loading profiles..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Reading Tracker" />
      
      <main className="container mx-auto max-w-2xl p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold" data-testid="text-section-title">
              Children
            </h2>
            <p className="text-sm text-muted-foreground">
              Select a child to view their progress
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-child">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Child
          </Button>
        </div>

        {children && children.length > 0 ? (
          <div className="space-y-4" data-testid="children-list">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                wordCount={wordCounts?.[child.id] || 0}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            type="children"
            title="No children yet"
            description="Add a child to start tracking their reading progress and vocabulary."
          />
        )}
      </main>

      <AddChildDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={(data) => addChildMutation.mutate(data)}
        isAdding={addChildMutation.isPending}
      />
    </div>
  );
}
