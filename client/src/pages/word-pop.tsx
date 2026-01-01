import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, Trophy, Flame, Play, RotateCcw, Star, BookOpen, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { speak } from "@/lib/voice";
import { playSuccessSound } from "@/lib/speech";
import { SentenceCelebration } from "@/components/SentenceCelebration";
import type { Word, Child, Book, PresetWordList } from "@shared/schema";

interface PrioritizedWord {
  word: string;
  leverageScore: number;
  bookCount: number;
  totalOccurrences: number;
}

interface Bubble {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  size: number;
}

export default function WordPop() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const bookId = searchParams.get("bookId");
  const presetId = searchParams.get("presetId");
  const lessonMode = searchParams.get("lessonMode") === "true";
  const childId = id || "";

  // In lesson mode, skip celebration (it happens at end of flashcards)
  const [gameState, setGameState] = useState<"ready" | "playing" | "gameover" | "celebration">("ready");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [roundsInLevel, setRoundsInLevel] = useState(0);
  const [targetWord, setTargetWord] = useState<string>("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "levelup" | null>(null);
  const [celebrateWord, setCelebrateWord] = useState<string>("");
  const [wordsPlayed, setWordsPlayed] = useState(0);
  const [practicedWords, setPracticedWords] = useState<string[]>([]);
  const practicedWordsRef = useRef<string[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const bubbleIdRef = useRef(0);
  
  
  const ROUNDS_PER_LEVEL = 5;

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: words = [] } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
  });

  const { data: book } = useQuery<Book>({
    queryKey: ["/api/books", bookId],
    enabled: !!bookId,
  });

  const { data: preset } = useQuery<PresetWordList>({
    queryKey: [`/api/presets/${presetId}`],
    enabled: !!presetId,
  });

  // Fetch prioritized words for this book (sorted by leverage score)
  // Only fetch when we have both a valid bookId and childId
  const hasValidBookId = bookId !== null && bookId !== "" && bookId !== undefined;
  const { data: prioritizedWords, isLoading: prioritizedLoading } = useQuery<PrioritizedWord[]>({
    queryKey: ["/api/children", childId, "books", bookId, "prioritized-words"],
    enabled: hasValidBookId && !!childId,
  });

  // Auto-add book to library when lesson starts
  const addBookToLibraryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/children/${childId}/added-books`, { bookId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "added-books"] });
    },
  });

  // Auto-add book to library when the game page loads with a book
  const [libraryAdded, setLibraryAdded] = useState(false);
  useEffect(() => {
    if (bookId && book && !libraryAdded && !addBookToLibraryMutation.isPending) {
      addBookToLibraryMutation.mutate();
      setLibraryAdded(true);
    }
  }, [bookId, book, libraryAdded]);
  
  // Track which priority index we're at for deterministic progression
  const priorityIndexRef = useRef(0);

  const playableWords = useMemo(() => {
    // For book-based practice: ONLY use prioritized words from the API
    // This ensures mastered words are excluded and leverage ordering is maintained
    if (hasValidBookId) {
      // If prioritized data exists, use it (could be empty if all words are mastered)
      if (prioritizedWords !== undefined) {
        return prioritizedWords
          .filter(pw => pw.word.length >= 2 && pw.word.length <= 12)
          .map((pw, index) => ({ 
            id: index, 
            word: pw.word.toLowerCase(), 
            status: "new" as const,
            leverageScore: pw.leverageScore 
          }));
      }
      // Still loading - return empty to trigger loading state
      return [];
    }
    
    // For preset-based practice (no leverage-based prioritization)
    if (preset && preset.words) {
      return preset.words
        .filter(w => w.length >= 2 && w.length <= 12)
        .map((word, index) => ({ id: index, word: word.toLowerCase(), status: "new" as const }));
    }
    
    // General practice from child's word library
    return words.filter(w => w.word.length >= 2 && w.word.length <= 12);
  }, [words, preset, prioritizedWords, hasValidBookId]);

  const getRandomWords = useCallback((count: number, mustInclude: string): string[] => {
    const available = playableWords.filter(w => w.word !== mustInclude).map(w => w.word);
    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count - 1);
    selected.push(mustInclude);
    return selected.sort(() => Math.random() - 0.5);
  }, [playableWords]);

  const calculateSpeed = useCallback((lvl: number, round: number) => {
    const completedLevelsBonus = 0.1 * ROUNDS_PER_LEVEL * (lvl - 1) * lvl / 2;
    const currentRoundBonus = round * lvl * 0.1;
    return 1.3 + completedLevelsBonus + currentRoundBonus;
  }, []);

  const spawnBubbles = useCallback((target: string, currentLevel: number, roundNum?: number) => {
    if (!gameAreaRef.current) return;
    
    const areaWidth = gameAreaRef.current.offsetWidth;
    const areaHeight = gameAreaRef.current.offsetHeight;
    const bubbleCount = Math.min(4, playableWords.length);
    const selectedWords = getRandomWords(bubbleCount, target);
    
    const round = roundNum ?? 0;
    const baseSpeed = calculateSpeed(currentLevel, round);
    const speedVariation = 0.3;
    
    const newBubbles: Bubble[] = selectedWords.map((word, index) => {
      const size = 80 + word.length * 4;
      const sectionWidth = areaWidth / bubbleCount;
      const x = sectionWidth * index + (sectionWidth - size) / 2 + Math.random() * 20 - 10;
      
      return {
        id: bubbleIdRef.current++,
        word,
        x: Math.max(10, Math.min(areaWidth - size - 10, x)),
        y: areaHeight + 50,
        speed: baseSpeed + Math.random() * speedVariation,
        size,
      };
    });
    
    setBubbles(newBubbles);
  }, [playableWords, getRandomWords, calculateSpeed]);

  const nextRound = useCallback((currentLevel?: number, currentRound?: number) => {
    if (playableWords.length < 2) return;
    
    const lvl = currentLevel ?? level;
    const round = currentRound ?? roundsInLevel;
    
    // Deterministic progression through prioritized words
    // Cycle through the list in order, so highest-leverage words come first
    const currentIndex = priorityIndexRef.current % playableWords.length;
    priorityIndexRef.current = currentIndex + 1;
    
    const targetWordData = playableWords[currentIndex];
    setTargetWord(targetWordData.word);
    setWordsPlayed(prev => prev + 1);
    // Track this word as practiced (synchronous ref for immediate access + state for render)
    if (!practicedWordsRef.current.includes(targetWordData.word)) {
      practicedWordsRef.current = [...practicedWordsRef.current, targetWordData.word];
    }
    setPracticedWords([...practicedWordsRef.current]);
    spawnBubbles(targetWordData.word, lvl, round);
    
    setTimeout(() => {
      speak(targetWordData.word);
    }, 500);
  }, [playableWords, spawnBubbles, level, roundsInLevel]);

  const startGame = useCallback(() => {
    // Reset priority index to start from the highest-leverage words
    priorityIndexRef.current = 0;
    
    setGameState("playing");
    setScore(0);
    setStreak(0);
    setLives(3);
    setLevel(1);
    setRoundsInLevel(0);
    setWordsPlayed(0);
    setBestStreak(0);
    setPracticedWords([]);
    practicedWordsRef.current = [];
    nextRound(1, 0);
  }, [nextRound]);
  
  const handleCelebrationComplete = useCallback(() => {
    setGameState("gameover");
  }, []);

  const handleBubbleTap = useCallback((bubble: Bubble) => {
    if (gameState !== "playing") return;
    
    if (bubble.word === targetWord) {
      setBubbles([]);
      playSuccessSound();
      const levelBonus = level * 5;
      const points = 10 + streak * 2 + levelBonus;
      setScore(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(best => Math.max(best, newStreak));
        return newStreak;
      });
      setCelebrateWord(bubble.word);
      setFeedback("correct");
      
      setRoundsInLevel(prev => {
        const newRounds = prev + 1;
        if (newRounds >= ROUNDS_PER_LEVEL) {
          setLevel(lvl => {
            const newLevel = lvl + 1;
            setLives(currentLives => Math.min(currentLives + 1, 3));
            setTimeout(() => {
              setFeedback("levelup");
              speak(`Level ${newLevel}!`);
            }, 1500);
            setTimeout(() => {
              setFeedback(null);
              nextRound(newLevel, 0);
            }, 3000);
            return newLevel;
          });
          return 0;
        } else {
          setTimeout(() => {
            setFeedback(null);
            nextRound(undefined, newRounds);
          }, 2000);
          return newRounds;
        }
      });
    } else {
      setStreak(0);
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          // In lesson mode, skip celebration (it happens at end of flashcards)
          // Otherwise show celebration if we have practiced words
          if (lessonMode) {
            setGameState("gameover");
          } else {
            setGameState(practicedWordsRef.current.length > 0 ? "celebration" : "gameover");
          }
        }
        return newLives;
      });
      setFeedback("wrong");
      speak("Try again");
      
      setTimeout(() => {
        setFeedback(null);
      }, 500);
    }
  }, [gameState, targetWord, streak, nextRound, level]);

  useEffect(() => {
    if (gameState !== "playing") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setBubbles(prev => {
        const updated = prev.map(bubble => ({
          ...bubble,
          y: bubble.y - bubble.speed,
        }));
        
        const escaped = updated.some(b => b.y < -100 && b.word === targetWord);
        if (escaped) {
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              // In lesson mode, skip celebration (it happens at end of flashcards)
              if (lessonMode) {
                setGameState("gameover");
              } else {
                setGameState(practicedWordsRef.current.length > 0 ? "celebration" : "gameover");
              }
            } else {
              setTimeout(nextRound, 500);
            }
            return newLives;
          });
          setStreak(0);
          return [];
        }
        
        return updated.filter(b => b.y > -150);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, targetWord, nextRound]);

  const backPath = bookId ? `/child/${childId}/books` : presetId ? `/child/${childId}/presets` : `/child/${childId}`;
  const sourceName = book?.title || preset?.name;
  
  // Wait for prioritized words to load before allowing game start (for book-based games)
  const isLoadingPrioritizedData = hasValidBookId && prioritizedLoading;

  if (isLoadingPrioritizedData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <Trophy className="w-16 h-16 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-bold mb-2">Preparing Word Pop</h2>
          <p className="text-muted-foreground">Loading prioritized words...</p>
        </div>
      </div>
    );
  }

  if (playableWords.length < 4) {
    // Determine if it's because all words are mastered (for book-based practice)
    const allWordsMastered = hasValidBookId && prioritizedWords !== undefined && prioritizedWords.length === 0;
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(backPath)}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {allWordsMastered ? "All Words Mastered!" : "Not Enough Words"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {allWordsMastered
                  ? `Great job! All words in "${sourceName}" have been mastered. Try another book or use "Keep Words Strong" to review.`
                  : sourceName 
                    ? `"${sourceName}" needs at least 4 words to play Word Pop!`
                    : `Add at least 4 words to ${child?.name}'s library to play Word Pop!`
                }
              </p>
              <Button onClick={() => setLocation(backPath)} data-testid="button-go-back">
                {allWordsMastered ? "Choose Another Book" : "Go Back"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(backPath)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1" data-testid="badge-level">
            Lv.{level}
          </Badge>
          
          <Badge variant="outline" className="gap-1" data-testid="badge-speed">
            {calculateSpeed(level, roundsInLevel).toFixed(1)}x
          </Badge>
          
          <Badge variant="secondary" className="gap-1" data-testid="badge-score">
            <Star className="w-3 h-3" />
            {score}
          </Badge>
          
          {streak > 1 && (
            <Badge variant="default" className="gap-1 bg-orange-500" data-testid="badge-streak">
              <Flame className="w-3 h-3" />
              {streak}x
            </Badge>
          )}
          
          <div className="flex gap-1" data-testid="lives-display">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-lg ${i < lives ? "text-red-500" : "text-muted-foreground/30"}`}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
      </header>

      {gameState === "playing" && targetWord && (
        <div className="p-4 text-center bg-muted/50">
          <p className="text-sm text-muted-foreground mb-1">Listen and tap the word:</p>
          <div className="flex items-center justify-center gap-2">
            <span 
              className="text-2xl font-bold blur-sm select-none" 
              data-testid="target-word"
            >
              {targetWord}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => speak(targetWord)}
              data-testid="button-speak"
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      <div 
        ref={gameAreaRef}
        className="flex-1 relative overflow-hidden touch-none"
        style={{ minHeight: "400px" }}
      >
        <AnimatePresence>
          {feedback === "correct" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-green-500"
            >
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0,
                      scale: 0,
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`
                    }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1.2, 1, 0.8],
                      rotate: [0, 15, -15, 0]
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                    className="absolute"
                    style={{ left: `${10 + (i % 4) * 25}%`, top: `${10 + Math.floor(i / 4) * 30}%` }}
                  >
                    <Star className="w-8 h-8 text-yellow-300 fill-yellow-300" />
                  </motion.div>
                ))}
              </div>
              <motion.p
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-5xl font-bold text-white drop-shadow-lg z-10"
              >
                {celebrateWord}
              </motion.p>
            </motion.div>
          )}
          
          {feedback === "levelup" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-purple-600"
            >
              <motion.p
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-4xl font-bold text-white drop-shadow-lg"
              >
                Level {level}!
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <Trophy className="w-20 h-20 text-primary mb-6" />
            <h1 className="text-3xl font-bold mb-2">Word Pop</h1>
            {sourceName && (
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BookOpen className="w-4 h-4" />
                <span>{sourceName}</span>
              </div>
            )}
            <p className="text-muted-foreground text-center mb-8 max-w-xs">
              Listen to the word and tap the matching bubble before it floats away!
            </p>
            <Button size="lg" onClick={startGame} data-testid="button-start-game">
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </div>
        )}

        {gameState === "celebration" && practicedWords.length > 0 && childId && (
          <div className="absolute inset-0 z-30">
            <SentenceCelebration
              childId={childId}
              masteredWords={practicedWords}
              onComplete={handleCelebrationComplete}
              gifCelebrationsEnabled={child?.gifCelebrationsEnabled ?? true}
            />
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-background/80 backdrop-blur-sm">
            <Trophy className="w-20 h-20 text-amber-500 mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              {lessonMode ? "Great Warm-Up!" : "Game Over!"}
            </h2>
            
            <div className="grid grid-cols-2 gap-4 my-6 text-center">
              <div>
                <p className="text-3xl font-bold text-primary" data-testid="final-score">{score}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-500" data-testid="final-level">{level}</p>
                <p className="text-sm text-muted-foreground">Level Reached</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-500" data-testid="best-streak">{bestStreak}</p>
                <p className="text-sm text-muted-foreground">Best Streak</p>
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="words-played">{wordsPlayed}</p>
                <p className="text-sm text-muted-foreground">Words</p>
              </div>
            </div>
            
            {lessonMode && bookId ? (
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                  onClick={() => {
                    // Pass practiced words from Word Pop to Flashcards for combined celebration
                    const wordsParam = encodeURIComponent(practicedWords.join(","));
                    setLocation(`/child/${childId}/flashcards?bookId=${bookId}&wordPopWords=${wordsParam}`);
                  }}
                  data-testid="button-continue-flashcards"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Continue to Flashcards
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation(backPath)} 
                  data-testid="button-exit"
                >
                  Exit Lesson
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setLocation(backPath)} data-testid="button-exit">
                  Exit
                </Button>
                <Button onClick={startGame} data-testid="button-play-again">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </div>
            )}
          </div>
        )}

        {gameState === "playing" && bubbles.map(bubble => (
          <motion.button
            key={bubble.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute rounded-full bg-primary text-primary-foreground font-bold shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              left: bubble.x,
              top: bubble.y,
              width: bubble.size,
              height: bubble.size,
              fontSize: 16,
            }}
            onClick={() => handleBubbleTap(bubble)}
            data-testid={`bubble-${bubble.word}`}
          >
            {bubble.word}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
