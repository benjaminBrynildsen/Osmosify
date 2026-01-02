import type { AnalyticsEventType } from "@shared/schema";

const SESSION_ID_KEY = "anonymous_session_id";

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

let sessionInitialized = false;

export async function initSession(): Promise<void> {
  if (sessionInitialized) return;
  
  const sessionId = getSessionId();
  try {
    await fetch("/api/analytics/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    sessionInitialized = true;
  } catch (error) {
    console.error("Failed to initialize session:", error);
  }
}

export async function trackEvent(
  eventType: AnalyticsEventType,
  eventData?: Record<string, unknown>
): Promise<void> {
  const sessionId = getSessionId();
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, eventType, eventData }),
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

export async function linkSessionToUser(): Promise<void> {
  const sessionId = getSessionId();
  try {
    await fetch("/api/analytics/session/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId }),
    });
  } catch (error) {
    console.error("Failed to link session:", error);
  }
}

export interface GuestProgress {
  childName?: string;
  gradeLevel?: string;
  masteredWords: string[];
  learningWords: string[];
  lessonsCompleted: number;
  gamesPlayed: number;
}

export async function getGuestProgress(): Promise<GuestProgress | null> {
  const sessionId = getSessionId();
  try {
    const response = await fetch(`/api/analytics/guest-progress/${sessionId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to get guest progress:", error);
    return null;
  }
}

export async function updateGuestProgress(
  data: Partial<GuestProgress>
): Promise<GuestProgress | null> {
  const sessionId = getSessionId();
  try {
    const response = await fetch(`/api/analytics/guest-progress/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to update guest progress:", error);
    return null;
  }
}

export async function migrateProgressToChild(childId: string): Promise<boolean> {
  const sessionId = getSessionId();
  try {
    const response = await fetch("/api/analytics/migrate-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId, childId }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to migrate progress:", error);
    return false;
  }
}
