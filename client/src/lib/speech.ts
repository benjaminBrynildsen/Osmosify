type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
  message?: string;
};

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesInitialized = false;

export function initializeVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (voicesInitialized && preferredVoice) {
      resolve(window.speechSynthesis.getVoices());
      return;
    }

    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        preferredVoice = selectBestVoice(voices);
        voicesInitialized = true;
        if (synth.onvoiceschanged !== undefined) {
          synth.onvoiceschanged = null;
        }
        resolve(voices);
      }
    };

    loadVoices();
    
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    
    setTimeout(() => {
      const voices = synth.getVoices();
      if (voices.length > 0 && !voicesInitialized) {
        preferredVoice = selectBestVoice(voices);
        voicesInitialized = true;
      }
      resolve(voices);
    }, 500);
  });
}

function selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const googleNatural = voices.find(v => 
    v.name.includes('Google') && 
    v.lang.startsWith('en') &&
    (v.name.includes('Natural') || v.name.includes('US'))
  );
  if (googleNatural) return googleNatural;

  const googleEnglish = voices.find(v => 
    v.name.includes('Google') && 
    v.lang.startsWith('en')
  );
  if (googleEnglish) return googleEnglish;

  const naturalVoice = voices.find(v => 
    v.lang.startsWith('en') &&
    (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Premium'))
  );
  if (naturalVoice) return naturalVoice;

  const englishVoice = voices.find(v => v.lang.startsWith('en-US'));
  if (englishVoice) return englishVoice;

  const anyEnglish = voices.find(v => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  return voices[0] || null;
}

export function speakWord(word: string, rate: number = 0.9): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      console.warn('Speech error:', event);
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isMatch: boolean;
}

export function startListening(
  targetWord: string,
  onMatch: (result: RecognitionResult) => void,
  onNoMatch: (result: RecognitionResult) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void } {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported');
    onEnd();
    return { stop: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 5;

  let hasResult = false;
  let stopped = false;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    if (stopped) return;
    hasResult = true;
    const results = event.results[0];
    
    for (let i = 0; i < results.length; i++) {
      const alternative = results[i];
      const transcript = alternative.transcript.toLowerCase().trim();
      const target = targetWord.toLowerCase().trim();
      
      const isMatch = checkWordMatch(transcript, target);
      
      if (isMatch) {
        onMatch({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isMatch: true,
        });
        return;
      }
    }
    
    const bestResult = results[0];
    onNoMatch({
      transcript: bestResult.transcript,
      confidence: bestResult.confidence,
      isMatch: false,
    });
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (stopped) return;
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    if (stopped) return;
    onEnd();
  };

  try {
    recognition.start();
  } catch (e) {
    onError('Failed to start recognition');
    onEnd();
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recognition.abort();
      } catch (e) {
        // Ignore errors when stopping
      }
    },
  };
}

function checkWordMatch(spoken: string, target: string): boolean {
  const cleanSpoken = spoken.replace(/[.,!?'"]/g, '').trim();
  const cleanTarget = target.replace(/[.,!?'"]/g, '').trim();
  
  if (cleanSpoken === cleanTarget) return true;
  
  const spokenWords = cleanSpoken.split(/\s+/);
  if (spokenWords.includes(cleanTarget)) return true;
  
  if (cleanSpoken.startsWith(cleanTarget) || cleanSpoken.endsWith(cleanTarget)) return true;
  
  const distance = levenshteinDistance(cleanSpoken, cleanTarget);
  const maxAllowedDistance = Math.max(1, Math.floor(cleanTarget.length * 0.35));
  if (distance <= maxAllowedDistance) return true;
  
  for (const word of spokenWords) {
    const cleanWord = word.replace(/[.,!?'"]/g, '');
    if (cleanWord === cleanTarget) return true;
    const wordDistance = levenshteinDistance(cleanWord, cleanTarget);
    if (wordDistance <= maxAllowedDistance) return true;
  }
  
  return false;
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
