import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processText, getTopRepeatedWords } from "./textProcessor";
import { extractTextFromImages } from "./ocrService";
import { insertChildSchema, insertBookSchema, users } from "@shared/schema";
import { presetWordLists as presetData } from "./presetData";
import { presetBooks as presetBooksData } from "./presetBooks";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, ensureAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { searchBooksForDisplay, fetchCoverForBook } from "./openLibrary";
import { synthesizeSpeech, AVAILABLE_VOICES, VoiceOption } from "./ttsService";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Helper to get userId from authenticated request (supports email, phone, and Replit auth)
function getUserId(req: any): string {
  // Check for email or phone auth session first
  if (req.session?.userId && (req.session?.authMethod === "email" || req.session?.authMethod === "phone")) {
    return req.session.userId;
  }
  // Fall back to Replit OIDC auth
  return req.user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication FIRST (before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // User role update endpoint (for onboarding)
  app.patch("/api/auth/user/role", ensureAuthenticated, async (req, res) => {
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
  // Magic sentence generation endpoint for post-lesson celebration
  app.post("/api/generate-sentence", async (req, res) => {
    try {
      const { words, supportWords } = req.body;
      
      if (!words || !Array.isArray(words) || words.length === 0) {
        return res.status(400).json({ error: "No words provided" });
      }

      const { ai } = await import("./replit_integrations/image/client");
      
      // Limit to reasonable number of words for sentence generation
      const practicedWords = words.slice(0, 8).map((w: string) => w.toLowerCase());
      const helperWords = (supportWords || []).slice(0, 5).map((w: string) => w.toLowerCase());
      
      const prompt = `Create a simple sentence that a young child (ages 5-8) can read aloud.

REQUIRED WORDS (must include ALL of these): ${practicedWords.join(", ")}

OPTIONAL helper words you may also use: ${helperWords.length > 0 ? helperWords.join(", ") : "none"}

Rules:
- The sentence MUST contain every required word at least once
- Keep it short and simple (under 20 words if possible)
- Use age-appropriate vocabulary
- Make it meaningful and fun to read
- Only respond with the sentence, nothing else

Example: If required words are "cat, run, big" you might write "The big cat can run fast."`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let sentence = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      
      // Verify all required words are included, fallback if not
      const sentenceLower = sentence.toLowerCase();
      const allIncluded = practicedWords.every((w: string) => sentenceLower.includes(w));
      
      if (!sentence || !allIncluded) {
        // Fallback: create a simple sentence with all words
        sentence = createMagicSentenceFallback(practicedWords);
      }
      
      res.json({ sentence });
    } catch (error) {
      console.error("Sentence generation error:", error);
      const words = (req.body?.words || ["word"]).slice(0, 8);
      const fallback = createMagicSentenceFallback(words);
      res.json({ sentence: fallback });
    }
  });
  
  function createMagicSentenceFallback(words: string[]): string {
    if (words.length === 0) return "I can read!";
    if (words.length === 1) return `I can read the word ${words[0]}.`;
    if (words.length === 2) return `I can read ${words[0]} and ${words[1]}.`;
    if (words.length === 3) return `I see ${words[0]}, ${words[1]}, and ${words[2]}.`;
    // For 4+ words, create a list
    const lastWord = words[words.length - 1];
    const restWords = words.slice(0, -1).join(", ");
    return `I can read ${restWords}, and ${lastWord}.`;
  }

  // OCR endpoint - extract text from images using Gemini Vision (protected)
  app.post("/api/ocr", ensureAuthenticated, async (req, res) => {
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
  app.get("/api/children", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const children = await storage.getChildrenByUser(userId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  app.get("/api/children/word-counts", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const wordCounts = await storage.getChildWordCountsByUser(userId);
      res.json(wordCounts);
    } catch (error) {
      console.error("Error fetching word counts:", error);
      res.status(500).json({ error: "Failed to fetch word counts" });
    }
  });

  app.get("/api/children/:id", ensureAuthenticated, async (req, res) => {
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

  app.post("/api/children", ensureAuthenticated, async (req, res) => {
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

  app.patch("/api/children/:id", ensureAuthenticated, async (req, res) => {
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

  app.delete("/api/children/:id", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteChildForUser(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ error: "Failed to delete child" });
    }
  });

  // Increment sentences read counter
  app.post("/api/children/:id/increment-sentences-read", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const child = await storage.getChildByUser(req.params.id, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      const updated = await storage.updateChildForUser(req.params.id, userId, {
        sentencesRead: (child.sentencesRead || 0) + 1,
      });
      res.json({ sentencesRead: updated?.sentencesRead || 0 });
    } catch (error) {
      console.error("Error incrementing sentences read:", error);
      res.status(500).json({ error: "Failed to increment sentences read" });
    }
  });

  // Sessions endpoints (protected)
  app.get("/api/children/:id/sessions", ensureAuthenticated, async (req, res) => {
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

  app.post("/api/children/:id/sessions", ensureAuthenticated, async (req, res) => {
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

      // If a book title is provided, create/update the book in the library (scoped to child)
      let bookId: string | null = null;
      if (bookTitle && bookTitle.trim()) {
        const book = await storage.findOrCreateBookByTitle(bookTitle.trim(), processed.words, childId);
        bookId = book.id;
      }

      // Create session with bookId reference
      const session = await storage.createSession({
        childId,
        bookId,
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

  app.get("/api/sessions/:id", ensureAuthenticated, async (req, res) => {
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
  app.get("/api/children/:id/words", ensureAuthenticated, async (req, res) => {
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

  // Add multiple words at once (for guest data migration)
  const batchWordsSchema = z.object({
    words: z.array(z.string()).min(1),
  });

  app.post("/api/children/:id/words/batch", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const child = await storage.getChildByUser(req.params.id, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      const parsed = batchWordsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request: words array required" });
      }

      const existingWords = await storage.getWordsByChild(req.params.id);
      const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));

      const newWords = parsed.data.words
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 0 && !existingWordSet.has(w));

      const createdWords = [];
      for (const word of newWords) {
        const created = await storage.createWord({
          childId: req.params.id,
          word,
          status: "new",
          totalOccurrences: 1,
          masteryCorrectCount: 0,
          incorrectCount: 0,
        });
        createdWords.push(created);
      }

      res.json({ added: createdWords.length, words: createdWords });
    } catch (error) {
      console.error("Error adding batch words:", error);
      res.status(500).json({ error: "Failed to add words" });
    }
  });

  app.patch("/api/words/:id/result", ensureAuthenticated, async (req, res) => {
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
  app.patch("/api/words/:id/master", ensureAuthenticated, async (req, res) => {
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
  app.get("/api/presets", ensureAuthenticated, async (req, res) => {
    try {
      const presets = await storage.getPresetWordLists();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching presets:", error);
      res.status(500).json({ error: "Failed to fetch presets" });
    }
  });

  app.get("/api/presets/:id", ensureAuthenticated, async (req, res) => {
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

  app.post("/api/children/:id/add-preset", ensureAuthenticated, async (req, res) => {
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

  // Import book words to a child's word library
  const importBookWordsSchema = z.object({
    bookId: z.string().min(1),
  });

  app.post("/api/children/:id/import-book-words", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const childId = req.params.id;
      const parsed = importBookWordsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request: bookId required" });
      }
      const { bookId } = parsed.data;

      const child = await storage.getChildByUser(childId, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Verify ownership for non-preset books
      if (!book.isPreset && book.childId) {
        const bookOwner = await storage.getChildByUser(book.childId, userId);
        if (!bookOwner) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }

      if (!book.words || book.words.length === 0) {
        return res.json({
          added: 0,
          total: 0,
          bookTitle: book.title,
        });
      }

      const { newWords, totalWords } = await storage.bulkUpsertWords(childId, book.words);

      res.json({
        added: newWords.length,
        total: totalWords,
        bookTitle: book.title,
      });
    } catch (error) {
      console.error("Error importing book words:", error);
      res.status(500).json({ error: "Failed to import book words" });
    }
  });

  // Books endpoints (protected with user scoping)
  app.get("/api/books", ensureAuthenticated, async (req, res) => {
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

  app.get("/api/books/:id", ensureAuthenticated, async (req, res) => {
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

  app.post("/api/books", ensureAuthenticated, async (req, res) => {
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

  app.patch("/api/books/:id", ensureAuthenticated, async (req, res) => {
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

  // Update book cover with uploaded image path
  app.patch("/api/books/:id/cover", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { coverUrl } = req.body;
      
      if (!coverUrl) {
        return res.status(400).json({ error: "coverUrl is required" });
      }
      
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
      
      const book = await storage.updateBook(req.params.id, { customCoverUrl: coverUrl });
      res.json(book);
    } catch (error) {
      console.error("Error updating book cover:", error);
      res.status(500).json({ error: "Failed to update book cover" });
    }
  });

  app.delete("/api/books/:id", ensureAuthenticated, async (req, res) => {
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
  app.post("/api/books/:id/append-words", ensureAuthenticated, async (req, res) => {
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
  app.get("/api/children/:id/book-readiness", ensureAuthenticated, async (req, res) => {
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
  app.get("/api/preset-books", ensureAuthenticated, async (req, res) => {
    try {
      const presetBooks = await storage.getPresetBooks();
      res.json(presetBooks);
    } catch (error) {
      console.error("Error fetching preset books:", error);
      res.status(500).json({ error: "Failed to fetch preset books" });
    }
  });

  // Prioritized words for a book (leverage-based ordering)
  // Returns words sorted by leverage score, excluding mastered words
  app.get("/api/children/:childId/books/:bookId/prioritized-words", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { childId, bookId } = req.params;
      
      const child = await storage.getChildByUser(childId, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      const prioritizedWords = await storage.getPrioritizedWordsForBook(bookId, childId);
      res.json(prioritizedWords);
    } catch (error) {
      console.error("Error fetching prioritized words:", error);
      res.status(500).json({ error: "Failed to fetch prioritized words" });
    }
  });

  // Admin endpoint to sync global word stats
  app.post("/api/admin/sync-global-word-stats", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length || user[0].role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.syncGlobalWordStats();
      const stats = await storage.getAllGlobalWordStats();
      res.json({ 
        message: "Global word stats synced successfully",
        totalWords: stats.length 
      });
    } catch (error) {
      console.error("Error syncing global word stats:", error);
      res.status(500).json({ error: "Failed to sync global word stats" });
    }
  });

  // Get global word stats (for debugging/admin)
  app.get("/api/admin/global-word-stats", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length || user[0].role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const stats = await storage.getAllGlobalWordStats();
      res.json(stats.slice(0, limit));
    } catch (error) {
      console.error("Error fetching global word stats:", error);
      res.status(500).json({ error: "Failed to fetch global word stats" });
    }
  });

  // Open Library search endpoints (protected)
  app.get("/api/open-library/search", ensureAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }
      
      const results = await searchBooksForDisplay(query, limit);
      res.json(results);
    } catch (error) {
      console.error("Open Library search error:", error);
      res.status(500).json({ error: "Failed to search Open Library" });
    }
  });

  app.get("/api/open-library/cover", ensureAuthenticated, async (req, res) => {
    try {
      const title = req.query.title as string;
      const author = req.query.author as string | undefined;
      const isbn = req.query.isbn as string | undefined;
      const bookId = req.query.bookId as string | undefined;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const result = await fetchCoverForBook(title, author, isbn);
      
      // Cache the cover URL to the book if bookId provided and cover found
      if (bookId && result.coverUrl) {
        try {
          await storage.updateBookCover(bookId, result.coverUrl, result.isbn || undefined);
        } catch (cacheError) {
          console.error("Failed to cache book cover:", cacheError);
          // Don't fail the request if caching fails
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error("Open Library cover fetch error:", error);
      res.status(500).json({ error: "Failed to fetch cover" });
    }
  });

  // Book contribution schema for validation
  const bookContributionSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    author: z.string().max(100).nullable().optional(),
    isbn: z.string().max(20).nullable().optional(),
    gradeLevel: z.string().max(50).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    words: z.array(z.string().max(50)).min(1, "At least one word is required").max(500),
    contributorLabel: z.string().max(100).nullable().optional(),
  });

  // Book contribution endpoints (community contributions)
  app.post("/api/book-contributions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      const parseResult = bookContributionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid input" });
      }
      
      const { title, author, isbn, gradeLevel, description, words, contributorLabel } = parseResult.data;
      
      const contribution = await storage.createBookContribution({
        title,
        author: author || null,
        isbn: isbn || null,
        gradeLevel: gradeLevel || null,
        description: description || null,
        words,
        contributorLabel: contributorLabel || null,
        contributedBy: userId,
        sourceType: "community",
        approvalStatus: "pending",
      });
      
      res.status(201).json(contribution);
    } catch (error) {
      console.error("Error creating book contribution:", error);
      res.status(500).json({ error: "Failed to submit book contribution" });
    }
  });

  // Get pending book contributions (for moderation)
  app.get("/api/book-contributions/pending", ensureAuthenticated, async (req, res) => {
    try {
      const pendingBooks = await storage.getPendingBookContributions();
      res.json(pendingBooks);
    } catch (error) {
      console.error("Error fetching pending contributions:", error);
      res.status(500).json({ error: "Failed to fetch pending contributions" });
    }
  });

  // Approve a book contribution
  app.post("/api/book-contributions/:id/approve", ensureAuthenticated, async (req, res) => {
    try {
      const bookId = req.params.id;
      const approvedBook = await storage.approveBookContribution(bookId);
      if (!approvedBook) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(approvedBook);
    } catch (error) {
      console.error("Error approving book contribution:", error);
      res.status(500).json({ error: "Failed to approve book" });
    }
  });

  // Reject a book contribution
  app.post("/api/book-contributions/:id/reject", ensureAuthenticated, async (req, res) => {
    try {
      const bookId = req.params.id;
      const rejectedBook = await storage.rejectBookContribution(bookId);
      if (!rejectedBook) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(rejectedBook);
    } catch (error) {
      console.error("Error rejecting book contribution:", error);
      res.status(500).json({ error: "Failed to reject book" });
    }
  });

  // Featured book endpoints
  app.get("/api/featured-book", ensureAuthenticated, async (req, res) => {
    try {
      const featuredBook = await storage.getFeaturedBook();
      res.json(featuredBook || null);
    } catch (error) {
      console.error("Error fetching featured book:", error);
      res.status(500).json({ error: "Failed to fetch featured book" });
    }
  });

  app.post("/api/featured-book", ensureAuthenticated, async (req, res) => {
    try {
      const { bookId, durationDays } = req.body;
      if (!bookId) {
        return res.status(400).json({ error: "Book ID is required" });
      }
      const featuredBook = await storage.setFeaturedBook(bookId, durationDays || 7);
      if (!featuredBook) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(featuredBook);
    } catch (error) {
      console.error("Error setting featured book:", error);
      res.status(500).json({ error: "Failed to set featured book" });
    }
  });

  // Book unlock tracking endpoint
  app.post("/api/books/:id/unlock", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const bookId = req.params.id;
      const { childId } = req.body;
      
      if (!childId) {
        return res.status(400).json({ error: "Child ID is required" });
      }
      
      // Verify the child belongs to this user
      const child = await storage.getChildByUser(childId, userId);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      
      const wasNewUnlock = await storage.recordBookUnlock(bookId, childId);
      res.json({ success: true, wasNewUnlock });
    } catch (error) {
      console.error("Error recording book unlock:", error);
      res.status(500).json({ error: "Failed to record book unlock" });
    }
  });

  // Get books by popularity
  app.get("/api/preset-books/popular", ensureAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const popularBooks = await storage.getBooksByPopularity(limit);
      res.json(popularBooks);
    } catch (error) {
      console.error("Error fetching popular books:", error);
      res.status(500).json({ error: "Failed to fetch popular books" });
    }
  });

  // Text-to-Speech endpoint
  app.post("/api/tts/speak", ensureAuthenticated, async (req, res) => {
    try {
      const { text, voice, speed } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }
      
      const validVoices: VoiceOption[] = ["alloy", "nova", "shimmer"];
      const voiceName: VoiceOption = validVoices.includes(voice) ? voice : "nova";
      const speakingSpeed = typeof speed === "number" ? speed : 0.9;
      
      const audioBuffer = await synthesizeSpeech(text, voiceName, speakingSpeed);
      
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
        "Cache-Control": "public, max-age=86400",
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to synthesize speech" });
    }
  });

  // Get available TTS voices
  app.get("/api/tts/voices", ensureAuthenticated, async (req, res) => {
    res.json(AVAILABLE_VOICES);
  });

  // Seed presets on startup
  await storage.seedPresetWordLists(presetData);
  await storage.seedPresetBooks(presetBooksData);
  
  // Sync global word stats from preset books (for leverage-based prioritization)
  try {
    await storage.syncGlobalWordStats();
    console.log("Global word stats synced successfully");
  } catch (error) {
    console.error("Failed to sync global word stats:", error);
  }

  return httpServer;
}
