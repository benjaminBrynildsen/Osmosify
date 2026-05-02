import { grok, GROK_VISION_MODEL } from "./grokClient";

const OCR_PROMPT = `Extract all the readable text from this book page image.
Return ONLY the text content that appears on the page - no commentary, no descriptions.
Focus on the actual words and sentences from the book.
If the text is unclear or partially visible, make your best effort to read it.
Do not include page numbers, headers, or other non-content text.
Return the text as clean paragraphs.`;

export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg",
): Promise<string> {
  const response = await grok.chat.completions.create({
    model: GROK_VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: "text", text: OCR_PROMPT },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  return text.trim();
}

export async function extractTextFromImages(
  images: { base64: string; mimeType: string }[],
): Promise<string> {
  const results: string[] = [];
  for (const image of images) {
    try {
      const text = await extractTextFromImage(image.base64, image.mimeType);
      if (text) results.push(text);
    } catch (error) {
      console.error("Error extracting text from image:", error);
    }
  }
  return results.join("\n\n");
}
