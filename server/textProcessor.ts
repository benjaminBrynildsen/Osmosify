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

// Basic English dictionary - common words for children's reading
const ENGLISH_WORDS = new Set([
  // Space and science words
  "space", "planet", "planets", "earth", "mars", "jupiter", "saturn", "venus",
  "mercury", "neptune", "uranus", "pluto", "sun", "moon", "star", "stars", "galaxy",
  "orbit", "solar", "system", "rocket", "astronaut", "alien", "comet", "asteroid",
  "gravity", "atmosphere", "universe", "cosmic", "crater", "telescope", "satellite",
  "dusty", "cold", "dry", "giant", "ball", "gases", "gas", "swirling", "surface",
  "solid", "ground", "air", "smells", "bad", "rotten", "eggs", "visit", "smallest",
  "largest", "sideways", "spins", "colored", "dark", "miss", "headed", "fly", "past",
  "round", "hear", "something", "fun", "friends", "friend", "thing", "things", "one", "two",
  "seussian", "literally", "called", "only", "know", "place", "life", "around",
  // Common nouns
  "cat", "dog", "bird", "fish", "bear", "rabbit", "mouse", "horse", "cow", "pig",
  "duck", "chicken", "sheep", "goat", "deer", "fox", "wolf", "lion", "tiger", "elephant",
  "monkey", "snake", "frog", "turtle", "butterfly", "bee", "ant", "spider",
  "tree", "flower", "grass", "leaf", "branch", "root", "seed", "plant", "garden", "forest",
  "sun", "moon", "star", "sky", "cloud", "rain", "snow", "wind", "storm", "rainbow",
  "water", "river", "lake", "ocean", "sea", "beach", "sand", "rock", "mountain", "hill",
  "house", "home", "room", "door", "window", "wall", "floor", "roof", "bed", "chair",
  "table", "desk", "lamp", "book", "page", "story", "picture", "game", "toy", "ball",
  "mom", "dad", "mother", "father", "brother", "sister", "baby", "family", "friend", "boy",
  "girl", "child", "children", "man", "woman", "people", "person", "teacher", "doctor",
  "food", "bread", "milk", "water", "juice", "apple", "banana", "orange", "grape", "berry",
  "cake", "cookie", "candy", "ice", "cream", "cheese", "egg", "meat", "fish", "chicken",
  "car", "bus", "train", "plane", "boat", "bike", "truck", "wheel", "road", "street",
  "school", "class", "lesson", "test", "paper", "pencil", "pen", "crayon", "color",
  "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white",
  "gray", "gold", "silver", "light", "dark", "bright", "color", "colors",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "first", "second", "third", "last", "next", "number", "count", "many", "few",
  "morning", "afternoon", "evening", "night", "day", "week", "month", "year", "today",
  "yesterday", "tomorrow", "time", "hour", "minute", "clock", "watch",
  // Common verbs
  "eat", "drink", "sleep", "wake", "walk", "run", "jump", "climb", "swim", "fly",
  "sit", "stand", "lie", "fall", "rise", "push", "pull", "throw", "catch", "kick",
  "hit", "cut", "break", "fix", "build", "draw", "paint", "write", "read", "spell",
  "count", "add", "sing", "dance", "play", "laugh", "cry", "smile", "frown", "talk",
  "listen", "hear", "see", "look", "watch", "smell", "taste", "touch", "feel", "think",
  "learn", "teach", "try", "work", "rest", "clean", "wash", "cook", "bake", "grow",
  "plant", "water", "feed", "care", "love", "like", "want", "need", "wish", "hope",
  "dream", "imagine", "pretend", "believe", "remember", "forget", "start", "stop", "finish",
  // Common adjectives
  "big", "small", "little", "large", "tiny", "huge", "tall", "short", "long", "wide",
  "thin", "thick", "fat", "skinny", "round", "square", "flat", "soft", "hard", "smooth",
  "rough", "wet", "dry", "hot", "cold", "warm", "cool", "new", "old", "young",
  "fast", "slow", "quick", "loud", "quiet", "noisy", "silent", "happy", "sad", "angry",
  "scared", "brave", "shy", "kind", "mean", "nice", "good", "bad", "best", "worst",
  "pretty", "beautiful", "ugly", "clean", "dirty", "neat", "messy", "full", "empty", "hungry",
  "thirsty", "tired", "sleepy", "awake", "sick", "healthy", "strong", "weak", "smart", "silly",
  "funny", "serious", "true", "false", "real", "fake", "same", "different", "special", "normal",
  // Common adverbs and prepositions
  "always", "never", "sometimes", "often", "usually", "today", "tomorrow", "yesterday",
  "soon", "later", "now", "then", "here", "there", "where", "everywhere", "somewhere",
  "inside", "outside", "above", "below", "beside", "behind", "between", "under", "over",
  "near", "far", "close", "away", "together", "alone", "apart",
  // Story words
  "once", "upon", "time", "long", "ago", "lived", "ever", "after", "end", "beginning",
  "middle", "chapter", "title", "author", "character", "hero", "villain", "princess", "prince",
  "king", "queen", "castle", "kingdom", "dragon", "magic", "spell", "wish", "adventure",
  "treasure", "secret", "mystery", "problem", "answer", "question", "idea", "plan",
  // Nature and seasons
  "spring", "summer", "fall", "autumn", "winter", "season", "weather", "sunny", "cloudy",
  "rainy", "snowy", "windy", "foggy", "stormy", "thunder", "lightning",
  // Body parts
  "head", "hair", "face", "eye", "eyes", "ear", "ears", "nose", "mouth", "teeth", "tooth",
  "tongue", "neck", "shoulder", "arm", "arms", "hand", "hands", "finger", "fingers",
  "leg", "legs", "foot", "feet", "toe", "toes", "body", "heart", "brain",
  // Clothing
  "shirt", "pants", "dress", "skirt", "shoes", "socks", "hat", "coat", "jacket", "sweater",
  // More common words
  "thing", "things", "something", "nothing", "everything", "anything", "someone", "anyone",
  "everyone", "nobody", "place", "way", "world", "life", "part", "name", "word", "words",
  "sentence", "letter", "letters", "sound", "voice", "music", "song", "movie", "show",
  "party", "birthday", "present", "gift", "surprise", "holiday", "christmas", "easter",
  "halloween", "thanksgiving", "valentine", "summer", "vacation", "trip", "visit"
]);

// Fix common OCR digit-to-letter mistakes
function fixOcrMistakes(text: string): string {
  return text
    // Fix common digit substitutions when surrounded by letters
    .replace(/([a-zA-Z])0([a-zA-Z])/g, '$1o$2')
    .replace(/([a-zA-Z])1([a-zA-Z])/g, '$1l$2')
    .replace(/([a-zA-Z])5([a-zA-Z])/g, '$1s$2')
    .replace(/([a-zA-Z])8([a-zA-Z])/g, '$1b$2')
    // Fix standalone replacements at word boundaries
    .replace(/\bl\b/gi, 'I')
    .replace(/\b0\b/g, 'O');
}

// Check if a word looks like a valid English word (heuristic check)
function isValidWordPattern(word: string): boolean {
  const lower = word.toLowerCase();
  
  // Must be 3-18 characters
  if (lower.length < 3 || lower.length > 18) return false;
  
  // Must be all letters
  if (!/^[a-z]+$/.test(lower)) return false;
  
  // No triple identical characters (like "aaaa" or "llll")
  if (/(.)\1\1/.test(lower)) return false;
  
  // Must have at least one vowel
  if (!/[aeiouy]/.test(lower)) return false;
  
  // No more than 5 consonants in a row
  if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(lower)) return false;
  
  // Reject patterns that are clearly garbage (all consonants, 4+ chars)
  if (/^[bcdfghjklmnpqrstvwxz]+$/.test(lower) && lower.length > 3) return false;
  
  return true;
}

// Check if word is in our dictionary
function isKnownWord(word: string): boolean {
  const lower = word.toLowerCase();
  return ENGLISH_WORDS.has(lower) || STOP_WORDS.has(lower);
}

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
  const { filterStopWords = false, filterByGradeLevel = false } = options;

  // Step 1: Normalize unicode characters
  let cleanedText = rawText
    .normalize('NFKD')
    // Convert curly quotes to straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Convert em/en dashes to hyphens
    .replace(/[\u2013\u2014]/g, '-')
    // Remove control characters and non-printable chars
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');

  // Step 2: Fix hyphenated line breaks (word-\nbreak -> wordbreak)
  cleanedText = cleanedText.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');

  // Step 3: Fix common OCR digit mistakes
  cleanedText = fixOcrMistakes(cleanedText);

  // Step 4: Remove lines with low letter density (likely headers/footers/page numbers)
  // But be less aggressive - keep lines that have at least some readable content
  cleanedText = cleanedText
    .split('\n')
    .filter((line) => {
      const letters = (line.match(/[a-zA-Z]/g) || []).length;
      const total = line.trim().length;
      // Keep lines that have at least 5 letters regardless of density
      // Or lines where at least 40% are letters
      return letters >= 5 || (total > 0 && letters / total >= 0.4);
    })
    .join('\n');

  // Step 5: Remove remaining special characters and numbers
  cleanedText = cleanedText
    .replace(/[^a-zA-Z\s\n.,!?'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Step 6: Extract words (only pure letter sequences)
  const wordPattern = /[a-zA-Z]+/g;
  const allWords = cleanedText.match(wordPattern) || [];

  // Step 7: Filter and normalize words
  const wordFrequencies = new Map<string, number>();
  
  for (const word of allWords) {
    const lower = word.toLowerCase();
    
    // Skip if doesn't pass basic pattern check
    if (!isValidWordPattern(lower)) continue;
    
    // Skip if it's a stop word (when filtering enabled) 
    if (filterStopWords && STOP_WORDS.has(lower)) continue;
    
    // For grade level filtering, only include known grade-level words
    if (filterByGradeLevel && !isKnownWord(lower)) continue;
    
    // If not filtering by grade level, accept any word that passes pattern check
    // Known words are always accepted, unknown words need to be at least 3 chars
    // (which is already enforced by isValidWordPattern)
    
    wordFrequencies.set(lower, (wordFrequencies.get(lower) || 0) + 1);
  }

  // Get unique filtered words
  const filteredWords = Array.from(wordFrequencies.keys());

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
