import OpenAI from "openai";

export const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export const GROK_TEXT_MODEL = "grok-3";
export const GROK_VISION_MODEL = "grok-2-vision-1212";
export const GROK_IMAGE_MODEL = "grok-2-image-1212";
