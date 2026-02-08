let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

const PREFERRED_VOICE_NAMES = [
  'Google UK English Female',
  'Google US English', 
  'Samantha',
  'Karen',
  'Victoria',
  'Microsoft Zira',
  'Alex'
];

function loadVoices(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  
  voicesLoaded = true;
  
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  for (const preferred of PREFERRED_VOICE_NAMES) {
    const found = englishVoices.find(v => v.name.includes(preferred));
    if (found) {
      cachedVoice = found;
      return found;
    }
  }
  
  cachedVoice = englishVoices[0] || voices[0] || null;
  return cachedVoice;
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Native TTS integration for Capacitor mobile apps
let nativeTTS: typeof import('./nativeSpeech').nativeTTS | null = null;
let isNativePlatform = false;
let nativeInitPromise: Promise<void> | null = null;

async function initNativeTTS() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNativePlatform = Capacitor.isNativePlatform();
    if (isNativePlatform) {
      const nativeSpeech = await import('./nativeSpeech');
      nativeTTS = nativeSpeech.nativeTTS;
      console.log('[Voice] Native platform detected, using device TTS');
    }
  } catch (e) {
    console.log('[Voice] Web environment, using browser TTS');
  }
}

nativeInitPromise = initNativeTTS();

export async function speak(text: string, options?: { rate?: number; onEnd?: () => void }): Promise<void> {
  // Wait for native TTS initialization
  if (nativeInitPromise) {
    await nativeInitPromise;
  }
  
  // Use native TTS on mobile platforms
  if (isNativePlatform && nativeTTS) {
    console.log(`[Voice] Using native device TTS for: "${text}"`);
    await nativeTTS.speak({ text, rate: options?.rate ?? 0.85 });
    if (options?.onEnd) {
      options.onEnd();
    }
    return;
  }
  
  // Fall back to browser SpeechSynthesis
  if (!('speechSynthesis' in window)) return;
  
  const rate = options?.rate ?? 0.85;
  
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1.0;
  
  if (!voicesLoaded) {
    loadVoices();
  }
  
  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }
  
  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }
  
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isVoiceAvailable(): boolean {
  return 'speechSynthesis' in window;
}

export function getVoiceName(): string | null {
  return cachedVoice?.name || null;
}
