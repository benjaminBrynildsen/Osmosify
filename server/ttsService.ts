import OpenAI from "openai";
import { createHash } from "crypto";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { objectStorageClient } from "./replit_integrations/object_storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type VoiceOption = "alloy" | "nova" | "shimmer";

export const AVAILABLE_VOICES: { name: VoiceOption; description: string }[] = [
  { name: "nova", description: "Friendly and warm" },
  { name: "alloy", description: "Neutral and clear" },
  { name: "shimmer", description: "Soft and expressive" },
];

const inMemoryCache = new Map<string, Buffer>();
const MEMORY_CACHE_MAX = 200;

function r2Bucket(): string | null {
  return process.env.R2_BUCKET || null;
}

function ttsKey(text: string, voice: VoiceOption, speed: number): string {
  const normalized = text.trim().toLowerCase();
  const isWord = /^[a-z'-]+$/.test(normalized);
  const speedTag = speed.toFixed(2);
  if (isWord) {
    return `tts/${voice}/${speedTag}/words/${normalized}.mp3`;
  }
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 32);
  return `tts/${voice}/${speedTag}/phrases/${hash}.mp3`;
}

async function readFromR2(key: string): Promise<Buffer | null> {
  const bucket = r2Bucket();
  if (!bucket) return null;
  try {
    await objectStorageClient.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
  } catch {
    return null;
  }
  const obj = await objectStorageClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const body = obj.Body;
  if (!body) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function writeToR2(key: string, buffer: Buffer): Promise<void> {
  const bucket = r2Bucket();
  if (!bucket) return;
  await objectStorageClient.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

function rememberInMemory(key: string, buffer: Buffer) {
  if (inMemoryCache.size >= MEMORY_CACHE_MAX) {
    const firstKey = inMemoryCache.keys().next().value;
    if (firstKey) inMemoryCache.delete(firstKey);
  }
  inMemoryCache.set(key, buffer);
}

export async function synthesizeSpeech(
  text: string,
  voice: VoiceOption = "nova",
  speed: number = 0.9,
): Promise<Buffer> {
  const key = ttsKey(text, voice, speed);

  const memoryHit = inMemoryCache.get(key);
  if (memoryHit) return memoryHit;

  const r2Hit = await readFromR2(key).catch((err) => {
    console.warn("[tts] R2 read failed (will re-synth):", err?.message || err);
    return null;
  });
  if (r2Hit) {
    rememberInMemory(key, r2Hit);
    return r2Hit;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
    speed,
  });

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  rememberInMemory(key, audioBuffer);
  writeToR2(key, audioBuffer).catch((err) => {
    console.warn("[tts] R2 write failed:", err?.message || err);
  });

  return audioBuffer;
}
