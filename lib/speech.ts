import * as Speech from 'expo-speech';

export type VoiceOption = 'alloy' | 'nova' | 'shimmer';

let isSpeaking = false;

export async function speak(text: string, options?: { rate?: number; onEnd?: () => void }): Promise<void> {
  const rate = options?.rate ?? 0.85;
  
  if (isSpeaking) {
    await Speech.stop();
    isSpeaking = false;
  }

  return new Promise((resolve) => {
    isSpeaking = true;
    Speech.speak(text, {
      rate,
      pitch: 1.0,
      onDone: () => {
        isSpeaking = false;
        options?.onEnd?.();
        resolve();
      },
      onError: () => {
        isSpeaking = false;
        resolve();
      },
    });
  });
}

export async function speakWord(word: string, voice?: VoiceOption, rate: number = 0.9): Promise<void> {
  return speak(word, { rate });
}

export function cancelSpeech(): void {
  Speech.stop();
  isSpeaking = false;
}

export function isVoiceAvailable(): boolean {
  return true; // Expo Speech is always available
}

// Speech Recognition (for Lava Letters)
// Note: In a real app, you'd use expo-speech-recognition or a custom module
// For this implementation, we'll provide a mock that can be replaced

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isMatch: boolean;
}

export interface MultiWordMatch {
  word: string;
  index: number;
  transcript: string;
  confidence: number;
}

export function isSpeechRecognitionSupported(): boolean {
  // Speech recognition would require expo-speech-recognition module
  // For now, return false to disable voice features
  return false;
}

export function startListening(
  targetWord: string,
  onMatch: (result: RecognitionResult) => void,
  onNoMatch: (result: RecognitionResult) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void; updateTargetWord: (newWord: string) => void } {
  // Mock implementation - would need expo-speech-recognition
  return {
    stop: () => {},
    updateTargetWord: () => {},
  };
}

export function startContinuousListening(
  targetWords: string[],
  onWordMatch: (match: MultiWordMatch) => void,
  onInterimResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  onAllMatches?: (matches: MultiWordMatch[], markWordMatched: (wordIndex: number) => void) => void
): { stop: () => void; updateTargetWords: (words: string[]) => void } {
  // Mock implementation - would need expo-speech-recognition
  return {
    stop: () => {},
    updateTargetWords: () => {},
  };
}

// Homophones map for fuzzy matching
const HOMOPHONES: string[][] = [
  ['sight', 'site', 'cite'],
  ['their', 'there', "they're"],
  ['to', 'too', 'two'],
  ['your', "you're"],
  ['its', "it's"],
  ['know', 'no'],
  ['knew', 'new'],
  ['knight', 'night'],
  ['knot', 'not'],
  ['write', 'right', 'rite'],
  ['read', 'red'],
  ['hear', 'here'],
  ['sea', 'see'],
  ['sun', 'son'],
  ['one', 'won'],
  ['be', 'bee'],
  ['by', 'buy', 'bye'],
  ['for', 'four', 'fore'],
  ['ate', 'eight'],
  ['wait', 'weight'],
];

const homophoneMap = new Map<string, Set<string>>();
for (const group of HOMOPHONES) {
  const lowerGroup = group.map(w => w.toLowerCase());
  for (const word of lowerGroup) {
    if (!homophoneMap.has(word)) {
      homophoneMap.set(word, new Set());
    }
    for (const other of lowerGroup) {
      if (other !== word) {
        homophoneMap.get(word)!.add(other);
      }
    }
  }
}

function areHomophones(word1: string, word2: string): boolean {
  const lower1 = word1.toLowerCase();
  const lower2 = word2.toLowerCase();
  if (lower1 === lower2) return true;
  const homophones = homophoneMap.get(lower1);
  return homophones ? homophones.has(lower2) : false;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

export function checkWordMatch(spoken: string, target: string): boolean {
  const cleanSpoken = spoken.replace(/[.,!?'"]/g, '').trim().toLowerCase();
  const cleanTarget = target.replace(/[.,!?'"]/g, '').trim().toLowerCase();
  
  if (cleanSpoken === cleanTarget) return true;
  if (areHomophones(cleanSpoken, cleanTarget)) return true;
  
  const spokenWords = cleanSpoken.split(/\s+/);
  if (spokenWords.includes(cleanTarget)) return true;
  
  for (const word of spokenWords) {
    if (areHomophones(word, cleanTarget)) return true;
  }
  
  const distance = levenshteinDistance(cleanSpoken, cleanTarget);
  const maxAllowedDistance = Math.max(1, Math.floor(cleanTarget.length * 0.35));
  if (distance <= maxAllowedDistance) return true;
  
  return false;
}

// Audio context for success sounds
let audioContext: AudioContext | null = null;

export function playSuccessSound(): void {
  try {
    // Simple beep using expo-av would be better, but for now we'll skip
    // In a real implementation, use expo-av
  } catch (error) {
    console.warn('Could not play success sound:', error);
  }
}

export function unlockAudio(): void {
  // No-op for mobile - audio is always unlocked
}