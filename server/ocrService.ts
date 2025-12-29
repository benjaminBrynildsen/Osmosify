import { GoogleGenAI } from "@google/genai";

// This is using Replit's AI Integrations service for Gemini access
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

/**
 * Extract text from an image using Gemini Vision
 * This provides much higher quality OCR than Tesseract.js
 */
export async function extractTextFromImage(imageBase64: string, mimeType: string = "image/jpeg"): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `Extract all the readable text from this book page image. 
Return ONLY the text content that appears on the page - no commentary, no descriptions.
Focus on the actual words and sentences from the book.
If the text is unclear or partially visible, make your best effort to read it.
Do not include page numbers, headers, or other non-content text.
Return the text as clean paragraphs.`,
          },
        ],
      },
    ],
  });

  const text = response.text || "";
  return text.trim();
}

/**
 * Process multiple images and combine extracted text
 */
export async function extractTextFromImages(images: { base64: string; mimeType: string }[]): Promise<string> {
  const results: string[] = [];
  
  for (const image of images) {
    try {
      const text = await extractTextFromImage(image.base64, image.mimeType);
      if (text) {
        results.push(text);
      }
    } catch (error) {
      console.error("Error extracting text from image:", error);
      // Continue with other images even if one fails
    }
  }
  
  return results.join("\n\n");
}
