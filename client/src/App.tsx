import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ChildDashboard from "@/pages/child-dashboard";
import UploadSession from "@/pages/upload-session";
import SessionDetails from "@/pages/session-details";
import Flashcards from "@/pages/flashcards";
import HistoryTest from "@/pages/history-test";
import WordLibrary from "@/pages/word-library";
import ChildSettings from "@/pages/child-settings";
import Presets from "@/pages/presets";
import Books from "@/pages/books";
import PresetBooks from "@/pages/preset-books";
import WordPop from "@/pages/word-pop";
import SplashScreen from "@/components/SplashScreen";
import { WelcomeCarousel } from "@/components/WelcomeCarousel";

function Router() {
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
      <Route path="/child/:id/preset-books" component={PresetBooks} />
      <Route path="/child/:id/word-pop" component={WordPop} />
      <Route path="/session/:id" component={SessionDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeChecked, setWelcomeChecked] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("osmosify_welcome_seen") === "true";
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
    setWelcomeChecked(true);
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleWelcomeComplete = () => {
    localStorage.setItem("osmosify_welcome_seen", "true");
    setShowWelcome(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        {!showSplash && welcomeChecked && showWelcome && (
          <WelcomeCarousel onComplete={handleWelcomeComplete} />
        )}
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
