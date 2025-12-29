// Common English stop words
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
  "to", "was", "were", "will", "with", "the", "this", "but", "they",
  "have", "had", "what", "when", "where", "who", "which", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "just", "can", "should", "now", "i", "you", "your", "we", "our",
  "me", "my", "him", "his", "her", "she", "them", "their", "us", "am",
  "been", "being", "do", "does", "did", "doing", "would", "could", "might",
  "must", "shall", "may", "here", "there", "if", "then", "else", "or",
  "because", "about", "into", "through", "during", "before", "after",
  "above", "below", "up", "down", "out", "off", "over", "under", "again",
  "further", "once", "any", "also", "even", "still", "yet", "although",
  "however", "either", "neither", "while", "until", "unless", "since",
  "whether", "between", "against", "without", "within", "along", "across",
  "behind", "beyond", "around", "among", "upon", "toward", "towards",
  "throughout", "despite", "unless", "oh", "yeah", "yes", "no", "ok",
  "get", "got", "go", "goes", "going", "went", "come", "came", "coming",
  "make", "made", "making", "take", "took", "taking", "see", "saw", "seeing",
  "know", "knew", "knowing", "think", "thought", "thinking", "want", "wanted",
  "say", "said", "saying", "look", "looked", "looking", "use", "used", "using",
  "find", "found", "finding", "give", "gave", "giving", "tell", "told", "telling",
  "ask", "asked", "asking", "seem", "seemed", "leave", "left", "put",
  "keep", "kept", "let", "begin", "began", "help", "show", "showed",
  "hear", "heard", "play", "run", "ran", "move", "live", "lived", "believe",
  "hold", "held", "bring", "brought", "happen", "happened", "write", "wrote",
  "sit", "sat", "stand", "stood", "lose", "lost", "pay", "paid", "meet", "met",
  "include", "included", "continue", "continued", "set", "learn", "learned",
  "change", "changed", "lead", "led", "understand", "understood", "watch", "watched",
  "follow", "followed", "stop", "stopped", "create", "created", "speak", "spoke",
  "read", "allow", "allowed", "add", "added", "spend", "spent", "grow", "grew",
  "open", "opened", "walk", "walked", "win", "won", "offer", "offered",
  "remember", "remembered", "love", "loved", "consider", "considered", "appear",
  "appeared", "buy", "bought", "wait", "waited", "serve", "served", "die", "died",
  "send", "sent", "expect", "expected", "build", "built", "stay", "stayed",
  "fall", "fell", "cut", "reach", "reached", "kill", "killed", "remain", "remained"
]);

// Grade-level appropriate words (simplified - words common in children's books)
const GRADE_LEVEL_WORDS = new Set([
  // Common children's book vocabulary
  "happy", "sad", "big", "small", "little", "good", "bad", "fast", "slow",
  "friend", "family", "home", "school", "play", "game", "story", "book",
  "animal", "dog", "cat", "bird", "fish", "bear", "rabbit", "mouse",
  "tree", "flower", "sun", "moon", "star", "rain", "snow", "wind",
  "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown",
  "mom", "dad", "brother", "sister", "baby", "boy", "girl", "child",
  "food", "water", "milk", "bread", "fruit", "apple", "banana",
  "car", "bus", "train", "plane", "boat", "bike", "truck",
  "house", "room", "door", "window", "bed", "chair", "table",
  "morning", "night", "day", "week", "year", "time", "today",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "first", "last", "next", "new", "old", "young",
  "laugh", "cry", "smile", "dance", "sing", "jump", "climb", "swim",
  "eat", "drink", "sleep", "wake", "talk", "listen", "learn", "teach",
  "kind", "brave", "strong", "gentle", "quiet", "loud", "silly", "funny",
  "birthday", "party", "present", "cake", "candy", "toy", "ball",
  "princess", "prince", "king", "queen", "castle", "dragon", "magic",
  "adventure", "treasure", "secret", "dream", "wish", "hope", "love"
]);

export interface ProcessedText {
  cleanedText: string;
  words: string[];
  wordFrequencies: Map<string, number>;
}

export function processText(
  rawText: string,
  options: {
    filterStopWords?: boolean;
    filterByGradeLevel?: boolean;
  } = {}
): ProcessedText {
  const { filterStopWords = true, filterByGradeLevel = false } = options;

  // Clean up the text
  let cleanedText = rawText
    // Remove common OCR artifacts
    .replace(/[|\\/_~`@#$%^&*()+=\[\]{}:;"'<>]/g, " ")
    // Remove page numbers (common pattern)
    .replace(/^\d+$/gm, "")
    .replace(/^page\s*\d+$/gim, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove very short lines (likely headers/footers)
    .split("\n")
    .filter((line) => line.trim().length > 3)
    .join("\n")
    .trim();

  // Extract words
  const wordPattern = /[a-zA-Z]{2,}/g;
  const allWords = cleanedText.match(wordPattern) || [];

  // Calculate frequencies
  const wordFrequencies = new Map<string, number>();
  for (const word of allWords) {
    const lower = word.toLowerCase();
    wordFrequencies.set(lower, (wordFrequencies.get(lower) || 0) + 1);
  }

  // Filter words
  let filteredWords = Array.from(wordFrequencies.keys());

  if (filterStopWords) {
    filteredWords = filteredWords.filter((word) => !STOP_WORDS.has(word));
  }

  if (filterByGradeLevel) {
    filteredWords = filteredWords.filter((word) => GRADE_LEVEL_WORDS.has(word));
  }

  // Remove very short words (less than 3 characters)
  filteredWords = filteredWords.filter((word) => word.length >= 3);

  return {
    cleanedText,
    words: filteredWords,
    wordFrequencies,
  };
}

export function getTopRepeatedWords(
  wordFrequencies: Map<string, number>,
  limit: number = 10
): { word: string; count: number }[] {
  return Array.from(wordFrequencies.entries())
    .filter(([word]) => word.length >= 3 && !STOP_WORDS.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
