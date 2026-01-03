import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from "react";
// Note: useRef is still used for initializedRef
import { apiRequest } from "@/lib/queryClient";
import type { ProductEventType } from "@shared/schema";

const SESSION_ID_KEY = "osmosify_session_id";
const LESSONS_COMPLETED_KEY = "osmosify_lessons_completed";
const ACCOUNT_PROMPT_DISMISSED_KEY = "osmosify_account_prompt_dismissed";

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

interface SessionTrackingContextValue {
  sessionId: string;
  trackEvent: (eventType: ProductEventType, eventData?: Record<string, unknown>) => Promise<void>;
  incrementLessonsCompleted: () => Promise<void>;
  linkSessionToUser: () => Promise<void>;
  lessonsCompleted: number;
  shouldShowAccountPrompt: boolean;
  dismissAccountPrompt: () => void;
  temporarilyHideAccountPrompt: () => void; // Hide for this session only, will reappear on page refresh
}

const SessionTrackingContext = createContext<SessionTrackingContextValue | null>(null);

function getLocalLessonsCompleted(): number {
  const stored = localStorage.getItem(LESSONS_COMPLETED_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function setLocalLessonsCompleted(count: number): void {
  localStorage.setItem(LESSONS_COMPLETED_KEY, count.toString());
}

function isAccountPromptDismissed(): boolean {
  return localStorage.getItem(ACCOUNT_PROMPT_DISMISSED_KEY) === "true";
}

function dismissAccountPromptInStorage(): void {
  localStorage.setItem(ACCOUNT_PROMPT_DISMISSED_KEY, "true");
}

export function SessionTrackingProvider({ children }: { children: ReactNode }) {
  // Store sessionId in state so it's available immediately on first render
  const [sessionId] = useState(() => getOrCreateSessionId());
  const initializedRef = useRef(false);
  const [lessonsCompleted, setLessonsCompleted] = useState(getLocalLessonsCompleted);
  const [accountPromptDismissed, setAccountPromptDismissed] = useState(isAccountPromptDismissed);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const initSession = async () => {
      try {
        await apiRequest("POST", "/api/sessions/init", {
          sessionId,
          userAgent: navigator.userAgent,
        });
        
        await apiRequest("POST", "/api/events", {
          sessionId,
          eventType: "app_opened" as ProductEventType,
        });
      } catch (error) {
        console.error("[Session] Failed to initialize session:", error);
      }
    };

    initSession();
  }, [sessionId]);

  const trackEvent = useCallback(async (eventType: ProductEventType, eventData?: Record<string, unknown>) => {
    if (!sessionId) return;
    
    try {
      await apiRequest("POST", "/api/events", {
        sessionId,
        eventType,
        eventData,
      });
    } catch (error) {
      console.error("[Session] Failed to track event:", error);
    }
  }, [sessionId]);

  const incrementLessonsCompleted = useCallback(async () => {
    if (!sessionId) return;
    
    // Update local state and storage
    const newCount = lessonsCompleted + 1;
    setLessonsCompleted(newCount);
    setLocalLessonsCompleted(newCount);
    
    try {
      await apiRequest("POST", "/api/sessions/lesson-completed", {
        sessionId,
      });
    } catch (error) {
      console.error("[Session] Failed to increment lessons:", error);
    }
  }, [sessionId, lessonsCompleted]);

  const dismissAccountPrompt = useCallback(() => {
    setAccountPromptDismissed(true);
    dismissAccountPromptInStorage();
  }, []);

  // Temporarily hide the prompt for this page session only (won't persist on refresh)
  const temporarilyHideAccountPrompt = useCallback(() => {
    setAccountPromptDismissed(true);
    // Don't persist to storage - dialog will reappear on page refresh
  }, []);

  // Note: linkSessionToUser only links the session, does NOT track signup_completed
  // Signup completion is tracked separately when user actually signs up
  const linkSessionToUser = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await apiRequest("POST", "/api/sessions/link", {
        sessionId,
      });
    } catch (error) {
      console.error("[Session] Failed to link session:", error);
    }
  }, [sessionId]);

  // Show account prompt after first lesson if not dismissed
  const shouldShowAccountPrompt = lessonsCompleted >= 1 && !accountPromptDismissed;

  const value: SessionTrackingContextValue = {
    sessionId,
    trackEvent,
    incrementLessonsCompleted,
    linkSessionToUser,
    lessonsCompleted,
    shouldShowAccountPrompt,
    dismissAccountPrompt,
    temporarilyHideAccountPrompt,
  };

  return (
    <SessionTrackingContext.Provider value={value}>
      {children}
    </SessionTrackingContext.Provider>
  );
}

export function useSessionTracking() {
  const context = useContext(SessionTrackingContext);
  if (!context) {
    throw new Error("useSessionTracking must be used within SessionTrackingProvider");
  }
  return context;
}

export function getSessionId(): string {
  return getOrCreateSessionId();
}
