import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGuestModeContext } from "@/hooks/use-guest-mode";
import type { User } from "@shared/schema";

interface RoleSelectionProps {
  user: User;
}

export default function RoleSelection({ user }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<"parent" | "teacher" | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();
  const { guestData, exitGuestMode, isGuestMode } = useGuestModeContext();

  const migrateGuestData = async () => {
    if (!guestData.child) return null;
    
    setIsMigrating(true);
    try {
      const childResponse = await apiRequest("POST", "/api/children", {
        name: guestData.child.name,
      });
      const newChild = await childResponse.json();
      
      if (guestData.words.length > 0) {
        const wordsToAdd = guestData.words.map(w => w.word);
        await apiRequest("POST", `/api/children/${newChild.id}/words/batch`, {
          words: wordsToAdd,
        });
      }
      
      exitGuestMode();
      return newChild;
    } catch (error) {
      console.error("Failed to migrate guest data:", error);
      return null;
    } finally {
      setIsMigrating(false);
    }
  };

  const updateRoleMutation = useMutation({
    mutationFn: async (role: "parent" | "teacher") => {
      const response = await apiRequest("PATCH", "/api/auth/user/role", { role });
      return response.json();
    },
    onSuccess: async () => {
      if (isGuestMode && guestData.child) {
        await migrateGuestData();
        toast({
          title: "Welcome!",
          description: `Your account is ready and ${guestData.child.name}'s progress has been saved.`,
        });
      } else {
        toast({
          title: "Welcome!",
          description: "Your account is all set up.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your selection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelect = (role: "parent" | "teacher") => {
    setSelectedRole(role);
    updateRoleMutation.mutate(role);
  };

  const isPending = updateRoleMutation.isPending || isMigrating;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome{user.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          Tell us about yourself to personalize your experience
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl w-full">
        <Card 
          className={`cursor-pointer transition-all hover-elevate ${
            selectedRole === "parent" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => !isPending && handleSelect("parent")}
          data-testid="card-role-parent"
        >
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>I'm a Parent</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Track your children's reading progress and help them build vocabulary at home
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover-elevate ${
            selectedRole === "teacher" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => !isPending && handleSelect("teacher")}
          data-testid="card-role-teacher"
        >
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>I'm a Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Manage student reading progress and vocabulary development in your classroom
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {isPending && (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{isMigrating ? "Saving your progress..." : "Setting up your account..."}</span>
        </div>
      )}
    </div>
  );
}
