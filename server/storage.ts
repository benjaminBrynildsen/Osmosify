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
  children,
  readingSessions,
  words,
  presetWordLists,
  books,
  childBookProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Children
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
  getBook(id: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, data: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: string): Promise<void>;

  // Book Progress & Readiness
  getChildBookProgress(childId: string): Promise<ChildBookProgress[]>;
  calculateBookReadiness(childId: string): Promise<BookReadiness[]>;
  updateChildBookProgress(childId: string, bookId: string): Promise<ChildBookProgress>;
}

export class DatabaseStorage implements IStorage {
  // Children
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
    const [created] = await db.insert(words).values(word).returning();
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
        await db.insert(words).values([{
          childId,
          word: lowerWord,
          status: "new",
          totalOccurrences: 1,
          sessionsSeenCount: 1,
          masteryCorrectCount: 0,
          incorrectCount: 0,
        }]);
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

  async getBook(id: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const wordList = book.words || [];
    const [created] = await db.insert(books).values({
      ...book,
      wordCount: wordList.length,
    }).returning();
    return created;
  }

  async updateBook(id: string, data: Partial<InsertBook>): Promise<Book | undefined> {
    const updateData: Partial<Book> = { ...data };
    if (data.words) {
      updateData.wordCount = data.words.length;
    }
    const [updated] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning();
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
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
      const isReady = percent >= 80;

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
}

export const storage = new DatabaseStorage();
