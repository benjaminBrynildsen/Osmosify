import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogIn, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
  onContinueAsGuest: () => void;
}

export function LoginPromptDialog({
  open,
  onOpenChange,
  onLogin,
  onContinueAsGuest,
}: LoginPromptDialogProps) {
  useEffect(() => {
    if (open) {
      trackEvent("signup_viewed", { source: "login_prompt_dialog" });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Great job!
          </DialogTitle>
          <DialogDescription>
            You completed your first practice session! Sign in to save your progress and unlock all features.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Save your child's word library across devices</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Track reading progress over time</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Upload book pages and build vocabulary</span>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onLogin} className="w-full" data-testid="button-login-prompt">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
          <Button variant="ghost" onClick={onContinueAsGuest} className="w-full" data-testid="button-continue-guest">
            Continue exploring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
