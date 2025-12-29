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
      <Route path="/session/:id" component={SessionDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
