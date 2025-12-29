import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processText, getTopRepeatedWords } from "./textProcessor";
import { extractTextFromImages } from "./ocrService";
import { insertChildSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // OCR endpoint - extract text from images using Gemini Vision
  app.post("/api/ocr", async (req, res) => {
    try {
      const { images } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }
      
      const extractedText = await extractTextFromImages(images);
      res.json({ text: extractedText });
    } catch (error) {
      console.error("OCR error:", error);
      res.status(500).json({ error: "Failed to extract text from images" });
    }
  });

  // Children endpoints
  app.get("/api/children", async (req, res) => {
    try {
      const children = await storage.getChildren();
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  app.get("/api/children/word-counts", async (req, res) => {
    try {
      const wordCounts = await storage.getChildWordCounts();
      res.json(wordCounts);
    } catch (error) {
      console.error("Error fetching word counts:", error);
      res.status(500).json({ error: "Failed to fetch word counts" });
    }
  });

  app.get("/api/children/:id", async (req, res) => {
    try {
      const child = await storage.getChild(req.params.id);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      res.json(child);
    } catch (error) {
      console.error("Error fetching child:", error);
      res.status(500).json({ error: "Failed to fetch child" });
    }
  });

  app.post("/api/children", async (req, res) => {
    try {
      const parsed = insertChildSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const child = await storage.createChild(parsed.data);
      res.status(201).json(child);
    } catch (error) {
      console.error("Error creating child:", error);
      res.status(500).json({ error: "Failed to create child" });
    }
  });

  app.patch("/api/children/:id", async (req, res) => {
    try {
      const child = await storage.updateChild(req.params.id, req.body);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      res.json(child);
    } catch (error) {
      console.error("Error updating child:", error);
      res.status(500).json({ error: "Failed to update child" });
    }
  });

  app.delete("/api/children/:id", async (req, res) => {
    try {
      await storage.deleteChild(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ error: "Failed to delete child" });
    }
  });

  // Sessions endpoints
  app.get("/api/children/:id/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSessionsByChild(req.params.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/children/:id/sessions", async (req, res) => {
    try {
      const childId = req.params.id;
      const { bookTitle, extractedText } = req.body;

      if (!extractedText) {
        return res.status(400).json({ error: "extractedText is required" });
      }

      const child = await storage.getChild(childId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      // Process the text
      const processed = processText(extractedText, {
        filterStopWords: child.stopWordsEnabled,
        filterByGradeLevel: child.gradeLevelFilterEnabled,
      });

      // Upsert words
      const { newWords, totalWords } = await storage.bulkUpsertWords(
        childId,
        processed.words
      );

      // Create session
      const session = await storage.createSession({
        childId,
        bookTitle: bookTitle || null,
        imageUrls: [],
        extractedText,
        cleanedText: processed.cleanedText,
        newWordsCount: newWords.length,
        totalWordsCount: totalWords,
      });

      res.status(201).json({
        ...session,
        newWords,
        topRepeatedWords: getTopRepeatedWords(processed.wordFrequencies),
      });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Get session-specific insights
      const child = await storage.getChild(session.childId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      // Re-process text to get top words
      const processed = processText(session.extractedText || "", {
        filterStopWords: child.stopWordsEnabled,
        filterByGradeLevel: child.gradeLevelFilterEnabled,
      });

      // Get words that were new in this session (approximate by checking first_seen date)
      const allWords = await storage.getWordsByChild(session.childId);
      const sessionDate = new Date(session.createdAt);
      const newWords = allWords
        .filter((w) => {
          const firstSeen = new Date(w.firstSeen);
          return Math.abs(firstSeen.getTime() - sessionDate.getTime()) < 60000; // Within 1 minute
        })
        .map((w) => w.word);

      res.json({
        ...session,
        newWords,
        topRepeatedWords: getTopRepeatedWords(processed.wordFrequencies),
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Words endpoints
  app.get("/api/children/:id/words", async (req, res) => {
    try {
      const words = await storage.getWordsByChild(req.params.id);
      res.json(words);
    } catch (error) {
      console.error("Error fetching words:", error);
      res.status(500).json({ error: "Failed to fetch words" });
    }
  });

  app.patch("/api/words/:id/result", async (req, res) => {
    try {
      const { isCorrect, isHistoryTest } = req.body;
      const word = await storage.getWord(req.params.id);

      if (!word) {
        return res.status(404).json({ error: "Word not found" });
      }

      const child = await storage.getChild(word.childId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      const now = new Date();
      let updates: Partial<typeof word> = {
        lastTested: now,
      };

      if (isCorrect) {
        const newCorrectCount = word.masteryCorrectCount + 1;
        updates.masteryCorrectCount = newCorrectCount;

        // Check if word should be mastered
        if (newCorrectCount >= child.masteryThreshold) {
          updates.status = "mastered";
        } else if (word.status === "new") {
          updates.status = "learning";
        }
      } else {
        updates.incorrectCount = word.incorrectCount + 1;

        // Optionally decrease mastery count
        if (word.masteryCorrectCount > 0) {
          updates.masteryCorrectCount = word.masteryCorrectCount - 1;
        }

        // Demote mastered words in history test if enabled
        if (isHistoryTest && child.demoteOnMiss && word.status === "mastered") {
          updates.status = "learning";
        } else if (word.status === "new") {
          updates.status = "learning";
        }
      }

      const updated = await storage.updateWord(word.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating word result:", error);
      res.status(500).json({ error: "Failed to update word result" });
    }
  });

  return httpServer;
}
