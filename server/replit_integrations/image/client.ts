import { grok, GROK_IMAGE_MODEL } from "../../grokClient";

/**
 * Generate an image and return as base64 data URL.
 * Uses xAI Grok image model.
 */
export async function generateImage(prompt: string): Promise<string> {
  const response = await grok.images.generate({
    model: GROK_IMAGE_MODEL,
    prompt,
    response_format: "b64_json",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image data in response");
  }
  return `data:image/png;base64,${b64}`;
}

// Re-export grok client for backward compatibility with callers expecting `ai`
export { grok as ai } from "../../grokClient";
