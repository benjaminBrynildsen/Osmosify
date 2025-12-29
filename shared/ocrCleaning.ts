// Shared OCR text cleaning utilities
// Used both client-side (after Tesseract) and server-side (for validation)

// Common English words that should always be kept
const COMMON_WORDS = new Set([
  // Articles, pronouns, prepositions
  "a", "an", "the", "i", "we", "you", "he", "she", "it", "they", "me", "us",
  "my", "our", "your", "his", "her", "its", "their", "this", "that", "these",
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "down",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "can", "may",
  "and", "or", "but", "if", "so", "as", "no", "not", "all", "each", "every",
  
  // Common verbs
  "go", "goes", "went", "going", "come", "came", "coming", "see", "saw",
  "look", "looked", "want", "wanted", "know", "knew", "think", "thought",
  "make", "made", "take", "took", "get", "got", "give", "gave", "find", "found",
  "tell", "told", "say", "said", "ask", "asked", "use", "used", "try", "tried",
  "call", "called", "need", "needed", "feel", "felt", "become", "became",
  "leave", "left", "put", "keep", "kept", "let", "begin", "began", "seem",
  "help", "helped", "show", "showed", "hear", "heard", "play", "played",
  "run", "ran", "move", "moved", "live", "lived", "believe", "believed",
  
  // Common nouns
  "thing", "things", "place", "places", "time", "times", "day", "days",
  "way", "ways", "man", "men", "woman", "women", "child", "children",
  "world", "life", "hand", "hands", "part", "parts", "year", "years",
  "eye", "eyes", "head", "heads", "face", "side", "house", "home",
  "night", "room", "friend", "friends", "word", "words", "water", "food",
  
  // Common adjectives
  "good", "bad", "new", "old", "big", "small", "little", "great", "high",
  "long", "young", "own", "same", "right", "left", "last", "next", "first",
  "few", "most", "other", "only", "just", "more", "back", "still", "well",
  "such", "even", "also", "very", "much", "too", "here", "there", "now", "then",
  
  // Space/planet related words (for this specific book)
  "space", "planet", "planets", "earth", "mars", "jupiter", "saturn", "venus",
  "mercury", "neptune", "uranus", "sun", "moon", "star", "stars", "sky",
  "red", "blue", "cold", "hot", "dusty", "dry", "giant", "ball", "gases",
  "swirling", "surface", "solid", "ground", "air", "smells", "rotten", "eggs",
  "visit", "smallest", "largest", "sideways", "spins", "colored", "dark",
  "miss", "headed", "fly", "past", "round", "hear", "something", "fun",
  
  // More common words
  "like", "about", "into", "over", "after", "two", "one", "three", "four", "five",
  "called", "only", "know", "around", "think", "friends"
]);

// Fix common OCR digit-to-letter mistakes
function fixOcrMistakes(text: string): string {
  return text
    // Fix digits surrounded by letters
    .replace(/([a-zA-Z])0([a-zA-Z])/g, '$1o$2')
    .replace(/([a-zA-Z])1([a-zA-Z])/g, '$1l$2')
    .replace(/([a-zA-Z])5([a-zA-Z])/g, '$1s$2')
    .replace(/([a-zA-Z])8([a-zA-Z])/g, '$1b$2')
    // Common OCR mistakes
    .replace(/\brn\b/g, 'm')
    .replace(/\bvv\b/g, 'w');
}

// Check if a line has enough letter content to be meaningful
function hasGoodLetterDensity(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;
  
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const density = letters / trimmed.length;
  
  // Require at least 60% letters for lines with content
  return density >= 0.6 || (letters >= 10 && density >= 0.4);
}

// Check if a word looks valid (basic heuristics)
function isValidWord(word: string): boolean {
  const lower = word.toLowerCase();
  
  // Length check
  if (lower.length < 2 || lower.length > 20) return false;
  
  // Must be all letters
  if (!/^[a-z]+$/i.test(lower)) return false;
  
  // Known common words are always valid
  if (COMMON_WORDS.has(lower)) return true;
  
  // For unknown words, apply stricter rules
  if (lower.length < 3) return false;
  
  // Must have at least one vowel
  if (!/[aeiouy]/i.test(lower)) return false;
  
  // No triple identical characters
  if (/(.)\1\1/.test(lower)) return false;
  
  // No more than 4 consonants in a row
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(lower)) return false;
  
  // Avoid all-consonant strings
  if (/^[bcdfghjklmnpqrstvwxz]+$/i.test(lower)) return false;
  
  return true;
}

// Clean a single line of OCR text
function cleanLine(line: string): string {
  // Remove obvious garbage patterns
  let cleaned = line
    // Remove sequences of symbols and numbers
    .replace(/[^a-zA-Z\s'.,!?-]+/g, ' ')
    // Remove standalone single characters (except I and a)
    .replace(/\b[b-hj-z]\b/gi, ' ')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract and filter words
  const words = cleaned.split(/\s+/).filter(w => isValidWord(w));
  
  return words.join(' ');
}

/**
 * Clean raw OCR text to remove garbage and keep only valid words/sentences
 */
export function cleanOcrText(rawText: string): string {
  // Step 1: Normalize unicode
  let text = rawText
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
  
  // Step 2: Fix hyphenated line breaks
  text = text.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');
  
  // Step 3: Fix OCR digit mistakes
  text = fixOcrMistakes(text);
  
  // Step 4: Process line by line
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // Skip lines with poor letter density
    if (!hasGoodLetterDensity(line)) continue;
    
    const cleaned = cleanLine(line);
    if (cleaned.length >= 3) {
      cleanedLines.push(cleaned);
    }
  }
  
  // Step 5: Deduplicate consecutive identical lines
  const dedupedLines: string[] = [];
  for (const line of cleanedLines) {
    if (dedupedLines.length === 0 || dedupedLines[dedupedLines.length - 1] !== line) {
      dedupedLines.push(line);
    }
  }
  
  return dedupedLines.join('\n');
}

/**
 * Extract unique candidate words from cleaned text
 */
export function extractCandidateWords(cleanedText: string): string[] {
  const wordPattern = /[a-zA-Z]+/g;
  const words = cleanedText.match(wordPattern) || [];
  
  // Filter and deduplicate
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!seen.has(lower) && isValidWord(word)) {
      seen.add(lower);
      result.push(lower);
    }
  }
  
  return result;
}

/**
 * Calculate how much of the text was cleaned (for warning purposes)
 */
export function getCleaningStats(rawText: string, cleanedText: string): {
  rawWordCount: number;
  cleanedWordCount: number;
  percentageKept: number;
} {
  const rawWords = (rawText.match(/\S+/g) || []).length;
  const cleanedWords = (cleanedText.match(/\S+/g) || []).length;
  
  return {
    rawWordCount: rawWords,
    cleanedWordCount: cleanedWords,
    percentageKept: rawWords > 0 ? Math.round((cleanedWords / rawWords) * 100) : 0,
  };
}
