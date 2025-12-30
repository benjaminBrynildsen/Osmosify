import { TextToSpeechClient, protos } from "@google-cloud/text-to-speech";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const ttsClient = new TextToSpeechClient({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  } as any,
  projectId: "",
});

const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 500;

export async function synthesizeSpeech(
  text: string,
  voiceName: string = "en-US-Neural2-C",
  speakingRate: number = 0.9
): Promise<Buffer> {
  const cacheKey = `${text.toLowerCase()}_${voiceName}_${speakingRate}`;
  
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: { text },
    voice: {
      languageCode: "en-US",
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: "MP3" as any,
      speakingRate,
      pitch: 0,
    },
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error("No audio content received");
    }

    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);
    
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, audioBuffer);
    
    return audioBuffer;
  } catch (error) {
    console.error("TTS synthesis error:", error);
    throw error;
  }
}

export async function listVoices(): Promise<protos.google.cloud.texttospeech.v1.IVoice[]> {
  try {
    const [response] = await ttsClient.listVoices({ languageCode: "en-US" });
    return response.voices || [];
  } catch (error) {
    console.error("Error listing voices:", error);
    return [];
  }
}

export const RECOMMENDED_VOICES = [
  { name: "en-US-Neural2-C", description: "Female, calm and clear" },
  { name: "en-US-Neural2-D", description: "Male, warm and friendly" },
  { name: "en-US-Neural2-A", description: "Male, standard" },
  { name: "en-US-Neural2-E", description: "Female, expressive" },
  { name: "en-US-Neural2-F", description: "Female, casual" },
  { name: "en-US-Neural2-G", description: "Female, soft" },
  { name: "en-US-Neural2-H", description: "Female, bright" },
  { name: "en-US-Neural2-I", description: "Male, deep" },
  { name: "en-US-Neural2-J", description: "Male, upbeat" },
];
