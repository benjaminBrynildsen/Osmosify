import {
  type Child,
  type InsertChild,
  type ReadingSession,
  type InsertReadingSession,
  type Word,
  type InsertWord,
  children,
  readingSessions,
  words,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
