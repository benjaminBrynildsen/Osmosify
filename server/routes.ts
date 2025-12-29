import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processText, getTopRepeatedWords } from "./textProcessor";
import { extractTextFromImages } from "./ocrService";
import { insertChildSchema, insertBookSchema } from "@shared/schema";
import { presetWordLists as presetData } from "./presetData";
import { presetBooks as presetBooksData } from "./presetBooks";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

// Helper to get userId from authenticated request
function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication FIRST (before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // User role update endpoint (for onboarding)
  app.patch("/api/auth/user/role", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { role } = req.body;
      if (!role || !["parent", "teacher"].includes(role)) {
        return res.status(400).json({ error: "Role must be 'parent' or 'teacher'" });
      }
      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });
  // OCR endpoint - extract text from images using Gemini Vision (protected)
  app.post("/api/ocr", isAuthenticated, async (req, res) => {
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

  // Children endpoints (protected)
  app.get("/api/children", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const children = await storage.getChildrenByUser(userId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  app.get("/api/children/word-counts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const wordCounts = await storage.getChildWordCountsByUser(userId);
      res.json(wordCounts);
    } catch (error) {
      console.error("Error fetching word counts:", error);
      res.status(500).json({ error: "Failed to fetch word counts" });
    }
  });

  app.get("/api/children/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const child = await storage.getChildByUser(req.params.id, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      res.json(child);
    } catch (error) {
      console.error("Error fetching child:", error);
      res.status(500).json({ error: "Failed to fetch child" });
    }
  });

  app.post("/api/children", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = insertChildSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const child = await storage.createChildForUser(userId, parsed.data);
      res.status(201).json(child);
    } catch (error) {
      console.error("Error creating child:", error);
      res.status(500).json({ error: "Failed to create child" });
    }
  });

  app.patch("/api/children/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const child = await storage.updateChildForUser(req.params.id, userId, req.body);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      res.json(child);
    } catch (error) {
      console.error("Error updating child:", error);
      res.status(500).json({ error: "Failed to update child" });
    }
  });

  app.delete("/api/children/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteChildForUser(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ error: "Failed to delete child" });
    }
  });

  // Sessions endpoints (protected)
  app.get("/api/children/:id/sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const child = await storage.getChildByUser(req.params.id, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      const sessions = await storage.getSessionsByChild(req.params.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/children/:id/sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const childId = req.params.id;
      const { bookTitle, extractedText } = req.body;

      if (!extractedText) {
        return res.status(400).json({ error: "extractedText is required" });
      }

      const child = await storage.getChildByUser(childId, userId);
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

      // If a book title is provided, also create/update the book in the library (scoped to child)
      if (bookTitle && bookTitle.trim()) {
        await storage.findOrCreateBookByTitle(bookTitle.trim(), processed.words, childId);
      }

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

  app.get("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify ownership via child
      const child = await storage.getChildByUser(session.childId, userId);
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

  // Words endpoints (protected)
  app.get("/api/children/:id/words", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const child = await storage.getChildByUser(req.params.id, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      const words = await storage.getWordsByChild(req.params.id);
      res.json(words);
    } catch (error) {
      console.error("Error fetching words:", error);
      res.status(500).json({ error: "Failed to fetch words" });
    }
  });

  app.patch("/api/words/:id/result", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { isCorrect, isHistoryTest } = req.body;
      const word = await storage.getWord(req.params.id);

      if (!word) {
        return res.status(404).json({ error: "Word not found" });
      }

      // Verify ownership via child
      const child = await storage.getChildByUser(word.childId, userId);
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

  // Mark word as mastered (called when 7 correct in session)
  app.patch("/api/words/:id/master", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const word = await storage.getWord(req.params.id);

      if (!word) {
        return res.status(404).json({ error: "Word not found" });
      }

      // Verify ownership via child
      const child = await storage.getChildByUser(word.childId, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      const updates = {
        status: "mastered" as const,
        masteryCorrectCount: child.masteryThreshold,
        lastTested: new Date(),
      };

      const updated = await storage.updateWord(word.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error mastering word:", error);
      res.status(500).json({ error: "Failed to master word" });
    }
  });

  // Preset Word Lists endpoints (protected)
  app.get("/api/presets", isAuthenticated, async (req, res) => {
    try {
      const presets = await storage.getPresetWordLists();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching presets:", error);
      res.status(500).json({ error: "Failed to fetch presets" });
    }
  });

  app.get("/api/presets/:id", isAuthenticated, async (req, res) => {
    try {
      const preset = await storage.getPresetWordList(req.params.id);
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(preset);
    } catch (error) {
      console.error("Error fetching preset:", error);
      res.status(500).json({ error: "Failed to fetch preset" });
    }
  });

  // Add preset words to a child's word library
  const addPresetSchema = z.object({
    presetId: z.string().min(1),
  });

  app.post("/api/children/:id/add-preset", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const childId = req.params.id;
      const parsed = addPresetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request: presetId required" });
      }
      const { presetId } = parsed.data;

      const child = await storage.getChildByUser(childId, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      const preset = await storage.getPresetWordList(presetId);
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }

      const { newWords, totalWords } = await storage.bulkUpsertWords(childId, preset.words);

      res.json({
        added: newWords.length,
        total: totalWords,
        presetName: preset.name,
      });
    } catch (error) {
      console.error("Error adding preset:", error);
      res.status(500).json({ error: "Failed to add preset words" });
    }
  });

  // Books endpoints (protected with user scoping)
  app.get("/api/books", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const books = await storage.getBooksByUser(userId);
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  app.get("/api/books/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      // Allow access to preset books or books owned by user's children
      if (!book.isPreset && book.childId) {
        const child = await storage.getChildByUser(book.childId, userId);
        if (!child) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      res.json(book);
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  app.post("/api/books", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const parsed = insertBookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      // If creating a book for a child, verify ownership
      if (parsed.data.childId) {
        const child = await storage.getChildByUser(parsed.data.childId, userId);
        if (!child) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      const book = await storage.createBook(parsed.data);
      res.status(201).json(book);
    } catch (error) {
      console.error("Error creating book:", error);
      res.status(500).json({ error: "Failed to create book" });
    }
  });

  app.patch("/api/books/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existingBook = await storage.getBook(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
      }
      // Verify ownership for non-preset books
      if (!existingBook.isPreset && existingBook.childId) {
        const child = await storage.getChildByUser(existingBook.childId, userId);
        if (!child) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      const book = await storage.updateBook(req.params.id, req.body);
      res.json(book);
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existingBook = await storage.getBook(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
      }
      // Verify ownership for non-preset books
      if (!existingBook.isPreset && existingBook.childId) {
        const child = await storage.getChildByUser(existingBook.childId, userId);
        if (!child) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      await storage.deleteBook(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // Append words to an existing book (with ownership validation)
  app.post("/api/books/:id/append-words", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { words, childId } = req.body;
      if (!words || !Array.isArray(words) || words.length === 0) {
        return res.status(400).json({ error: "words array is required" });
      }
      if (!childId) {
        return res.status(400).json({ error: "childId is required" });
      }

      // Verify the child belongs to the user
      const child = await storage.getChildByUser(childId, userId);
      if (!child) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const existingBook = await storage.getBook(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Only allow appending to non-preset books owned by the child
      if (existingBook.isPreset) {
        return res.status(403).json({ error: "Cannot modify preset books" });
      }
      if (existingBook.childId && existingBook.childId !== childId) {
        return res.status(403).json({ error: "Book belongs to another child" });
      }

      const book = await storage.appendWordsToBook(req.params.id, words);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      console.error("Error appending words to book:", error);
      res.status(500).json({ error: "Failed to append words to book" });
    }
  });

  // Book readiness endpoints (protected)
  app.get("/api/children/:id/book-readiness", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const childId = req.params.id;
      const child = await storage.getChildByUser(childId, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      const readiness = await storage.calculateBookReadiness(childId);
      res.json(readiness);
    } catch (error) {
      console.error("Error calculating readiness:", error);
      res.status(500).json({ error: "Failed to calculate book readiness" });
    }
  });

  // Preset books endpoints (protected)
  app.get("/api/preset-books", isAuthenticated, async (req, res) => {
    try {
      const presetBooks = await storage.getPresetBooks();
      res.json(presetBooks);
    } catch (error) {
      console.error("Error fetching preset books:", error);
      res.status(500).json({ error: "Failed to fetch preset books" });
    }
  });

  // Seed presets on startup
  await storage.seedPresetWordLists(presetData);
  await storage.seedPresetBooks(presetBooksData);

  return httpServer;
}
