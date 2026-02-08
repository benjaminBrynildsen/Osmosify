export type WordStatus = 'new' | 'learning' | 'mastered';
export type VoiceOption = 'alloy' | 'nova' | 'shimmer';
export type ThemeOption = 'default' | 'space' | 'jungle' | 'ocean' | 'candy';
export type BookSourceType = 'curated' | 'teacher' | 'parent' | 'public_domain' | 'community';

export interface Child {
  id: string;
  name: string;
  gradeLevel?: string;
  stopWordsEnabled: boolean;
  gradeLevelFilterEnabled: boolean;
  masteryThreshold: number;
  deckSize: number;
  timerSeconds: number;
  demoteOnMiss: boolean;
  voicePreference: VoiceOption;
  sentencesRead: number;
  gifCelebrationsEnabled: boolean;
  theme: ThemeOption;
  createdAt: string;
}

export interface Word {
  id: string;
  childId: string;
  word: string;
  firstSeen: string;
  lastSeen: string;
  totalOccurrences: number;
  sessionsSeenCount: number;
  status: WordStatus;
  masteryCorrectCount: number;
  incorrectCount: number;
  lastTested?: string;
}

export interface ReadingSession {
  id: string;
  childId: string;
  bookId?: string;
  bookTitle?: string;
  createdAt: string;
  imageUrls: string[];
  extractedText?: string;
  cleanedText?: string;
  newWordsCount: number;
  totalWordsCount: number;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  gradeLevel?: string;
  description?: string;
  words: string[];
  wordCount: number;
  isPreset: boolean;
  isBeta: boolean;
  coverImageUrl?: string;
  isbn?: string;
  sourceType: BookSourceType;
  createdAt: string;
}

export interface PresetWordList {
  id: string;
  name: string;
  category: string;
  description?: string;
  words: string[];
  gradeLevel?: string;
  sortOrder: number;
}

export interface ChildBookProgress {
  id: string;
  childId: string;
  bookId: string;
  masteredWordCount: number;
  totalWordCount: number;
  readinessPercent: number;
  isReady: boolean;
  lastUpdated: string;
}

export interface BookReadiness {
  book: Book;
  masteredCount: number;
  totalCount: number;
  percent: number;
  isReady: boolean;
}

export interface GameTheme {
  name: string;
  description: string;
  icon: string;
  background: string;
  creatureGradient: string;
  creatureSavedColor: string;
  dangerZoneColor: string;
  accentColor: string;
  textColor: string;
  cardBg: string;
  cardBorder: string;
}

export type FlashcardResult = {
  wordId: string;
  word: string;
  isCorrect: boolean;
};

export type SessionInsights = {
  newWordsCount: number;
  totalWordsCount: number;
  newWords: string[];
  topRepeatedWords: { word: string; count: number }[];
};