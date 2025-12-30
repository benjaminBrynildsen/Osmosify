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

export function speak(text: string, options?: { rate?: number; onEnd?: () => void }): void {
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
