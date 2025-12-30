import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

interface GuestChild {
  id: string;
  name: string;
  createdAt: string;
}

interface GuestWord {
  id: string;
  word: string;
  status: "new" | "learning" | "mastered";
  correctCount: number;
}

interface GuestSession {
  id: string;
  childId: string;
  bookTitle: string;
  words: string[];
  createdAt: string;
}

interface GuestData {
  child: GuestChild | null;
  words: GuestWord[];
  sessions: GuestSession[];
  flashcardSessionCompleted: boolean;
}

const GUEST_DATA_KEY = "osmosify_guest_data";
const GUEST_MODE_KEY = "osmosify_guest_mode";

const defaultGuestData: GuestData = {
  child: null,
  words: [],
  sessions: [],
  flashcardSessionCompleted: false,
};

function loadGuestData(): GuestData {
  try {
    const stored = localStorage.getItem(GUEST_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load guest data:", e);
  }
  return defaultGuestData;
}

function saveGuestData(data: GuestData): void {
  try {
    localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save guest data:", e);
  }
}

export function useGuestMode() {
  const [isGuestMode, setIsGuestMode] = useState(() => {
    return localStorage.getItem(GUEST_MODE_KEY) === "true";
  });
  const [guestData, setGuestData] = useState<GuestData>(loadGuestData);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem(GUEST_MODE_KEY, isGuestMode ? "true" : "false");
  }, [isGuestMode]);

  useEffect(() => {
    saveGuestData(guestData);
  }, [guestData]);

  const enterGuestMode = useCallback(() => {
    setIsGuestMode(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuestMode(false);
    localStorage.removeItem(GUEST_DATA_KEY);
    localStorage.removeItem(GUEST_MODE_KEY);
    setGuestData(defaultGuestData);
  }, []);

  const createGuestChild = useCallback((name: string) => {
    const child: GuestChild = {
      id: `guest-child-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setGuestData(prev => ({ ...prev, child }));
    return child;
  }, []);

  const addGuestWords = useCallback((words: string[]) => {
    const newWords: GuestWord[] = words.map((word, i) => ({
      id: `guest-word-${Date.now()}-${i}`,
      word: word.toLowerCase(),
      status: "new" as const,
      correctCount: 0,
    }));
    setGuestData(prev => {
      const existingWordTexts = new Set(prev.words.map(w => w.word));
      const uniqueNewWords = newWords.filter(w => !existingWordTexts.has(w.word));
      return { ...prev, words: [...prev.words, ...uniqueNewWords] };
    });
    return newWords;
  }, []);

  const addGuestSession = useCallback((bookTitle: string, words: string[]) => {
    const session: GuestSession = {
      id: `guest-session-${Date.now()}`,
      childId: guestData.child?.id || "",
      bookTitle,
      words,
      createdAt: new Date().toISOString(),
    };
    setGuestData(prev => ({ ...prev, sessions: [...prev.sessions, session] }));
    return session;
  }, [guestData.child]);

  const markFlashcardSessionCompleted = useCallback(() => {
    setGuestData(prev => ({ ...prev, flashcardSessionCompleted: true }));
    setShowLoginPrompt(true);
  }, []);

  const updateGuestWordStatus = useCallback((wordId: string, correctCount: number, status: "new" | "learning" | "mastered") => {
    setGuestData(prev => ({
      ...prev,
      words: prev.words.map(w => 
        w.id === wordId ? { ...w, correctCount, status } : w
      ),
    }));
  }, []);

  const getGuestDataForMigration = useCallback(() => {
    return guestData;
  }, [guestData]);

  return {
    isGuestMode,
    guestData,
    showLoginPrompt,
    setShowLoginPrompt,
    enterGuestMode,
    exitGuestMode,
    createGuestChild,
    addGuestWords,
    addGuestSession,
    markFlashcardSessionCompleted,
    updateGuestWordStatus,
    getGuestDataForMigration,
  };
}

type GuestModeContextValue = ReturnType<typeof useGuestMode>;

const GuestModeContext = createContext<GuestModeContextValue | null>(null);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const guestMode = useGuestMode();
  
  return (
    <GuestModeContext.Provider value={guestMode}>
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestModeContext() {
  const context = useContext(GuestModeContext);
  if (!context) {
    throw new Error("useGuestModeContext must be used within GuestModeProvider");
  }
  return context;
}
