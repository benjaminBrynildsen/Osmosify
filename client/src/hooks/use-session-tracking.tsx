import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { ProductEventType } from "@shared/schema";

const SESSION_ID_KEY = "osmosify_session_id";

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
}

const SessionTrackingContext = createContext<SessionTrackingContextValue | null>(null);

export function SessionTrackingProvider({ children }: { children: ReactNode }) {
  const sessionIdRef = useRef<string>("");
  const initializedRef = useRef(false);

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
    
    try {
      await apiRequest("POST", "/api/sessions/lesson-completed", {
        sessionId: sessionIdRef.current,
      });
    } catch (error) {
      console.error("[Session] Failed to increment lessons:", error);
    }
  }, []);

  const value: SessionTrackingContextValue = {
    sessionId: sessionIdRef.current || getOrCreateSessionId(),
    trackEvent,
    incrementLessonsCompleted,
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
