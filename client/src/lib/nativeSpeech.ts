/**
 * Native Text-to-Speech service using Capacitor
 * Replaces the web-based OpenAI TTS and browser SpeechSynthesis
 */

interface SpeakOptions {
  text: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

class NativeTTSService {
  private isNative: boolean = false;
  private TextToSpeech: any = null;

  constructor() {
    this.checkNative();
  }

  private async checkNative() {
    try {
      // Check if we're running in a Capacitor native environment
      const { Capacitor } = await import('@capacitor/core');
      this.isNative = Capacitor.isNativePlatform();
      if (this.isNative) {
        // Dynamically import the TTS plugin only on native platforms
        const ttsModule = await import('@capacitor-community/text-to-speech');
        this.TextToSpeech = ttsModule.TextToSpeech;
        console.log('[TTS] Native platform detected, using device TTS');
      }
    } catch (e) {
      this.isNative = false;
      this.TextToSpeech = null;
      console.log('[TTS] Web environment, using browser TTS');
    }
  }

  /**
   * Speak text using native TTS
   */
  async speak(options: SpeakOptions): Promise<void> {
    const { text, rate = 0.9, pitch = 1.0, volume = 1.0, lang = 'en-US' } = options;

    if (!text?.trim()) return;

    if (this.isNative && this.TextToSpeech) {
      try {
        await this.TextToSpeech.speak({
          text,
          lang,
          rate,
          pitch,
          volume,
          category: 'ambient',
        });
      } catch (error) {
        console.error('Native TTS error:', error);
        // Fallback to browser speech if native fails
        await this.fallbackSpeak(text, rate, pitch, volume, lang);
      }
    } else {
      // Web fallback
      await this.fallbackSpeak(text, rate, pitch, volume, lang);
    }
  }

  /**
   * Stop speaking
   */
  async stop(): Promise<void> {
    if (this.isNative && this.TextToSpeech) {
      try {
        await this.TextToSpeech.stop();
      } catch (error) {
        console.error('Error stopping native TTS:', error);
      }
    }
    
    // Also stop any browser speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<string[]> {
    if (this.isNative && this.TextToSpeech) {
      try {
        const { voices } = await this.TextToSpeech.getSupportedVoices();
        return voices.map((v: any) => v.name);
      } catch {
        return [];
      }
    }
    
    // Browser fallback
    if (window.speechSynthesis) {
      return window.speechSynthesis.getVoices().map(v => v.name);
    }
    
    return [];
  }

  /**
   * Check if a language is supported
   */
  async isLanguageSupported(lang: string): Promise<boolean> {
    if (this.isNative && this.TextToSpeech) {
      try {
        const result = await this.TextToSpeech.isLanguageSupported({ lang });
        return result.supported;
      } catch {
        return false;
      }
    }
    
    return true; // Browser TTS generally supports most languages
  }

  /**
   * Browser fallback using SpeechSynthesis API
   */
  private fallbackSpeak(
    text: string,
    rate: number,
    pitch: number,
    volume: number,
    lang: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = lang;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    });
  }
}

// Export singleton instance
export const nativeTTS = new NativeTTSService();

// Convenience function for quick speak
export const speak = (text: string, rate?: number) => 
  nativeTTS.speak({ text, rate });

// Stop speaking
export const stopSpeaking = () => nativeTTS.stop();
