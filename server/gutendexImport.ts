import { db } from "./db";
import { books } from "@shared/schema";
import { eq } from "drizzle-orm";

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

const CURATED_BOOK_IDS = [
  11,    // Alice's Adventures in Wonderland
  55,    // The Wonderful Wizard of Oz
  16,    // Peter Pan
  17,    // The Adventures of Tom Sawyer
  74,    // The Adventures of Tom Sawyer (alternate)
  76,    // Adventures of Huckleberry Finn
  35,    // The Time Machine
  84,    // Frankenstein
  345,   // Dracula
  1661,  // The Adventures of Sherlock Holmes
  1342,  // Pride and Prejudice
  2701,  // Moby Dick
  1952,  // The Yellow Wallpaper
  2591,  // Grimm's Fairy Tales
  2142,  // The Jungle Book
  500,   // The Adventures of Pinocchio
  209,   // The Turn of the Screw
  32,    // Herland
  215,   // The Call of the Wild
  160,   // The Awakening
  236,   // The Jungle Book (alternate)
  514,   // Little Women
  766,   // David Copperfield
  1400,  // Great Expectations
  98,    // A Tale of Two Cities
  19942, // Candide
  2600,  // War and Peace (long - skip for now)
  4300,  // Ulysses (long - skip for now)
  1232,  // The Prince
  43,    // The Strange Case of Dr. Jekyll and Mr. Hyde
  174,   // The Picture of Dorian Gray
  120,   // Treasure Island
  45,    // Anne of Green Gables
  46,    // A Christmas Carol
  1260,  // Jane Eyre
  768,   // Wuthering Heights
  205,   // Walden
  2554,  // Crime and Punishment
  3207,  // Leviathan
  996,   // Don Quixote
  28054, // The Brothers Karamazov
  2814,  // Dubliners
];

const CHILDREN_BOOK_IDS = [
  11,    // Alice's Adventures in Wonderland - Lewis Carroll
  55,    // The Wonderful Wizard of Oz - L. Frank Baum
  16,    // Peter Pan - J. M. Barrie
  2591,  // Grimm's Fairy Tales - Brothers Grimm
  2142,  // The Jungle Book - Rudyard Kipling
  500,   // The Adventures of Pinocchio - Carlo Collodi
  120,   // Treasure Island - Robert Louis Stevenson
  45,    // Anne of Green Gables - L. M. Montgomery
  46,    // A Christmas Carol - Charles Dickens
  514,   // Little Women - Louisa May Alcott
  164,   // Twenty Thousand Leagues Under the Sea - Jules Verne
  103,   // Around the World in 80 Days - Jules Verne
  35997, // Black Beauty - Anna Sewell
  1184,  // The Count of Monte Cristo - Alexandre Dumas
  1257,  // The Three Musketeers - Alexandre Dumas
  844,   // The Importance of Being Earnest - Oscar Wilde
  1661,  // Adventures of Sherlock Holmes - Arthur Conan Doyle
  1952,  // The Yellow Wallpaper (short) - Charlotte Perkins Gilman
  215,   // The Call of the Wild - Jack London
  910,   // White Fang - Jack London
  74,    // Adventures of Tom Sawyer - Mark Twain
  76,    // Adventures of Huckleberry Finn - Mark Twain
  43,    // Dr. Jekyll and Mr. Hyde - Robert Louis Stevenson
  174,   // The Picture of Dorian Gray - Oscar Wilde
  19033, // A Little Princess - Frances Hodgson Burnett
  113,   // The Secret Garden - Frances Hodgson Burnett
  479,   // Little Lord Fauntleroy - Frances Hodgson Burnett
  18155, // The Wind in the Willows - Kenneth Grahame
];

async function fetchBookText(bookId: number): Promise<string | null> {
  const metadata = await fetchBookMetadata(bookId);
  if (!metadata) {
    console.log(`Failed to fetch metadata for book ${bookId}`);
    return null;
  }
  
  const textUrl = metadata.formats["text/plain; charset=utf-8"] 
               || metadata.formats["text/plain; charset=us-ascii"]
               || metadata.formats["text/plain"];
  
  if (!textUrl) {
    console.log(`No plain text format for book ${bookId}: ${metadata.title}`);
    return null;
  }
  
  console.log(`Fetching text for: ${metadata.title}`);
  const textResponse = await fetchWithRetry(textUrl);
  if (!textResponse) {
    console.log(`Failed to fetch text for book ${bookId}`);
    return null;
  }
  
  try {
    return await textResponse.text();
  } catch (error) {
    console.error(`Error reading text for book ${bookId}:`, error);
    return null;
  }
}

function extractWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(w => w.length > 0 && w.length < 30);
  
  const uniqueWords = Array.from(new Set(words));
  return uniqueWords;
}

function determineGradeLevel(wordCount: number): string {
  if (wordCount < 200) return "Preschool";
  if (wordCount < 500) return "Kindergarten";
  if (wordCount < 1000) return "1st Grade";
  if (wordCount < 2000) return "2nd Grade";
  if (wordCount < 3000) return "3rd Grade";
  if (wordCount < 5000) return "4th Grade";
  return "5th Grade+";
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 429) {
        console.log(`Rate limited, waiting ${(i + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }
      return null;
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchBookMetadata(bookId: number): Promise<GutendexBook | null> {
  const response = await fetchWithRetry(`https://gutendex.com/books/${bookId}`);
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function importGutendexBooks(): Promise<{ imported: number; skipped: number; errors: number }> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log(`Starting import of ${CHILDREN_BOOK_IDS.length} books from Project Gutenberg...`);
  
  for (const bookId of CHILDREN_BOOK_IDS) {
    try {
      const existingBooks = await db.select()
        .from(books)
        .where(eq(books.sourceType, "public_domain"));
      
      const metadata = await fetchBookMetadata(bookId);
      if (!metadata) {
        console.log(`Skipping book ${bookId}: couldn't fetch metadata`);
        errors++;
        continue;
      }
      
      const alreadyExists = existingBooks.some(b => 
        b.title.toLowerCase().includes(metadata.title.toLowerCase().substring(0, 30)) ||
        metadata.title.toLowerCase().includes(b.title.toLowerCase().substring(0, 30))
      );
      
      if (alreadyExists) {
        console.log(`Skipping: ${metadata.title} (already exists)`);
        skipped++;
        continue;
      }
      
      const text = await fetchBookText(bookId);
      if (!text) {
        errors++;
        continue;
      }
      
      const words = extractWords(text);
      const author = metadata.authors[0]?.name || "Unknown";
      const gradeLevel = determineGradeLevel(words.length);
      
      const coverUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.cover.medium.jpg`;
      
      await db.insert(books).values({
        title: metadata.title,
        author: author,
        gradeLevel: gradeLevel,
        description: metadata.subjects.slice(0, 3).join(", "),
        words: words,
        wordCount: words.length,
        isPreset: true,
        isBeta: false,
        coverImageUrl: coverUrl,
        sourceType: "public_domain",
        approvalStatus: "approved",
      });
      
      console.log(`Imported: ${metadata.title} (${words.length} unique words)`);
      imported++;
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`Error importing book ${bookId}:`, error);
      errors++;
    }
  }
  
  console.log(`\nImport complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
  return { imported, skipped, errors };
}

export async function syncGlobalWordStatsAfterImport(): Promise<void> {
  console.log("Syncing global word stats after import...");
  const { storage } = await import("./storage");
  await storage.syncGlobalWordStats();
  console.log("Global word stats synced.");
}
