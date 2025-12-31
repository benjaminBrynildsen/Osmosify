import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { GuestModeProvider, useGuestModeContext } from "@/hooks/use-guest-mode";
import { LoginPromptDialog } from "@/components/LoginPromptDialog";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import RoleSelection from "@/pages/role-selection";
import ChildDashboard from "@/pages/child-dashboard";
import UploadSession from "@/pages/upload-session";
import SessionDetails from "@/pages/session-details";
import Flashcards from "@/pages/flashcards";
import HistoryTest from "@/pages/history-test";
import WordLibrary from "@/pages/word-library";
import ChildSettings from "@/pages/child-settings";
import Presets from "@/pages/presets";
import Books from "@/pages/books";
import WordPop from "@/pages/word-pop";
import LavaLetters from "@/pages/lava-letters";
import PresetBooks from "@/pages/preset-books";
import MyLibrary from "@/pages/my-library";
import Moderation from "@/pages/moderation";
import GuestOnboarding from "@/pages/guest-onboarding";
import GuestFlashcards from "@/pages/guest-flashcards";
import GuestDashboard from "@/pages/guest-dashboard";
import GuestWordPop from "@/pages/guest-word-pop";
import Login from "@/pages/login";
import SplashScreen from "@/components/SplashScreen";
import { WelcomeCarousel } from "@/components/WelcomeCarousel";
import { Loader2 } from "lucide-react";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/child/:id" component={ChildDashboard} />
      <Route path="/child/:id/upload" component={UploadSession} />
      <Route path="/child/:id/flashcards" component={Flashcards} />
      <Route path="/child/:id/history-test" component={HistoryTest} />
      <Route path="/child/:id/library" component={WordLibrary} />
      <Route path="/child/:id/settings" component={ChildSettings} />
      <Route path="/child/:id/presets" component={Presets} />
      <Route path="/child/:id/books" component={Books} />
      <Route path="/child/:id/word-pop" component={WordPop} />
      <Route path="/child/:id/lava-letters" component={LavaLetters} />
      <Route path="/child/:id/preset-books" component={PresetBooks} />
      <Route path="/child/:id/my-library" component={MyLibrary} />
      <Route path="/session/:id" component={SessionDetails} />
      <Route path="/moderation" component={Moderation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GuestRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/guest/onboarding" component={GuestOnboarding} />
      <Route path="/guest/child/:id/flashcards" component={GuestFlashcards} />
      <Route path="/guest/child/:id/word-pop" component={GuestWordPop} />
      <Route path="/guest/child/:id" component={GuestDashboard} />
      <Route component={GuestOnboarding} />
    </Switch>
  );
}

function AuthWrapper() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeChecked, setWelcomeChecked] = useState(false);
  const [location, setLocation] = useLocation();

  // Always call hooks at the top level
  const guestModeContext = useGuestModeContext();
  const { isGuestMode, enterGuestMode, showLoginPrompt, setShowLoginPrompt } = guestModeContext;

  useEffect(() => {
    if (isAuthenticated) {
      const hasSeenWelcome = localStorage.getItem("osmosify_welcome_seen") === "true";
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    }
    setWelcomeChecked(true);
  }, [isAuthenticated]);

  const handleWelcomeComplete = () => {
    localStorage.setItem("osmosify_welcome_seen", "true");
    setShowWelcome(false);
    setLocation("/");
  };

  const handleTryFree = () => {
    enterGuestMode();
    setLocation("/guest/onboarding");
  };

  const handleLogin = () => {
    setShowLoginPrompt(false);
    setLocation("/login");
  };

  const handleContinueAsGuest = () => {
    setShowLoginPrompt(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isGuestMode && !isAuthenticated) {
    return (
      <>
        <GuestRouter />
        <LoginPromptDialog
          open={showLoginPrompt}
          onOpenChange={setShowLoginPrompt}
          onLogin={handleLogin}
          onContinueAsGuest={handleContinueAsGuest}
        />
      </>
    );
  }

  if (!isAuthenticated) {
    if (location === "/login") {
      return <Login />;
    }
    return <Landing onTryFree={handleTryFree} />;
  }

  if (!user?.role) {
    return <RoleSelection user={user!} />;
  }

  if (welcomeChecked && showWelcome) {
    return <WelcomeCarousel onComplete={handleWelcomeComplete} />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GuestModeProvider>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          {!showSplash && <AuthWrapper />}
          <Toaster />
        </GuestModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
