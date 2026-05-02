import type { Express, Request, Response } from "express";
import { grok, GROK_IMAGE_MODEL } from "../../grokClient";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await grok.images.generate({
        model: GROK_IMAGE_MODEL,
        prompt,
        response_format: "b64_json",
        n: 1,
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        return res.status(500).json({ error: "No image data in response" });
      }

      res.json({
        b64_json: b64,
        mimeType: "image/png",
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}
