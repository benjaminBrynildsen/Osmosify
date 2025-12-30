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

let browserVoices: SpeechSynthesisVoice[] = [];
let voicesInitialized = false;
let currentAudio: HTMLAudioElement | null = null;

export type VoiceOption = "alloy" | "nova" | "shimmer";

const voicePreferences: Record<VoiceOption, { gender: "female" | "male" | "neutral"; keywords: string[] }> = {
  nova: { gender: "female", keywords: ["Google", "Samantha", "Karen", "Victoria", "Zira", "Female"] },
  alloy: { gender: "neutral", keywords: ["Alex", "Daniel", "David", "Google UK", "Male"] },
  shimmer: { gender: "female", keywords: ["Moira", "Fiona", "Tessa", "Google UK Female", "Serena"] },
};

export interface TTSVoice {
  name: VoiceOption;
  description: string;
}

export async function fetchAvailableVoices(): Promise<TTSVoice[]> {
  try {
    const response = await fetch("/api/tts/voices", {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch voices");
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch voices:", error);
    return [
      { name: "nova", description: "Friendly and warm" },
      { name: "alloy", description: "Neutral and clear" },
      { name: "shimmer", description: "Soft and expressive" },
    ];
  }
}

export async function speakWordWithOpenAI(
  word: string,
  voice: VoiceOption = "nova",
  speed: number = 0.9
): Promise<void> {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    const response = await fetch("/api/tts/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        text: word,
        voice,
        speed,
      }),
    });

    if (!response.ok) {
      throw new Error("TTS request failed");
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return new Promise((resolve) => {
      currentAudio = new Audio(audioUrl);
      currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        resolve();
      };
      currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        resolve();
      };
      currentAudio.play().catch(() => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        resolve();
      });
    });
  } catch (error) {
    console.warn("OpenAI TTS failed, falling back to browser TTS:", error);
    return speakWordBrowser(word, voice, speed);
  }
}

export function initializeVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (voicesInitialized && browserVoices.length > 0) {
      resolve(browserVoices);
      return;
    }

    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        browserVoices = voices.filter(v => v.lang.startsWith('en'));
        voicesInitialized = true;
        if (synth.onvoiceschanged !== undefined) {
          synth.onvoiceschanged = null;
        }
        resolve(browserVoices);
      }
    };

    loadVoices();
    
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    
    setTimeout(() => {
      const voices = synth.getVoices();
      if (voices.length > 0 && !voicesInitialized) {
        browserVoices = voices.filter(v => v.lang.startsWith('en'));
        voicesInitialized = true;
      }
      resolve(browserVoices);
    }, 500);
  });
}

function selectVoiceForPreference(voiceOption: VoiceOption): SpeechSynthesisVoice | null {
  if (browserVoices.length === 0) return null;
  
  const prefs = voicePreferences[voiceOption];
  
  for (const keyword of prefs.keywords) {
    const match = browserVoices.find(v => 
      v.name.includes(keyword) && v.lang.startsWith('en')
    );
    if (match) return match;
  }
  
  const googleVoice = browserVoices.find(v => 
    v.name.includes('Google') && v.lang.startsWith('en')
  );
  if (googleVoice) return googleVoice;
  
  const usVoice = browserVoices.find(v => v.lang.startsWith('en-US'));
  if (usVoice) return usVoice;
  
  return browserVoices[0] || null;
}

function speakWordBrowser(word: string, voiceOption: VoiceOption = "nova", rate: number = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const selectedVoice = selectVoiceForPreference(voiceOption);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function speakWord(word: string, voice: VoiceOption = "nova", speed: number = 0.9): Promise<void> {
  return speakWordWithOpenAI(word, voice, speed);
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
): { stop: () => void; updateTargetWord: (newWord: string) => void } {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported');
    onEnd();
    return { stop: () => {}, updateTargetWord: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 5;

  let stopped = false;
  let currentTargetWord = targetWord;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    if (stopped) return;
    
    const lastResultIndex = event.results.length - 1;
    const results = event.results[lastResultIndex];
    
    if (!results.isFinal) return;
    
    for (let i = 0; i < results.length; i++) {
      const alternative = results[i];
      const transcript = alternative.transcript.toLowerCase().trim();
      const target = currentTargetWord.toLowerCase().trim();
      
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
    if (event.error === 'no-speech') {
      return;
    }
    if (event.error !== 'aborted') {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    if (stopped) return;
    try {
      recognition.start();
    } catch (e) {
      onEnd();
    }
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
    updateTargetWord: (newWord: string) => {
      currentTargetWord = newWord;
    },
  };
}

const HOMOPHONES: string[][] = [
  ["sight", "site", "cite"],
  ["their", "there", "they're"],
  ["to", "too", "two"],
  ["your", "you're"],
  ["its", "it's"],
  ["know", "no"],
  ["knew", "new"],
  ["knight", "night"],
  ["knot", "not"],
  ["write", "right", "rite"],
  ["read", "red"],
  ["hear", "here"],
  ["sea", "see"],
  ["sun", "son"],
  ["one", "won"],
  ["be", "bee"],
  ["by", "buy", "bye"],
  ["for", "four", "fore"],
  ["ate", "eight"],
  ["wait", "weight"],
  ["great", "grate"],
  ["pair", "pear", "pare"],
  ["fair", "fare"],
  ["bare", "bear"],
  ["wear", "where", "ware"],
  ["dear", "deer"],
  ["peace", "piece"],
  ["weak", "week"],
  ["meet", "meat"],
  ["tail", "tale"],
  ["sale", "sail"],
  ["mail", "male"],
  ["rain", "reign", "rein"],
  ["plain", "plane"],
  ["main", "mane"],
  ["road", "rode", "rowed"],
  ["hole", "whole"],
  ["soul", "sole"],
  ["role", "roll"],
  ["flower", "flour"],
  ["hour", "our"],
  ["would", "wood"],
  ["steal", "steel"],
  ["heal", "heel"],
  ["real", "reel"],
  ["break", "brake"],
  ["stake", "steak"],
  ["made", "maid"],
  ["thrown", "throne"],
  ["grown", "groan"],
  ["shown", "shone"],
  ["loan", "lone"],
  ["nose", "knows"],
  ["rose", "rows"],
  ["toes", "tows"],
  ["threw", "through"],
  ["blue", "blew"],
  ["flew", "flu", "flue"],
  ["dew", "due"],
  ["scent", "sent", "cent"],
  ["seen", "scene"],
  ["feet", "feat"],
  ["beat", "beet"],
  ["peak", "peek"],
  ["creek", "creak"],
  ["sweet", "suite"],
  ["tide", "tied"],
  ["die", "dye"],
  ["eye", "aye"],
  ["high", "hi"],
  ["pie", "pi"],
  ["lie", "lye"],
  ["might", "mite"],
  ["find", "fined"],
  ["mind", "mined"],
  ["time", "thyme"],
  ["wine", "whine"],
  ["sign", "sine"],
  ["vein", "vain", "vane"],
  ["pain", "pane"],
  ["way", "weigh", "whey"],
  ["prey", "pray"],
  ["hey", "hay"],
  ["gray", "grey"],
  ["toe", "tow"],
  ["row", "roe"],
  ["sew", "so", "sow"],
  ["bow", "beau"],
  ["foe", "faux"],
  ["doe", "dough"],
  ["moan", "mown"],
  ["bored", "board"],
  ["chord", "cord"],
  ["poured", "pored"],
  ["horse", "hoarse"],
  ["course", "coarse"],
  ["wore", "war"],
  ["more", "moor"],
  ["poor", "pour", "pore"],
  ["soar", "sore"],
  ["boar", "bore"],
  ["oar", "or", "ore"],
  ["allowed", "aloud"],
  ["ant", "aunt"],
  ["ball", "bawl"],
  ["band", "banned"],
  ["base", "bass"],
  ["beach", "beech"],
  ["berth", "birth"],
  ["bread", "bred"],
  ["brews", "bruise"],
  ["ceiling", "sealing"],
  ["cell", "sell"],
  ["cereal", "serial"],
  ["cheap", "cheep"],
  ["chews", "choose"],
  ["chili", "chilly"],
  ["clause", "claws"],
  ["crews", "cruise"],
  ["days", "daze"],
  ["disc", "disk"],
  ["dual", "duel"],
  ["earn", "urn"],
  ["ewe", "you", "yew"],
  ["faint", "feint"],
  ["fir", "fur"],
  ["flair", "flare"],
  ["flea", "flee"],
  ["foreword", "forward"],
  ["gait", "gate"],
  ["genes", "jeans"],
  ["gnu", "knew", "new"],
  ["gorilla", "guerrilla"],
  ["grill", "grille"],
  ["grays", "graze"],
  ["guessed", "guest"],
  ["hare", "hair"],
  ["hall", "haul"],
  ["hangar", "hanger"],
  ["heard", "herd"],
  ["hymn", "him"],
  ["idle", "idol"],
  ["in", "inn"],
  ["jam", "jamb"],
  ["kernel", "colonel"],
  ["lessen", "lesson"],
  ["links", "lynx"],
  ["muscle", "mussel"],
  ["naval", "navel"],
  ["none", "nun"],
  ["pail", "pale"],
  ["passed", "past"],
  ["patience", "patients"],
  ["pause", "paws"],
  ["pedal", "peddle"],
  ["peer", "pier"],
  ["prints", "prince"],
  ["principal", "principle"],
  ["profit", "prophet"],
  ["rap", "wrap"],
  ["ring", "wring"],
  ["root", "route"],
  ["scull", "skull"],
  ["seam", "seem"],
  ["shear", "sheer"],
  ["sleigh", "slay"],
  ["stair", "stare"],
  ["stationary", "stationery"],
  ["straight", "strait"],
  ["symbol", "cymbal"],
  ["tense", "tents"],
  ["threw", "through"],
  ["waist", "waste"],
  ["wail", "whale"],
  ["waive", "wave"],
  ["weather", "whether"],
  ["which", "witch"],
  ["whose", "who's"],
  ["worn", "warn"],
  ["yoke", "yolk"],
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

function checkWordMatch(spoken: string, target: string): boolean {
  const cleanSpoken = spoken.replace(/[.,!?'"]/g, '').trim().toLowerCase();
  const cleanTarget = target.replace(/[.,!?'"]/g, '').trim().toLowerCase();
  
  if (cleanSpoken === cleanTarget) return true;
  
  if (areHomophones(cleanSpoken, cleanTarget)) return true;
  
  const spokenWords = cleanSpoken.split(/\s+/);
  if (spokenWords.includes(cleanTarget)) return true;
  
  for (const word of spokenWords) {
    if (areHomophones(word, cleanTarget)) return true;
  }
  
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

let audioContext: AudioContext | null = null;

export function playSuccessSound(): void {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => playChime(audioContext!));
    } else {
      playChime(audioContext);
    }
  } catch (error) {
    console.warn("Could not play success sound:", error);
  }
}

function playChime(ctx: AudioContext): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.4);
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
