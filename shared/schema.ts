import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Word status enum
export type WordStatus = "new" | "learning" | "mastered";

// Import users table for foreign key reference
import { users } from "./models/auth";

// Voice options for TTS
export type VoiceOption = "alloy" | "nova" | "shimmer";

// Children profiles
export const children = pgTable("children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gradeLevel: text("grade_level"),
  stopWordsEnabled: boolean("stop_words_enabled").notNull().default(false),
  gradeLevelFilterEnabled: boolean("grade_level_filter_enabled").notNull().default(false),
  masteryThreshold: integer("mastery_threshold").notNull().default(4),
  deckSize: integer("deck_size").notNull().default(4),
  timerSeconds: integer("timer_seconds").notNull().default(7),
  demoteOnMiss: boolean("demote_on_miss").notNull().default(true),
  voicePreference: text("voice_preference").notNull().default("shimmer").$type<VoiceOption>(),
  sentencesRead: integer("sentences_read").notNull().default(0),
});

export const childrenRelations = relations(children, ({ many }) => ({
  sessions: many(readingSessions),
  words: many(words),
}));

// Reading sessions
export const readingSessions = pgTable("reading_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  bookId: varchar("book_id"),
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

// Preset word lists (built-in lists like alphabet, CVC, sight words)
export const presetWordLists = pgTable("preset_word_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // "alphabet", "phonics", "cvc", "sight_words"
  description: text("description"),
  words: text("words").array().notNull().default(sql`ARRAY[]::text[]`),
  gradeLevel: text("grade_level"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertPresetWordListSchema = createInsertSchema(presetWordLists).omit({
  id: true,
});

export type InsertPresetWordList = z.infer<typeof insertPresetWordListSchema>;
export type PresetWordList = typeof presetWordLists.$inferSelect;

// Source type for books
export type BookSourceType = "curated" | "teacher" | "parent" | "public_domain" | "community";

// Approval status for community contributions
export type BookApprovalStatus = "pending" | "approved" | "rejected";

// Books with word lists for readiness tracking
export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").references(() => children.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  gradeLevel: text("grade_level"),
  description: text("description"),
  words: text("words").array().notNull().default(sql`ARRAY[]::text[]`),
  wordCount: integer("word_count").notNull().default(0),
  isPreset: boolean("is_preset").notNull().default(false),
  isBeta: boolean("is_beta").notNull().default(false),
  coverImageUrl: text("cover_image_url"),
  customCoverUrl: text("custom_cover_url"),
  isbn: text("isbn"),
  amazonUrl: text("amazon_url"),
  bookshopUrl: text("bookshop_url"),
  sourceType: text("source_type").notNull().default("parent").$type<BookSourceType>(),
  popularityCount: integer("popularity_count").notNull().default(0),
  unlockCount: integer("unlock_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredUntil: timestamp("featured_until"),
  approvalStatus: text("approval_status").default("approved").$type<BookApprovalStatus>(),
  contributedBy: varchar("contributed_by").references(() => users.id),
  contributorLabel: text("contributor_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const booksRelations = relations(books, ({ one }) => ({
  child: one(children, {
    fields: [books.childId],
    references: [children.id],
  }),
  contributor: one(users, {
    fields: [books.contributedBy],
    references: [users.id],
  }),
}));

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  wordCount: true,
  isPreset: true,
  isBeta: true,
  popularityCount: true,
  approvalStatus: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

// Track which books a child is working toward
export const childBookProgress = pgTable("child_book_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  masteredWordCount: integer("mastered_word_count").notNull().default(0),
  totalWordCount: integer("total_word_count").notNull().default(0),
  readinessPercent: integer("readiness_percent").notNull().default(0),
  isReady: boolean("is_ready").notNull().default(false),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const childBookProgressRelations = relations(childBookProgress, ({ one }) => ({
  child: one(children, {
    fields: [childBookProgress.childId],
    references: [children.id],
  }),
  book: one(books, {
    fields: [childBookProgress.bookId],
    references: [books.id],
  }),
}));

export const insertChildBookProgressSchema = createInsertSchema(childBookProgress).omit({
  id: true,
  lastUpdated: true,
});

export type InsertChildBookProgress = z.infer<typeof insertChildBookProgressSchema>;
export type ChildBookProgress = typeof childBookProgress.$inferSelect;

// Track book unlocks globally (for popularity counting)
export const bookUnlocks = pgTable("book_unlocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("book_unlocks_book_child_idx").on(table.bookId, table.childId),
]);

export const bookUnlocksRelations = relations(bookUnlocks, ({ one }) => ({
  book: one(books, {
    fields: [bookUnlocks.bookId],
    references: [books.id],
  }),
  child: one(children, {
    fields: [bookUnlocks.childId],
    references: [children.id],
  }),
}));

export const insertBookUnlockSchema = createInsertSchema(bookUnlocks).omit({
  id: true,
  unlockedAt: true,
});

export type InsertBookUnlock = z.infer<typeof insertBookUnlockSchema>;
export type BookUnlock = typeof bookUnlocks.$inferSelect;

// Track which preset word lists a child has added to their library
export const childAddedPresets = pgTable("child_added_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  presetId: varchar("preset_id").notNull().references(() => presetWordLists.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("child_added_presets_child_preset_idx").on(table.childId, table.presetId),
]);

export const childAddedPresetsRelations = relations(childAddedPresets, ({ one }) => ({
  child: one(children, {
    fields: [childAddedPresets.childId],
    references: [children.id],
  }),
  preset: one(presetWordLists, {
    fields: [childAddedPresets.presetId],
    references: [presetWordLists.id],
  }),
}));

export const insertChildAddedPresetSchema = createInsertSchema(childAddedPresets).omit({
  id: true,
  addedAt: true,
});

export type InsertChildAddedPreset = z.infer<typeof insertChildAddedPresetSchema>;
export type ChildAddedPreset = typeof childAddedPresets.$inferSelect;

// Track which books a child has added to their library
export const childAddedBooks = pgTable("child_added_books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("child_added_books_child_book_idx").on(table.childId, table.bookId),
]);

export const childAddedBooksRelations = relations(childAddedBooks, ({ one }) => ({
  child: one(children, {
    fields: [childAddedBooks.childId],
    references: [children.id],
  }),
  book: one(books, {
    fields: [childAddedBooks.bookId],
    references: [books.id],
  }),
}));

export const insertChildAddedBookSchema = createInsertSchema(childAddedBooks).omit({
  id: true,
  addedAt: true,
});

export type InsertChildAddedBook = z.infer<typeof insertChildAddedBookSchema>;
export type ChildAddedBook = typeof childAddedBooks.$inferSelect;

// Global word statistics for leverage-based prioritization
// Tracks word frequency across ALL books in the library
export const globalWordStats = pgTable("global_word_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull().unique(),
  bookCount: integer("book_count").notNull().default(0),
  totalOccurrences: integer("total_occurrences").notNull().default(0),
  leverageScore: integer("leverage_score").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertGlobalWordStatsSchema = createInsertSchema(globalWordStats).omit({
  id: true,
  lastUpdated: true,
});

export type InsertGlobalWordStats = z.infer<typeof insertGlobalWordStatsSchema>;
export type GlobalWordStats = typeof globalWordStats.$inferSelect;

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

// Book readiness type for frontend
export interface BookReadiness {
  book: Book;
  masteredCount: number;
  totalCount: number;
  percent: number;
  isReady: boolean;
}

// Prioritized word with leverage score for the priority queue
export interface PrioritizedWord {
  word: string;
  leverageScore: number;
  bookCount: number;
  totalOccurrences: number;
}
