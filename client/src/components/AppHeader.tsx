import { ArrowLeft, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
}

export function AppHeader({ title, showBack = false, backPath = "/", rightAction }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

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
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-user-menu">
                <Avatar className="h-7 w-7">
                  {user.profileImageUrl && (
                    <AvatarImage src={user.profileImageUrl} alt={user.firstName || "User"} />
                  )}
                  <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{user.firstName} {user.lastName}</p>
                <p className="text-muted-foreground text-xs">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
