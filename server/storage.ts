import {
  type Child,
  type InsertChild,
  type ReadingSession,
  type InsertReadingSession,
  type Word,
  type InsertWord,
  type PresetWordList,
  type InsertPresetWordList,
  type Book,
  type InsertBook,
  type ChildBookProgress,
  type InsertChildBookProgress,
  type BookReadiness,
  type BookUnlock,
  type User,
  type UserRole,
  type GlobalWordStats,
  type PrioritizedWord,
  type ChildAddedPreset,
  type AnonymousSession,
  type ProductEvent,
  type ProductEventType,
  children,
  readingSessions,
  words,
  presetWordLists,
  books,
  childBookProgress,
  bookUnlocks,
  users,
  globalWordStats,
  childAddedPresets,
  childAddedBooks,
  anonymousSessions,
  productEvents,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, isNull, asc } from "drizzle-orm";

export interface PresetBookData {
  title: string;
  author?: string | null;
  gradeLevel?: string | null;
  words?: string[];
  isPreset: true;
  isBeta: boolean;
}

export interface IStorage {
  // User management
  updateUserRole(userId: string, role: UserRole): Promise<User>;

  // Children (user-scoped)
  getChildrenByUser(userId: string): Promise<Child[]>;
  getChildByUser(childId: string, userId: string): Promise<Child | undefined>;
  createChildForUser(userId: string, child: InsertChild): Promise<Child>;
  updateChildForUser(childId: string, userId: string, data: Partial<InsertChild>): Promise<Child | undefined>;
  deleteChildForUser(childId: string, userId: string): Promise<void>;
  getChildWordCountsByUser(userId: string): Promise<Record<string, number>>;

  // Children (legacy - for internal use)
  getChildren(): Promise<Child[]>;
  getChild(id: string): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: string, data: Partial<InsertChild>): Promise<Child | undefined>;
  deleteChild(id: string): Promise<void>;
  getChildWordCounts(): Promise<Record<string, number>>;

  // Reading Sessions
  getSessionsByChild(childId: string): Promise<ReadingSession[]>;
  getSession(id: string): Promise<ReadingSession | undefined>;
  createSession(session: InsertReadingSession): Promise<ReadingSession>;

  // Words
  getWordsByChild(childId: string): Promise<Word[]>;
  getWord(id: string): Promise<Word | undefined>;
  getWordByChildAndWord(childId: string, word: string): Promise<Word | undefined>;
  createWord(word: InsertWord): Promise<Word>;
  updateWord(id: string, data: Partial<Word>): Promise<Word | undefined>;
  bulkUpsertWords(childId: string, wordList: string[]): Promise<{ newWords: string[]; totalWords: number }>;

  // Preset Word Lists
  getPresetWordLists(): Promise<PresetWordList[]>;
  getPresetWordList(id: string): Promise<PresetWordList | undefined>;
  createPresetWordList(list: InsertPresetWordList): Promise<PresetWordList>;
  seedPresetWordLists(lists: InsertPresetWordList[]): Promise<void>;

  // Books
  getBooks(): Promise<Book[]>;
  getBooksByUser(userId: string): Promise<Book[]>;
  getPresetBooks(): Promise<Book[]>;
  getCustomBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  getBookByTitle(title: string, childId?: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  createPresetBook(book: PresetBookData): Promise<Book>;
  updateBook(id: string, data: Partial<InsertBook>): Promise<Book | undefined>;
  appendWordsToBook(id: string, newWords: string[]): Promise<Book | undefined>;
  deleteBook(id: string): Promise<void>;
  seedPresetBooks(bookList: PresetBookData[]): Promise<void>;
  findOrCreateBookByTitle(title: string, words: string[], childId: string): Promise<Book>;

  // Book Cover Caching
  updateBookCover(bookId: string, coverUrl: string, isbn?: string): Promise<Book | undefined>;

  // Book Progress & Readiness
  getChildBookProgress(childId: string): Promise<ChildBookProgress[]>;
  calculateBookReadiness(childId: string): Promise<BookReadiness[]>;
  updateChildBookProgress(childId: string, bookId: string): Promise<ChildBookProgress>;

  // Global Word Stats (leverage-based prioritization)
  syncGlobalWordStats(): Promise<void>;
  getGlobalWordStats(word: string): Promise<GlobalWordStats | undefined>;
  getAllGlobalWordStats(): Promise<GlobalWordStats[]>;
  getPrioritizedWordsForBook(bookId: string, childId: string): Promise<PrioritizedWord[]>;

  // Child Added Presets (tracking which word lists a child has added)
  getChildAddedPresets(childId: string): Promise<Array<ChildAddedPreset & { preset: PresetWordList }>>;
  addPresetToChild(childId: string, presetId: string): Promise<ChildAddedPreset>;

  // Anonymous Sessions & Analytics
  initAnonymousSession(sessionId: string, userAgent?: string): Promise<AnonymousSession>;
  incrementSessionLessons(sessionId: string): Promise<AnonymousSession | undefined>;
  linkSessionToUser(sessionId: string, userId: string): Promise<AnonymousSession | undefined>;
  trackProductEvent(event: { sessionId: string; userId?: string | null; eventType: ProductEventType; eventData?: unknown }): Promise<ProductEvent>;
  getAnalyticsSummary(): Promise<{
    totalSessions: number;
    sessionsWithGames: number;
    sessionsWithLessonComplete: number;
    convertedSessions: number;
    eventCounts: Record<string, number>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Children (user-scoped)
  async getChildrenByUser(userId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.userId, userId)).orderBy(children.name);
  }

  async getChildByUser(childId: string, userId: string): Promise<Child | undefined> {
    const [child] = await db
      .select()
      .from(children)
      .where(and(eq(children.id, childId), eq(children.userId, userId)));
    return child;
  }

  async createChildForUser(userId: string, child: InsertChild): Promise<Child> {
    const [created] = await db.insert(children).values({ ...child, userId }).returning();
    return created;
  }

  async updateChildForUser(childId: string, userId: string, data: Partial<InsertChild>): Promise<Child | undefined> {
    const [updated] = await db
      .update(children)
      .set(data)
      .where(and(eq(children.id, childId), eq(children.userId, userId)))
      .returning();
    return updated;
  }

  async deleteChildForUser(childId: string, userId: string): Promise<void> {
    await db.delete(children).where(and(eq(children.id, childId), eq(children.userId, userId)));
  }

  async getChildWordCountsByUser(userId: string): Promise<Record<string, number>> {
    const userChildren = await this.getChildrenByUser(userId);
    const childIds = userChildren.map(c => c.id);
    
    if (childIds.length === 0) {
      return {};
    }

    const result = await db
      .select({
        childId: words.childId,
        count: sql<number>`count(*)::int`,
      })
      .from(words)
      .where(inArray(words.childId, childIds))
      .groupBy(words.childId);

    return result.reduce((acc, row) => {
      acc[row.childId] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Children (legacy)
  async getChildren(): Promise<Child[]> {
    return db.select().from(children).orderBy(children.name);
  }

  async getChild(id: string): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  async createChild(child: InsertChild): Promise<Child> {
    const [created] = await db.insert(children).values(child).returning();
    return created;
  }

  async updateChild(id: string, data: Partial<InsertChild>): Promise<Child | undefined> {
    const [updated] = await db
      .update(children)
      .set(data)
      .where(eq(children.id, id))
      .returning();
    return updated;
  }

  async deleteChild(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
  }

  async getChildWordCounts(): Promise<Record<string, number>> {
    const result = await db
      .select({
        childId: words.childId,
        count: sql<number>`count(*)::int`,
      })
      .from(words)
      .groupBy(words.childId);

    return result.reduce((acc, row) => {
      acc[row.childId] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Reading Sessions
  async getSessionsByChild(childId: string): Promise<ReadingSession[]> {
    return db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.childId, childId))
      .orderBy(desc(readingSessions.createdAt));
  }

  async getSession(id: string): Promise<ReadingSession | undefined> {
    const [session] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, id));
    return session;
  }

  async createSession(session: InsertReadingSession): Promise<ReadingSession> {
    const [created] = await db.insert(readingSessions).values(session).returning();
    return created;
  }

  // Words
  async getWordsByChild(childId: string): Promise<Word[]> {
    return db
      .select()
      .from(words)
      .where(eq(words.childId, childId))
      .orderBy(desc(words.firstSeen));
  }

  async getWord(id: string): Promise<Word | undefined> {
    const [word] = await db.select().from(words).where(eq(words.id, id));
    return word;
  }

  async getWordByChildAndWord(childId: string, word: string): Promise<Word | undefined> {
    const [found] = await db
      .select()
      .from(words)
      .where(and(eq(words.childId, childId), eq(words.word, word)));
    return found;
  }

  async createWord(word: InsertWord): Promise<Word> {
    const [created] = await db.insert(words).values(word as typeof words.$inferInsert).returning();
    return created;
  }

  async updateWord(id: string, data: Partial<Word>): Promise<Word | undefined> {
    const [updated] = await db
      .update(words)
      .set(data)
      .where(eq(words.id, id))
      .returning();
    return updated;
  }

  async bulkUpsertWords(
    childId: string,
    wordList: string[]
  ): Promise<{ newWords: string[]; totalWords: number }> {
    const existingWords = await this.getWordsByChild(childId);
    const existingWordSet = new Set(existingWords.map((w) => w.word.toLowerCase()));
    
    const newWords: string[] = [];
    const now = new Date();

    for (const word of wordList) {
      const lowerWord = word.toLowerCase();
      const existingWord = existingWords.find((w) => w.word.toLowerCase() === lowerWord);

      if (existingWord) {
        await db
          .update(words)
          .set({
            lastSeen: now,
            totalOccurrences: existingWord.totalOccurrences + 1,
            sessionsSeenCount: existingWord.sessionsSeenCount + 1,
          })
          .where(eq(words.id, existingWord.id));
      } else {
        await db.insert(words).values({
          childId,
          word: lowerWord,
          status: "new",
          totalOccurrences: 1,
          sessionsSeenCount: 1,
          masteryCorrectCount: 0,
          incorrectCount: 0,
        });
        newWords.push(lowerWord);
        existingWordSet.add(lowerWord);
      }
    }

    return {
      newWords,
      totalWords: wordList.length,
    };
  }

  // Preset Word Lists
  async getPresetWordLists(): Promise<PresetWordList[]> {
    return db.select().from(presetWordLists).orderBy(presetWordLists.sortOrder);
  }

  async getPresetWordList(id: string): Promise<PresetWordList | undefined> {
    const [list] = await db.select().from(presetWordLists).where(eq(presetWordLists.id, id));
    return list;
  }

  async createPresetWordList(list: InsertPresetWordList): Promise<PresetWordList> {
    const [created] = await db.insert(presetWordLists).values(list).returning();
    return created;
  }

  async seedPresetWordLists(lists: InsertPresetWordList[]): Promise<void> {
    const existing = await this.getPresetWordLists();
    if (existing.length === 0) {
      for (const list of lists) {
        await db.insert(presetWordLists).values(list);
      }
    }
  }

  // Books
  async getBooks(): Promise<Book[]> {
    return db.select().from(books).orderBy(books.title);
  }

  async getBooksByUser(userId: string): Promise<Book[]> {
    const userChildren = await this.getChildrenByUser(userId);
    const childIds = userChildren.map(c => c.id);
    
    const presetBooks = await this.getPresetBooks();
    
    if (childIds.length === 0) {
      return presetBooks;
    }
    
    const userBooks = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.isPreset, false),
          inArray(books.childId, childIds)
        )
      )
      .orderBy(books.title);
    
    return [...presetBooks, ...userBooks];
  }

  async getPresetBooks(): Promise<Book[]> {
    return db.select().from(books).where(eq(books.isPreset, true)).orderBy(books.title);
  }

  async getCustomBooks(): Promise<Book[]> {
    return db.select().from(books).where(eq(books.isPreset, false)).orderBy(books.title);
  }

  async getBook(id: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async getBookByTitle(title: string, childId?: string): Promise<Book | undefined> {
    const normalizedTitle = title.toLowerCase().trim();
    if (childId) {
      const childBooks = await db.select().from(books).where(
        and(eq(books.isPreset, false), eq(books.childId, childId))
      );
      return childBooks.find(b => b.title.toLowerCase().trim() === normalizedTitle);
    }
    const allBooks = await db.select().from(books).where(eq(books.isPreset, false));
    return allBooks.find(b => b.title.toLowerCase().trim() === normalizedTitle);
  }

  async createBook(book: InsertBook): Promise<Book> {
    const wordList = book.words || [];
    const normalizedWords = wordList.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
    const uniqueWords = Array.from(new Set(normalizedWords));
    const insertData: typeof books.$inferInsert = {
      title: book.title,
      childId: book.childId,
      gradeLevel: book.gradeLevel,
      author: book.author,
      description: book.description,
      coverImageUrl: book.coverImageUrl,
      customCoverUrl: book.customCoverUrl,
      isbn: book.isbn,
      sourceType: (book.sourceType || "parent") as "curated" | "teacher" | "parent" | "public_domain" | "community",
      contributedBy: book.contributedBy,
      contributorLabel: book.contributorLabel,
      words: uniqueWords,
      wordCount: uniqueWords.length,
      isPreset: false,
      isBeta: false,
    };
    const [created] = await db.insert(books).values(insertData).returning();
    
    // Trigger global word stats sync (non-blocking)
    this.syncGlobalWordStats().catch(err => console.error("Failed to sync global word stats:", err));
    
    return created;
  }

  async createPresetBook(book: PresetBookData): Promise<Book> {
    const wordList = book.words || [];
    const normalizedWords = wordList.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
    const uniqueWords = Array.from(new Set(normalizedWords));
    const [created] = await db.insert(books).values({
      title: book.title,
      author: book.author,
      gradeLevel: book.gradeLevel,
      words: uniqueWords,
      wordCount: uniqueWords.length,
      sourceType: "curated",
      approvalStatus: "approved",
      isPreset: true,
      isBeta: book.isBeta,
    }).returning();
    return created;
  }

  async updateBook(id: string, data: Partial<InsertBook>): Promise<Book | undefined> {
    const { words, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    
    if (words) {
      const normalizedWords = words.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
      const uniqueWords = Array.from(new Set(normalizedWords));
      updateData.words = uniqueWords;
      updateData.wordCount = uniqueWords.length;
    }
    const [updated] = await db
      .update(books)
      .set(updateData as Partial<Book>)
      .where(eq(books.id, id))
      .returning();
    
    // Trigger global word stats sync if words changed (non-blocking)
    if (words) {
      this.syncGlobalWordStats().catch(err => console.error("Failed to sync global word stats:", err));
    }
    
    return updated;
  }

  async appendWordsToBook(id: string, newWords: string[]): Promise<Book | undefined> {
    const book = await this.getBook(id);
    if (!book) return undefined;

    const normalizedNewWords = newWords.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
    const existingWords = book.words || [];
    const combinedWords = Array.from(new Set([...existingWords, ...normalizedNewWords]));
    
    const [updated] = await db
      .update(books)
      .set({
        words: combinedWords,
        wordCount: combinedWords.length,
      })
      .where(eq(books.id, id))
      .returning();
    
    // Trigger global word stats sync (non-blocking)
    this.syncGlobalWordStats().catch(err => console.error("Failed to sync global word stats:", err));
    
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
    
    // Trigger global word stats sync (non-blocking)
    this.syncGlobalWordStats().catch(err => console.error("Failed to sync global word stats:", err));
  }

  async updateBookCover(bookId: string, coverUrl: string, isbn?: string): Promise<Book | undefined> {
    const updateData: { coverImageUrl: string; isbn?: string } = { coverImageUrl: coverUrl };
    if (isbn) {
      updateData.isbn = isbn;
    }
    
    const [updated] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, bookId))
      .returning();
    
    return updated;
  }

  async findOrCreateBookByTitle(title: string, words: string[], childId: string): Promise<Book> {
    const existingBook = await this.getBookByTitle(title, childId);
    if (existingBook) {
      const updated = await this.appendWordsToBook(existingBook.id, words);
      return updated || existingBook;
    }
    return this.createBook({ title, words, childId });
  }

  async seedPresetBooks(bookList: PresetBookData[]): Promise<void> {
    const existing = await this.getPresetBooks();
    if (existing.length === 0) {
      for (const book of bookList) {
        await this.createPresetBook(book);
      }
    }
  }

  // Book Contributions (Community)
  async createBookContribution(data: {
    title: string;
    author?: string | null;
    isbn?: string | null;
    gradeLevel?: string | null;
    description?: string | null;
    words: string[];
    contributorLabel?: string | null;
    contributedBy: string;
    sourceType: "community";
    approvalStatus: "pending";
  }): Promise<Book> {
    const normalizedWords = data.words.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
    const uniqueWords = Array.from(new Set(normalizedWords));
    
    const [created] = await db.insert(books).values({
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      gradeLevel: data.gradeLevel,
      description: data.description,
      words: uniqueWords,
      wordCount: uniqueWords.length,
      sourceType: "community",
      approvalStatus: "pending",
      contributedBy: data.contributedBy,
      contributorLabel: data.contributorLabel,
      isPreset: false,
      isBeta: false,
    }).returning();
    return created;
  }

  async getPendingBookContributions(): Promise<Book[]> {
    return db
      .select()
      .from(books)
      .where(eq(books.approvalStatus, "pending"));
  }

  async approveBookContribution(bookId: string): Promise<Book | undefined> {
    const [updated] = await db
      .update(books)
      .set({
        approvalStatus: "approved" as const,
        isPreset: true,
      })
      .where(eq(books.id, bookId))
      .returning();
    return updated;
  }

  async rejectBookContribution(bookId: string): Promise<Book | undefined> {
    const [updated] = await db
      .update(books)
      .set({ approvalStatus: "rejected" })
      .where(eq(books.id, bookId))
      .returning();
    return updated;
  }

  // Book Progress & Readiness
  async getChildBookProgress(childId: string): Promise<ChildBookProgress[]> {
    return db
      .select()
      .from(childBookProgress)
      .where(eq(childBookProgress.childId, childId));
  }

  async calculateBookReadiness(childId: string): Promise<BookReadiness[]> {
    const allBooks = await this.getBooks();
    const childWords = await this.getWordsByChild(childId);
    const masteredWordSet = new Set(
      childWords
        .filter(w => w.status === "mastered")
        .map(w => w.word.toLowerCase())
    );

    const readiness: BookReadiness[] = [];

    for (const book of allBooks) {
      const bookWords = book.words.map(w => w.toLowerCase());
      const uniqueBookWords = Array.from(new Set(bookWords));
      const totalCount = uniqueBookWords.length;
      
      let masteredCount = 0;
      for (const word of uniqueBookWords) {
        if (masteredWordSet.has(word)) {
          masteredCount++;
        }
      }

      const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
      const isReady = percent >= 90;

      readiness.push({
        book,
        masteredCount,
        totalCount,
        percent,
        isReady,
      });
    }

    return readiness.sort((a, b) => b.percent - a.percent);
  }

  async updateChildBookProgress(childId: string, bookId: string): Promise<ChildBookProgress> {
    const book = await this.getBook(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const childWords = await this.getWordsByChild(childId);
    const masteredWordSet = new Set(
      childWords
        .filter(w => w.status === "mastered")
        .map(w => w.word.toLowerCase())
    );

    const bookWords = book.words.map(w => w.toLowerCase());
    const uniqueBookWords = Array.from(new Set(bookWords));
    const totalWordCount = uniqueBookWords.length;
    
    let masteredWordCount = 0;
    for (const word of uniqueBookWords) {
      if (masteredWordSet.has(word)) {
        masteredWordCount++;
      }
    }

    const readinessPercent = totalWordCount > 0 ? Math.round((masteredWordCount / totalWordCount) * 100) : 0;
    const isReady = readinessPercent >= 80;

    const existing = await db
      .select()
      .from(childBookProgress)
      .where(and(
        eq(childBookProgress.childId, childId),
        eq(childBookProgress.bookId, bookId)
      ));

    if (existing.length > 0) {
      const [updated] = await db
        .update(childBookProgress)
        .set({
          masteredWordCount,
          totalWordCount,
          readinessPercent,
          isReady,
          lastUpdated: new Date(),
        })
        .where(eq(childBookProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(childBookProgress)
        .values({
          childId,
          bookId,
          masteredWordCount,
          totalWordCount,
          readinessPercent,
          isReady,
        })
        .returning();
      return created;
    }
  }

  // Featured Book Methods
  async getFeaturedBook(): Promise<Book | undefined> {
    const now = new Date();
    const [featured] = await db
      .select()
      .from(books)
      .where(and(
        eq(books.isFeatured, true),
        eq(books.isPreset, true)
      ))
      .limit(1);
    
    if (featured && featured.featuredUntil && featured.featuredUntil > now) {
      return featured;
    }
    
    // If no valid featured book, return the most popular preset book
    const [popular] = await db
      .select()
      .from(books)
      .where(eq(books.isPreset, true))
      .orderBy(desc(books.unlockCount))
      .limit(1);
    
    return popular;
  }

  async setFeaturedBook(bookId: string, durationDays: number = 7): Promise<Book | undefined> {
    // First, unfeature all books
    await db
      .update(books)
      .set({ isFeatured: false, featuredUntil: null });
    
    // Then set the new featured book
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + durationDays);
    
    const [updated] = await db
      .update(books)
      .set({
        isFeatured: true,
        featuredUntil,
      })
      .where(eq(books.id, bookId))
      .returning();
    
    return updated;
  }

  // Book Unlock Tracking
  async recordBookUnlock(bookId: string, childId: string): Promise<boolean> {
    // Check if already unlocked by this child
    const existing = await db
      .select()
      .from(bookUnlocks)
      .where(and(
        eq(bookUnlocks.bookId, bookId),
        eq(bookUnlocks.childId, childId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return false; // Already unlocked
    }
    
    // Record the unlock
    await db.insert(bookUnlocks).values({ bookId, childId });
    
    // Increment the unlock count on the book
    await db
      .update(books)
      .set({
        unlockCount: sql`${books.unlockCount} + 1`,
      })
      .where(eq(books.id, bookId));
    
    return true;
  }

  async getBooksByPopularity(limit: number = 50): Promise<Book[]> {
    return db
      .select()
      .from(books)
      .where(eq(books.isPreset, true))
      .orderBy(desc(books.unlockCount))
      .limit(limit);
  }

  async getPopularPresetBooks(): Promise<Book[]> {
    return db
      .select()
      .from(books)
      .where(and(
        eq(books.isPreset, true),
        sql`${books.unlockCount} >= 1000`
      ))
      .orderBy(desc(books.unlockCount));
  }

  // Global Word Stats (leverage-based prioritization)
  // Algorithm: leverage_score = book_count × log(1 + total_occurrences)
  // This is computed and stored as an integer (multiplied by 1000 for precision)

  async syncGlobalWordStats(): Promise<void> {
    // Get ALL books (preset + user-created + community) for comprehensive stats
    const allBooks = await this.getBooks();
    
    // Build word frequency map
    const wordStats = new Map<string, { bookCount: number; totalOccurrences: number }>();
    
    for (const book of allBooks) {
      const bookWordSet = new Set<string>();
      
      for (const word of book.words) {
        const lowerWord = word.toLowerCase().trim();
        if (!lowerWord) continue;
        
        // Track book count (only count once per book)
        if (!bookWordSet.has(lowerWord)) {
          bookWordSet.add(lowerWord);
          const existing = wordStats.get(lowerWord) || { bookCount: 0, totalOccurrences: 0 };
          existing.bookCount++;
          wordStats.set(lowerWord, existing);
        }
        
        // Track total occurrences
        const existing = wordStats.get(lowerWord)!;
        existing.totalOccurrences++;
      }
    }
    
    // Get all existing stats to reconcile removals
    const existingStats = await db.select().from(globalWordStats);
    const existingWordsMap = new Map<string, string>(); // word -> id
    for (const stat of existingStats) {
      existingWordsMap.set(stat.word, stat.id);
    }
    
    const now = new Date();
    const wordsToKeep = new Set<string>();
    
    // Calculate leverage scores and upsert to database
    for (const [word, stats] of wordStats) {
      wordsToKeep.add(word);
      
      // leverage_score = book_count × log(1 + total_occurrences)
      // Multiply by 1000 to store as integer with precision
      const leverageScore = Math.round(stats.bookCount * Math.log(1 + stats.totalOccurrences) * 1000);
      
      const existingId = existingWordsMap.get(word);
      
      if (existingId) {
        await db
          .update(globalWordStats)
          .set({
            bookCount: stats.bookCount,
            totalOccurrences: stats.totalOccurrences,
            leverageScore,
            lastUpdated: now,
          })
          .where(eq(globalWordStats.id, existingId));
      } else {
        await db.insert(globalWordStats).values({
          word,
          bookCount: stats.bookCount,
          totalOccurrences: stats.totalOccurrences,
          leverageScore,
          lastUpdated: now,
        });
      }
    }
    
    // Remove stale stats for words no longer in any book
    for (const [word, id] of existingWordsMap) {
      if (!wordsToKeep.has(word)) {
        await db.delete(globalWordStats).where(eq(globalWordStats.id, id));
      }
    }
  }

  async getGlobalWordStats(word: string): Promise<GlobalWordStats | undefined> {
    const [stats] = await db
      .select()
      .from(globalWordStats)
      .where(eq(globalWordStats.word, word.toLowerCase()));
    return stats;
  }

  async getAllGlobalWordStats(): Promise<GlobalWordStats[]> {
    return db
      .select()
      .from(globalWordStats)
      .orderBy(desc(globalWordStats.leverageScore));
  }

  async getPrioritizedWordsForBook(bookId: string, childId: string): Promise<PrioritizedWord[]> {
    // 1. Get the book
    const book = await this.getBook(bookId);
    if (!book) {
      return [];
    }
    
    // 2. Get child's mastered words
    const childWords = await this.getWordsByChild(childId);
    const masteredWordSet = new Set(
      childWords
        .filter(w => w.status === "mastered")
        .map(w => w.word.toLowerCase())
    );
    
    // 3. Get unique words from the book (excluding mastered)
    const bookWords = book.words
      .map(w => w.toLowerCase().trim())
      .filter(w => w && !masteredWordSet.has(w));
    const uniqueBookWords = Array.from(new Set(bookWords));
    
    if (uniqueBookWords.length === 0) {
      return [];
    }
    
    // 4. Join with global_word_stats to get leverage scores
    const statsResult = await db
      .select()
      .from(globalWordStats)
      .where(inArray(globalWordStats.word, uniqueBookWords));
    
    const statsMap = new Map<string, GlobalWordStats>();
    for (const stat of statsResult) {
      statsMap.set(stat.word, stat);
    }
    
    // 5. Build prioritized list, sorted by leverage score (descending)
    const prioritizedWords: PrioritizedWord[] = uniqueBookWords.map(word => {
      const stats = statsMap.get(word);
      return {
        word,
        leverageScore: stats?.leverageScore ?? 0,
        bookCount: stats?.bookCount ?? 1,
        totalOccurrences: stats?.totalOccurrences ?? 1,
      };
    });
    
    // Sort by leverage score descending (highest priority first)
    prioritizedWords.sort((a, b) => b.leverageScore - a.leverageScore);
    
    return prioritizedWords;
  }

  // Child Added Presets
  async getChildAddedPresets(childId: string): Promise<Array<ChildAddedPreset & { preset: PresetWordList }>> {
    const results = await db
      .select({
        id: childAddedPresets.id,
        childId: childAddedPresets.childId,
        presetId: childAddedPresets.presetId,
        addedAt: childAddedPresets.addedAt,
        presetId2: presetWordLists.id,
        presetName: presetWordLists.name,
        presetCategory: presetWordLists.category,
        presetDescription: presetWordLists.description,
        presetWords: presetWordLists.words,
        presetGradeLevel: presetWordLists.gradeLevel,
        presetSortOrder: presetWordLists.sortOrder,
      })
      .from(childAddedPresets)
      .innerJoin(presetWordLists, eq(childAddedPresets.presetId, presetWordLists.id))
      .where(eq(childAddedPresets.childId, childId))
      .orderBy(desc(childAddedPresets.addedAt));
    
    // Transform flat result into nested structure
    return results.map(row => ({
      id: row.id,
      childId: row.childId,
      presetId: row.presetId,
      addedAt: row.addedAt,
      preset: {
        id: row.presetId2,
        name: row.presetName,
        category: row.presetCategory,
        description: row.presetDescription,
        words: row.presetWords,
        gradeLevel: row.presetGradeLevel,
        sortOrder: row.presetSortOrder,
      },
    }));
  }

  async addPresetToChild(childId: string, presetId: string): Promise<ChildAddedPreset> {
    const [added] = await db
      .insert(childAddedPresets)
      .values({ childId, presetId })
      .onConflictDoNothing()
      .returning();
    
    if (!added) {
      // Already exists, fetch it
      const [existing] = await db
        .select()
        .from(childAddedPresets)
        .where(and(
          eq(childAddedPresets.childId, childId),
          eq(childAddedPresets.presetId, presetId)
        ));
      return existing;
    }
    
    return added;
  }

  // Child Added Books
  async getChildAddedBooks(childId: string): Promise<Array<{ id: string; childId: string; bookId: string; addedAt: Date; book: Book }>> {
    const results = await db
      .select({
        id: childAddedBooks.id,
        childId: childAddedBooks.childId,
        bookId: childAddedBooks.bookId,
        addedAt: childAddedBooks.addedAt,
        bookId2: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCoverImageUrl: books.coverImageUrl,
        bookCustomCoverUrl: books.customCoverUrl,
        bookWords: books.words,
        bookIsPreset: books.isPreset,
        bookIsBeta: books.isBeta,
        bookGradeLevel: books.gradeLevel,
        bookIsbn: books.isbn,
        bookDescription: books.description,
        bookAmazonUrl: books.amazonUrl,
        bookBookshopUrl: books.bookshopUrl,
        bookContributorLabel: books.contributorLabel,
        bookUnlockCount: books.unlockCount,
      })
      .from(childAddedBooks)
      .innerJoin(books, eq(childAddedBooks.bookId, books.id))
      .where(eq(childAddedBooks.childId, childId))
      .orderBy(desc(childAddedBooks.addedAt));
    
    return results.map(row => ({
      id: row.id,
      childId: row.childId,
      bookId: row.bookId,
      addedAt: row.addedAt,
      book: {
        id: row.bookId2,
        title: row.bookTitle,
        author: row.bookAuthor,
        coverImageUrl: row.bookCoverImageUrl,
        customCoverUrl: row.bookCustomCoverUrl,
        words: row.bookWords,
        isPreset: row.bookIsPreset,
        isBeta: row.bookIsBeta,
        gradeLevel: row.bookGradeLevel,
        isbn: row.bookIsbn,
        description: row.bookDescription,
        amazonUrl: row.bookAmazonUrl,
        bookshopUrl: row.bookBookshopUrl,
        contributorLabel: row.bookContributorLabel,
        unlockCount: row.bookUnlockCount,
      },
    }));
  }

  async addBookToChild(childId: string, bookId: string): Promise<{ id: string; childId: string; bookId: string; addedAt: Date }> {
    const [added] = await db
      .insert(childAddedBooks)
      .values({ childId, bookId })
      .onConflictDoNothing()
      .returning();
    
    if (!added) {
      const [existing] = await db
        .select()
        .from(childAddedBooks)
        .where(and(
          eq(childAddedBooks.childId, childId),
          eq(childAddedBooks.bookId, bookId)
        ));
      return existing;
    }
    
    return added;
  }

  async isBookInChildLibrary(childId: string, bookId: string): Promise<boolean> {
    const [result] = await db
      .select({ id: childAddedBooks.id })
      .from(childAddedBooks)
      .where(and(
        eq(childAddedBooks.childId, childId),
        eq(childAddedBooks.bookId, bookId)
      ))
      .limit(1);
    return !!result;
  }

  // Anonymous Sessions & Analytics
  async initAnonymousSession(sessionId: string, userAgent?: string): Promise<AnonymousSession> {
    const now = new Date();
    
    const [existing] = await db
      .select()
      .from(anonymousSessions)
      .where(eq(anonymousSessions.id, sessionId));
    
    if (existing) {
      const [updated] = await db
        .update(anonymousSessions)
        .set({ lastActiveAt: now })
        .where(eq(anonymousSessions.id, sessionId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(anonymousSessions)
      .values({
        id: sessionId,
        userAgent: userAgent || null,
        firstSeenAt: now,
        lastActiveAt: now,
        lessonsCompleted: 0,
      })
      .returning();
    return created;
  }

  async incrementSessionLessons(sessionId: string): Promise<AnonymousSession | undefined> {
    const [updated] = await db
      .update(anonymousSessions)
      .set({
        lessonsCompleted: sql`${anonymousSessions.lessonsCompleted} + 1`,
        lastActiveAt: new Date(),
      })
      .where(eq(anonymousSessions.id, sessionId))
      .returning();
    return updated;
  }

  async linkSessionToUser(sessionId: string, userId: string): Promise<AnonymousSession | undefined> {
    const [updated] = await db
      .update(anonymousSessions)
      .set({
        userId,
        convertedAt: new Date(),
        lastActiveAt: new Date(),
      })
      .where(eq(anonymousSessions.id, sessionId))
      .returning();
    return updated;
  }

  async trackProductEvent(event: { sessionId: string; userId?: string | null; eventType: ProductEventType; eventData?: unknown }): Promise<ProductEvent> {
    const [created] = await db
      .insert(productEvents)
      .values({
        sessionId: event.sessionId,
        userId: event.userId || null,
        eventType: event.eventType,
        eventData: event.eventData || null,
      })
      .returning();
    
    await db
      .update(anonymousSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(anonymousSessions.id, event.sessionId));
    
    return created;
  }

  async getAnalyticsSummary(): Promise<{
    totalSessions: number;
    sessionsWithGames: number;
    sessionsWithLessonComplete: number;
    convertedSessions: number;
    eventCounts: Record<string, number>;
  }> {
    const [sessionStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        converted: sql<number>`count(${anonymousSessions.convertedAt})::int`,
        withLessons: sql<number>`count(case when ${anonymousSessions.lessonsCompleted} > 0 then 1 end)::int`,
      })
      .from(anonymousSessions);

    const gameEvents: ProductEventType[] = ["word_pop_started", "flashcards_started", "lava_letters_started"];
    const [gamesStat] = await db
      .select({
        count: sql<number>`count(distinct ${productEvents.sessionId})::int`,
      })
      .from(productEvents)
      .where(inArray(productEvents.eventType, gameEvents));

    const eventCounts = await db
      .select({
        eventType: productEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(productEvents)
      .groupBy(productEvents.eventType);

    return {
      totalSessions: sessionStats?.total || 0,
      sessionsWithGames: gamesStat?.count || 0,
      sessionsWithLessonComplete: sessionStats?.withLessons || 0,
      convertedSessions: sessionStats?.converted || 0,
      eventCounts: eventCounts.reduce((acc, row) => {
        acc[row.eventType] = row.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const storage = new DatabaseStorage();
