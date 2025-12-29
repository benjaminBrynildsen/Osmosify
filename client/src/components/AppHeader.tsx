import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useLocation } from "wouter";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
}

export function AppHeader({ title, showBack = false, backPath = "/", rightAction }: AppHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between gap-2 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation(backPath)}
            data-testid="button-back"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold truncate" data-testid="text-header-title">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        {rightAction}
        <ThemeToggle />
      </div>
    </header>
  );
}
