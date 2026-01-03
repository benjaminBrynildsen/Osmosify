import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSessionTracking } from "@/hooks/use-session-tracking";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Star, BookOpen } from "lucide-react";

export function AccountGatingDialog() {
  const { shouldShowAccountPrompt, dismissAccountPrompt, temporarilyHideAccountPrompt, trackEvent } = useSessionTracking();
  const { isAuthenticated, isLoading } = useAuth();

  // Don't show if already authenticated or still loading
  if (isLoading || isAuthenticated) {
    return null;
  }

  const handleCreateAccount = () => {
    trackEvent("signup_started", { source: "account_gating_dialog" });
    window.location.href = "/api/login";
  };

  const handleMaybeLater = () => {
    trackEvent("signup_dismissed", { source: "account_gating_dialog", method: "button" });
    dismissAccountPrompt(); // Permanently dismiss on explicit button click
  };

  // Handle dialog close via escape/backdrop - temporary dismiss only
  // The dialog will reappear on page refresh (not persisted to storage)
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Temporarily hide for this page session - will reappear on refresh
      temporarilyHideAccountPrompt();
    }
  };

  return (
    <Dialog open={shouldShowAccountPrompt} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-account-gating">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Great Job Learning!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            You completed your first lesson! Create a free account to save your progress.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm">
            <Star className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <span>Save your learning progress forever</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <BookOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <span>Track multiple children's reading journeys</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0" />
            <span>Unlock personalized word recommendations</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleCreateAccount} 
            className="w-full"
            data-testid="button-create-account"
          >
            Create Free Account
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleMaybeLater}
            className="w-full"
            data-testid="button-maybe-later"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
