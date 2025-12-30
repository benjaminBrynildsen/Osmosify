declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice?: string, options?: { rate?: number; pitch?: number; onend?: () => void }) => void;
      cancel: () => void;
      voiceSupport: () => boolean;
      isPlaying: () => boolean;
    };
  }
}

const PREFERRED_VOICE = "UK English Female";
const FALLBACK_VOICE = "US English Female";

export function speak(text: string, options?: { rate?: number; onEnd?: () => void }): void {
  const rate = options?.rate ?? 0.9;
  
  if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
    window.responsiveVoice.cancel();
    window.responsiveVoice.speak(text, PREFERRED_VOICE, {
      rate,
      pitch: 1.0,
      onend: options?.onEnd,
    });
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    if (options?.onEnd) {
      utterance.onend = options.onEnd;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}

export function cancelSpeech(): void {
  if (window.responsiveVoice) {
    window.responsiveVoice.cancel();
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isVoiceAvailable(): boolean {
  return !!(window.responsiveVoice?.voiceSupport() || 'speechSynthesis' in window);
}
