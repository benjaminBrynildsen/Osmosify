import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from "react";
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
  const sessionIdRef = useRef<string>("");
  const initializedRef = useRef(false);
  const [lessonsCompleted, setLessonsCompleted] = useState(getLocalLessonsCompleted);
  const [accountPromptDismissed, setAccountPromptDismissed] = useState(isAccountPromptDismissed);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    sessionIdRef.current = getOrCreateSessionId();
    
    const initSession = async () => {
      try {
        await apiRequest("POST", "/api/sessions/init", {
          sessionId: sessionIdRef.current,
          userAgent: navigator.userAgent,
        });
        
        await apiRequest("POST", "/api/events", {
          sessionId: sessionIdRef.current,
          eventType: "app_opened" as ProductEventType,
        });
      } catch (error) {
        console.error("[Session] Failed to initialize session:", error);
      }
    };

    initSession();
  }, []);

  const trackEvent = useCallback(async (eventType: ProductEventType, eventData?: Record<string, unknown>) => {
    if (!sessionIdRef.current) return;
    
    try {
      await apiRequest("POST", "/api/events", {
        sessionId: sessionIdRef.current,
        eventType,
        eventData,
      });
    } catch (error) {
      console.error("[Session] Failed to track event:", error);
    }
  }, []);

  const incrementLessonsCompleted = useCallback(async () => {
    if (!sessionIdRef.current) return;
    
    // Update local state and storage
    const newCount = lessonsCompleted + 1;
    setLessonsCompleted(newCount);
    setLocalLessonsCompleted(newCount);
    
    try {
      await apiRequest("POST", "/api/sessions/lesson-completed", {
        sessionId: sessionIdRef.current,
      });
    } catch (error) {
      console.error("[Session] Failed to increment lessons:", error);
    }
  }, [lessonsCompleted]);

  const dismissAccountPrompt = useCallback(() => {
    setAccountPromptDismissed(true);
    dismissAccountPromptInStorage();
  }, []);

  const linkSessionToUser = useCallback(async () => {
    if (!sessionIdRef.current) return;
    
    try {
      await apiRequest("POST", "/api/sessions/link", {
        sessionId: sessionIdRef.current,
      });
      // Also track signup completed event
      await apiRequest("POST", "/api/events", {
        sessionId: sessionIdRef.current,
        eventType: "signup_completed" as ProductEventType,
      });
    } catch (error) {
      console.error("[Session] Failed to link session:", error);
    }
  }, []);

  // Show account prompt after first lesson if not dismissed
  const shouldShowAccountPrompt = lessonsCompleted >= 1 && !accountPromptDismissed;

  const value: SessionTrackingContextValue = {
    sessionId: sessionIdRef.current || getOrCreateSessionId(),
    trackEvent,
    incrementLessonsCompleted,
    linkSessionToUser,
    lessonsCompleted,
    shouldShowAccountPrompt,
    dismissAccountPrompt,
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
