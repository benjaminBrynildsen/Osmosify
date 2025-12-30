import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type VoiceOption = "alloy" | "nova" | "shimmer";

const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 500;

export const AVAILABLE_VOICES: { name: VoiceOption; description: string }[] = [
  { name: "nova", description: "Friendly and warm" },
  { name: "alloy", description: "Neutral and clear" },
  { name: "shimmer", description: "Soft and expressive" },
];

export async function synthesizeSpeech(
  text: string,
  voice: VoiceOption = "nova",
  speed: number = 0.9
): Promise<Buffer> {
  const cacheKey = `${text.toLowerCase()}_${voice}_${speed}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
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
    console.error("OpenAI TTS synthesis error:", error);
    throw error;
  }
}
