import OpenAI from "openai";

const GROK_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GROK_TTS_MODEL = process.env.XAI_TTS_MODEL || "grok-tts";

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: GROK_BASE_URL,
});

export type GrokVoiceOption =
  | "ember"
  | "ash"
  | "river"
  | "sage"
  | "aurora";

const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 500;

export const GROK_AVAILABLE_VOICES: { name: GrokVoiceOption; description: string }[] = [
  { name: "ember", description: "Warm and conversational" },
  { name: "ash", description: "Calm and steady" },
  { name: "river", description: "Bright and friendly" },
  { name: "sage", description: "Thoughtful and measured" },
  { name: "aurora", description: "Expressive and energetic" },
];

const VALID_VOICES: GrokVoiceOption[] = GROK_AVAILABLE_VOICES.map((v) => v.name);

export function isGrokVoice(value: unknown): value is GrokVoiceOption {
  return typeof value === "string" && VALID_VOICES.includes(value as GrokVoiceOption);
}

export async function synthesizeSpeechWithGrok(
  text: string,
  voice: GrokVoiceOption = "ember",
  speed: number = 0.9
): Promise<Buffer> {
  const cacheKey = `grok_${text.toLowerCase()}_${voice}_${speed}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }

  try {
    const response = await grok.audio.speech.create({
      model: GROK_TTS_MODEL,
      voice: voice,
      input: text,
      speed: speed,
    });

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, audioBuffer);

    return audioBuffer;
  } catch (error) {
    console.error("Grok TTS synthesis error:", error);
    throw error;
  }
}
