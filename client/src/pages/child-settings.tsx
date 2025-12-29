import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Child } from "@shared/schema";

export default function ChildSettings() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();

  const { data: child, isLoading } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const updateChildMutation = useMutation({
    mutationFn: async (data: Partial<Child>) => {
      const response = await apiRequest("PATCH", `/api/children/${childId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId] });
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Not Found" showBack backPath="/" />
        <div className="p-4">
          <EmptyState
            type="children"
            title="Child not found"
            description="This profile doesn't exist or has been deleted."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title="Settings"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="container mx-auto max-w-2xl p-4">
        <SettingsPanel
          child={child}
          onSave={(data) => updateChildMutation.mutate(data)}
          isSaving={updateChildMutation.isPending}
        />
      </main>
    </div>
  );
}
