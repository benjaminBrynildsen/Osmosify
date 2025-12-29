import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Word status enum
export type WordStatus = "new" | "learning" | "mastered";

// Children profiles
export const children = pgTable("children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  gradeLevel: text("grade_level"),
  stopWordsEnabled: boolean("stop_words_enabled").notNull().default(false),
  gradeLevelFilterEnabled: boolean("grade_level_filter_enabled").notNull().default(false),
  masteryThreshold: integer("mastery_threshold").notNull().default(7),
  deckSize: integer("deck_size").notNull().default(7),
  demoteOnMiss: boolean("demote_on_miss").notNull().default(true),
});

export const childrenRelations = relations(children, ({ many }) => ({
  sessions: many(readingSessions),
  words: many(words),
}));

// Reading sessions
export const readingSessions = pgTable("reading_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  bookTitle: text("book_title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  imageUrls: text("image_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  extractedText: text("extracted_text"),
  cleanedText: text("cleaned_text"),
  newWordsCount: integer("new_words_count").notNull().default(0),
  totalWordsCount: integer("total_words_count").notNull().default(0),
});

export const readingSessionsRelations = relations(readingSessions, ({ one }) => ({
  child: one(children, {
    fields: [readingSessions.childId],
    references: [children.id],
  }),
}));

// Word library per child
export const words = pgTable("words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  totalOccurrences: integer("total_occurrences").notNull().default(1),
  sessionsSeenCount: integer("sessions_seen_count").notNull().default(1),
  status: text("status").notNull().default("new").$type<WordStatus>(),
  masteryCorrectCount: integer("mastery_correct_count").notNull().default(0),
  incorrectCount: integer("incorrect_count").notNull().default(0),
  lastTested: timestamp("last_tested"),
});

export const wordsRelations = relations(words, ({ one }) => ({
  child: one(children, {
    fields: [words.childId],
    references: [children.id],
  }),
}));

// Insert schemas
export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
});

export const insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
  createdAt: true,
});

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
  firstSeen: true,
  lastSeen: true,
  lastTested: true,
});

// Types
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;

export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type ReadingSession = typeof readingSessions.$inferSelect;

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

// Flashcard result type for frontend
export interface FlashcardResult {
  wordId: string;
  word: string;
  isCorrect: boolean;
}

// Session insights type
export interface SessionInsights {
  newWordsCount: number;
  totalWordsCount: number;
  newWords: string[];
  topRepeatedWords: { word: string; count: number }[];
}
