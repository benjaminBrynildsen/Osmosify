import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Play, RotateCcw, Mic, MicOff, Flame, Trophy, Star, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { startContinuousListening, playSuccessSound, isSpeechRecognitionSupported } from "@/lib/speech";
import { SentenceCelebration } from "@/components/SentenceCelebration";
import { getTheme } from "@/lib/themes";
import { useSessionTracking } from "@/hooks/use-session-tracking";
import type { Word, Child, Book, PresetWordList, ThemeOption } from "@shared/schema";

interface PrioritizedWord {
  word: string;
  leverageScore: number;
  bookCount: number;
  totalOccurrences: number;
}

interface Creature {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  saved: boolean;
}

interface WordProgress {
  word: string;
  correctSaves: number;
  cleared: boolean;
}

export default function LavaLetters() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const bookId = searchParams.get("bookId");
  const presetId = searchParams.get("presetId");
  const lessonMode = searchParams.get("lessonMode") === "true";
  const practicedWordsParam = searchParams.get("practicedWords");
  const childId = id || "";
  const { trackEvent, incrementLessonsCompleted } = useSessionTracking();

  // Track Lava Letters started
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("lava_letters_started", { childId, bookId, presetId, lessonMode });
    }
  }, []);
  
  // Parse practiced words passed from lesson flow (Word Pop + Flashcards)
  const lessonPracticedWords = practicedWordsParam 
    ? decodeURIComponent(practicedWordsParam).split(",").filter(w => w.length > 0)
    : [];

  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "gameover" | "celebration" | "victory">("ready");
  const [lives, setLives] = useState(3);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [wordProgress, setWordProgress] = useState<Map<string, WordProgress>>(new Map());
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [practicedWords, setPracticedWords] = useState<string[]>([]);
  const [playedTime, setPlayedTime] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const lastMatchTimeRef = useRef<number>(0);
  const playedTimeRef = useRef<number>(0);
  const lastResumeTimeRef = useRef<number>(0);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const creatureIdRef = useRef(0);
  const speechRef = useRef<{ stop: () => void; updateTargetWords: (words: string[]) => void } | null>(null);
  const practicedWordsRef = useRef<string[]>([]);

  const speechSupported = isSpeechRecognitionSupported();

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

  const hasValidBookId = bookId !== null && bookId !== "" && bookId !== undefined;
  const { data: prioritizedWords, isLoading: prioritizedLoading } = useQuery<PrioritizedWord[]>({
    queryKey: ["/api/children", childId, "books", bookId, "prioritized-words"],
    enabled: hasValidBookId && !!childId,
  });

  const masteryThreshold = child?.masteryThreshold || 4;
  const deckSize = child?.deckSize || 4;
  const theme = getTheme((child?.theme as ThemeOption) || "default");

  const playableWords = useMemo(() => {
    if (hasValidBookId) {
      if (prioritizedWords !== undefined) {
        return prioritizedWords
          .filter(pw => pw.word.length >= 2 && pw.word.length <= 12)
          .slice(0, deckSize)
          .map((pw, index) => ({ 
            id: index, 
            word: pw.word.toLowerCase(), 
            status: "new" as const,
          }));
      }
      return [];
    }
    
    if (preset && preset.words) {
      return preset.words
        .filter(w => w.length >= 2 && w.length <= 12)
        .slice(0, deckSize)
        .map((word, index) => ({ id: index, word: word.toLowerCase(), status: "new" as const }));
    }
    
    return words
      .filter(w => w.word.length >= 2 && w.word.length <= 12)
      .slice(0, deckSize);
  }, [words, preset, prioritizedWords, hasValidBookId, deckSize]);

  const unclearedWords = useMemo(() => {
    return playableWords.filter(pw => {
      const progress = wordProgress.get(pw.word);
      return !progress?.cleared;
    });
  }, [playableWords, wordProgress]);

  const spawnCreature = useCallback(() => {
    if (!gameAreaRef.current || unclearedWords.length === 0) return;
    
    const areaWidth = gameAreaRef.current.offsetWidth;
    
    // Use functional update to check for active words without depending on creatures state
    setCreatures(prev => {
      // Get words that are NOT already falling (active in creatures list)
      const activeWords = new Set(prev.filter(c => !c.saved).map(c => c.word));
      const availableWords = unclearedWords.filter(w => !activeWords.has(w.word));
      
      // If all uncleared words are already falling, don't spawn
      if (availableWords.length === 0) return prev;
      
      const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      const size = 80 + randomWord.word.length * 4;
      const x = Math.random() * (areaWidth - size - 20) + 10;
      
      // Apply speed multiplier for progressive difficulty
      const baseSpeed = 0.8 + Math.random() * 0.4;
      
      const newCreature: Creature = {
        id: creatureIdRef.current++,
        word: randomWord.word,
        x,
        y: -100,
        speed: baseSpeed * speedMultiplier,
        saved: false,
      };
      
      if (!practicedWordsRef.current.includes(randomWord.word)) {
        practicedWordsRef.current = [...practicedWordsRef.current, randomWord.word];
        setPracticedWords([...practicedWordsRef.current]);
      }
      
      return [...prev, newCreature];
    });
  }, [unclearedWords, speedMultiplier]);

  const handleAllMatches = useCallback((
    matches: { word: string; index: number; transcript: string; confidence: number }[],
    markWordMatched?: (wordIndex: number) => void
  ) => {
    if (matches.length === 0) return;
    
    setSpokenText(matches[0].transcript);
    
    // Global cooldown: Only process one match per 800ms regardless of which word
    const now = Date.now();
    if (now - lastMatchTimeRef.current < 800) {
      return;
    }
    
    setCreatures(prev => {
      // Find all creatures that match ANY of the detected words, prioritize by Y position
      const allMatchingCreatures: { creature: Creature; creatureIdx: number; matchWord: string; matchIndex: number }[] = [];
      
      for (const match of matches) {
        prev.forEach((creature, idx) => {
          if (creature.word === match.word && !creature.saved) {
            allMatchingCreatures.push({ creature, creatureIdx: idx, matchWord: match.word, matchIndex: match.index });
          }
        });
      }
      
      if (allMatchingCreatures.length === 0) return prev;
      
      // Pick the creature closest to the bottom (highest Y = most danger)
      const closestToBottom = allMatchingCreatures.reduce((closest, current) => 
        current.creature.y > closest.creature.y ? current : closest
      );
      
      // Mark this word as matched in speech recognition so it won't match again
      if (markWordMatched) {
        markWordMatched(closestToBottom.matchIndex);
      }
      
      // Update the global match time lock
      lastMatchTimeRef.current = now;
      
      const updated = [...prev];
      updated[closestToBottom.creatureIdx] = { ...updated[closestToBottom.creatureIdx], saved: true };
      
      playSuccessSound();
      setSavedCount(s => {
        const newCount = s + 1;
        // Increase speed slightly every 4 saves (5% faster each time)
        if (newCount % 4 === 0) {
          setSpeedMultiplier(m => Math.min(m + 0.1, 2.5)); // Cap at 2.5x speed
        }
        return newCount;
      });
      
      // Clear the "heard" display so it's ready for fresh input
      setTimeout(() => setSpokenText(""), 300);
      
      setWordProgress(wp => {
        const newProgress = new Map(wp);
        const current = newProgress.get(closestToBottom.matchWord) || { word: closestToBottom.matchWord, correctSaves: 0, cleared: false };
        const newSaves = current.correctSaves + 1;
        const cleared = newSaves >= masteryThreshold;
        newProgress.set(closestToBottom.matchWord, { ...current, correctSaves: newSaves, cleared });
        return newProgress;
      });
      
      setTimeout(() => {
        setCreatures(c => c.filter(creature => creature.id !== updated[closestToBottom.creatureIdx].id));
      }, 500);
      
      return updated;
    });
  }, [masteryThreshold]);

  const handleWordMatch = useCallback((match: { word: string; index: number; transcript: string; confidence: number }) => {
    // Delegate to handleAllMatches with a single-item array
    handleAllMatches([match]);
  }, [handleAllMatches]);

  const handleManualSave = useCallback((creature: Creature) => {
    if (creature.saved) return;
    handleWordMatch({ 
      word: creature.word, 
      index: 0, 
      transcript: creature.word, 
      confidence: 1 
    });
  }, [handleWordMatch]);

  const handleManualMiss = useCallback((creature: Creature) => {
    if (creature.saved) return;
    setCreatures(prev => prev.filter(c => c.id !== creature.id));
    setLives(l => {
      const newLives = l - 1;
      if (newLives <= 0) {
        if (lessonMode) {
          setGameState("gameover");
        } else {
          setGameState(practicedWordsRef.current.length > 0 ? "celebration" : "gameover");
        }
      }
      return newLives;
    });
  }, [lessonMode]);

  const startListening = useCallback(() => {
    if (!speechSupported || speechRef.current) return;
    
    const activeWords = unclearedWords.map(w => w.word);
    if (activeWords.length === 0) return;
    
    speechRef.current = startContinuousListening(
      activeWords,
      handleWordMatch,
      (transcript) => setSpokenText(transcript),
      (error) => console.warn("Speech error:", error),
      () => {
        speechRef.current = null;
        setIsListening(false);
      },
      handleAllMatches // Pass the new callback to prioritize by creature position
    );
    setIsListening(true);
  }, [speechSupported, unclearedWords, handleWordMatch, handleAllMatches]);

  const stopListening = useCallback(() => {
    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startGame = useCallback(() => {
    setGameState("playing");
    setLives(3);
    setCreatures([]);
    setSavedCount(0);
    setPracticedWords([]);
    practicedWordsRef.current = [];
    creatureIdRef.current = 0;
    setPlayedTime(0);
    playedTimeRef.current = 0;
    lastResumeTimeRef.current = Date.now();
    setSpeedMultiplier(1);
    lastMatchTimeRef.current = 0;
    
    const initialProgress = new Map<string, WordProgress>();
    playableWords.forEach(pw => {
      initialProgress.set(pw.word, { word: pw.word, correctSaves: 0, cleared: false });
    });
    setWordProgress(initialProgress);
    
    if (speechSupported) {
      startListening();
    }
  }, [playableWords, speechSupported, startListening]);

  const togglePause = useCallback(() => {
    if (gameState === "playing") {
      // Accumulate played time when pausing
      playedTimeRef.current += Date.now() - lastResumeTimeRef.current;
      setPlayedTime(playedTimeRef.current);
      setGameState("paused");
      stopListening();
    } else if (gameState === "paused") {
      // Track resume time when resuming
      lastResumeTimeRef.current = Date.now();
      setGameState("playing");
      if (speechSupported) {
        startListening();
      }
    }
  }, [gameState, speechSupported, startListening, stopListening]);

  const handleCelebrationComplete = useCallback(() => {
    // Track lesson completion
    trackEvent("lesson_completed", { childId, bookId, presetId, lessonMode });
    incrementLessonsCompleted();
    
    // In lesson mode, go back to dashboard; otherwise show game over
    if (lessonMode) {
      setLocation(`/child/${childId}`);
    } else {
      setGameState("gameover");
    }
  }, [lessonMode, childId, bookId, presetId, setLocation, trackEvent, incrementLessonsCompleted]);

  // Progressive difficulty: increase speed every 30 seconds of actual play time
  useEffect(() => {
    if (gameState !== "playing") return;
    
    const interval = setInterval(() => {
      // Calculate total played time: accumulated + current session
      const currentSessionTime = Date.now() - lastResumeTimeRef.current;
      const totalPlayedSeconds = (playedTimeRef.current + currentSessionTime) / 1000;
      // Increase speed by 10% every 30 seconds, max 2x speed
      const newMultiplier = Math.min(2, 1 + Math.floor(totalPlayedSeconds / 30) * 0.1);
      setSpeedMultiplier(newMultiplier);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "playing") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopListening();
      return;
    }

    let lastSpawnTime = Date.now();
    const spawnInterval = 3000;

    const animate = () => {
      const now = Date.now();
      if (now - lastSpawnTime > spawnInterval && unclearedWords.length > 0) {
        spawnCreature();
        lastSpawnTime = now;
      }

      setCreatures(prev => {
        if (!gameAreaRef.current) return prev;
        const areaHeight = gameAreaRef.current.offsetHeight;
        
        const updated = prev.map(creature => ({
          ...creature,
          y: creature.saved ? creature.y : creature.y + creature.speed,
        }));
        
        const hitLava = updated.filter(c => !c.saved && c.y > areaHeight - 80);
        if (hitLava.length > 0) {
          setLives(l => {
            const newLives = l - hitLava.length;
            if (newLives <= 0) {
              // Always show celebration at end of lesson mode; otherwise show if we have words
              if (lessonMode) {
                setGameState("celebration");
              } else {
                setGameState(practicedWordsRef.current.length > 0 ? "celebration" : "gameover");
              }
            }
            return Math.max(0, newLives);
          });
        }
        
        return updated.filter(c => c.saved || c.y <= areaHeight - 80);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    spawnCreature();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, spawnCreature, stopListening, unclearedWords.length, lessonMode]);

  useEffect(() => {
    if (gameState === "playing" && unclearedWords.length === 0 && playableWords.length > 0) {
      stopListening();
      // Always show celebration at end of lesson mode; otherwise victory or celebration
      if (lessonMode) {
        setGameState("celebration");
      } else {
        setGameState(practicedWordsRef.current.length > 0 ? "celebration" : "victory");
      }
    }
  }, [gameState, unclearedWords.length, playableWords.length, stopListening, lessonMode]);

  useEffect(() => {
    if (speechRef.current && unclearedWords.length > 0) {
      speechRef.current.updateTargetWords(unclearedWords.map(w => w.word));
    }
  }, [unclearedWords]);

  useEffect(() => {
    return () => {
      stopListening();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stopListening]);

  const backPath = bookId ? `/child/${childId}/books` : presetId ? `/child/${childId}/presets` : `/child/${childId}`;
  const sourceName = book?.title || preset?.name;
  const isLoadingPrioritizedData = hasValidBookId && prioritizedLoading;

  if (isLoadingPrioritizedData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <Flame className="w-16 h-16 mx-auto text-orange-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Preparing Lava Letters</h2>
          <p className="text-muted-foreground">Loading words...</p>
        </div>
      </div>
    );
  }

  if (playableWords.length < 2) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => setLocation(backPath)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="p-6 text-center">
              <Flame className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Not Enough Words</h2>
              <p className="text-muted-foreground mb-4">
                You need at least 2 words to play Lava Letters.
              </p>
              <Button onClick={() => setLocation(backPath)} data-testid="button-go-back">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "celebration") {
    // In lesson mode, combine words from all games in the lesson
    const allPracticedWords = lessonMode 
      ? Array.from(new Set([...lessonPracticedWords, ...practicedWords]))
      : practicedWords;
    
    return (
      <SentenceCelebration
        childId={childId}
        masteredWords={allPracticedWords}
        onComplete={handleCelebrationComplete}
        gifCelebrationsEnabled={child?.gifCelebrationsEnabled ?? true}
      />
    );
  }

  return (
    <div className={`min-h-screen ${theme.background} flex flex-col`}>
      <div className="flex items-center justify-between p-3 bg-black/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopListening();
            setLocation(backPath);
          }}
          className="text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`h-6 w-6 ${i < lives ? "text-red-500 fill-red-500" : "text-gray-600"}`}
              />
            ))}
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            Saved: {savedCount}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {(gameState === "playing" || gameState === "paused") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePause}
              className="text-white"
              data-testid="button-pause"
            >
              {gameState === "paused" ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
          )}
          {speechSupported && gameState === "playing" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={isListening ? stopListening : startListening}
              className={isListening ? "text-green-400" : "text-white"}
              data-testid="button-toggle-mic"
            >
              {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      {sourceName && (
        <div className="text-center py-2 text-white/70 text-sm">
          Playing: {sourceName}
        </div>
      )}

      {gameState === "ready" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className={`max-w-sm w-full ${theme.cardBg} ${theme.cardBorder} border`}>
            <CardContent className="p-6 text-center">
              <div className="mb-6">
                <Flame className={`w-20 h-20 mx-auto ${theme.accentColor} animate-pulse`} />
              </div>
              <h1 className={`text-3xl font-bold ${theme.textColor} mb-2`}>{theme.name} Letters</h1>
              <p className={`${theme.textColor} opacity-70 mb-6`}>
                Say the words to save the creatures before they fall!
              </p>
              
              <div className={`space-y-3 mb-6 text-left ${theme.textColor} opacity-80 text-sm`}>
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-green-400" />
                  <span>Speak words to save creatures</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>3 lives - don&apos;t let them fall!</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span>Save each word {masteryThreshold} times to clear it</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {playableWords.map((pw, i) => (
                  <Badge key={i} variant="outline" className={`${theme.textColor} border-white/30`}>
                    {pw.word}
                  </Badge>
                ))}
              </div>
              
              <Button
                size="lg"
                className={`w-full gap-2 ${theme.creatureGradient} text-white`}
                onClick={startGame}
                data-testid="button-start-game"
              >
                <Play className="h-5 w-5" />
                Start Game
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === "paused" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className={`max-w-sm w-full ${theme.cardBg} ${theme.cardBorder} border`}>
            <CardContent className="p-6 text-center">
              <Pause className={`w-16 h-16 mx-auto ${theme.accentColor} mb-4`} />
              <h2 className={`text-2xl font-bold ${theme.textColor} mb-4`}>Game Paused</h2>
              <div className="space-y-3">
                <Button
                  size="lg"
                  className={`w-full gap-2 ${theme.creatureGradient} text-white`}
                  onClick={togglePause}
                  data-testid="button-resume"
                >
                  <Play className="h-5 w-5" />
                  Resume
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className={`w-full gap-2 ${theme.textColor} border-white/30`}
                  onClick={() => {
                    stopListening();
                    setLocation(backPath);
                  }}
                  data-testid="button-quit-paused"
                >
                  Quit Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover" || gameState === "victory") && (
        <>
          <div 
            ref={gameAreaRef}
            className="flex-1 relative overflow-hidden"
            data-testid="game-area"
          >
            <AnimatePresence>
              {creatures.map((creature) => (
                <motion.div
                  key={creature.id}
                  className="absolute cursor-pointer"
                  style={{ left: creature.x, top: creature.y }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: creature.saved ? 0 : 1, 
                    scale: creature.saved ? 1.5 : 1,
                    y: creature.saved ? -50 : 0,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.3 }}
                  data-testid={`creature-${creature.id}`}
                >
                  <div 
                    className={`relative rounded-2xl px-4 py-3 ${
                      creature.saved 
                        ? theme.creatureSavedColor 
                        : theme.creatureGradient
                    } shadow-lg`}
                  >
                    <span className="text-white font-bold text-lg block text-center">
                      {creature.word}
                    </span>
                    
                    {creature.saved && (
                      <motion.div
                        className="absolute -top-2 -right-2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t ${theme.dangerZoneColor} to-transparent`}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 animate-pulse" />
            </div>
          </div>

          {isListening && spokenText && (
            <div className="absolute bottom-24 left-0 right-0 text-center">
              <Badge variant="secondary" className="bg-black/50 text-white">
                Heard: &quot;{spokenText}&quot;
              </Badge>
            </div>
          )}

          <div className="p-3 bg-black/50">
            <div className="flex flex-wrap gap-2 justify-center">
              {playableWords.map((pw, i) => {
                const progress = wordProgress.get(pw.word);
                const cleared = progress?.cleared;
                const saves = progress?.correctSaves || 0;
                
                return (
                  <Badge 
                    key={i} 
                    variant={cleared ? "default" : "outline"}
                    className={cleared ? "bg-green-600 text-white" : "text-white border-white/30"}
                  >
                    {pw.word} {cleared ? "" : `${saves}/${masteryThreshold}`}
                  </Badge>
                );
              })}
            </div>
          </div>
        </>
      )}

      {(gameState === "gameover" || gameState === "victory") && (
        <motion.div
          className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className={`max-w-sm w-full ${theme.cardBg} ${theme.cardBorder} border`}>
            <CardContent className="p-6 text-center">
              {gameState === "victory" ? (
                <>
                  <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                  <h2 className={`text-2xl font-bold ${theme.textColor} mb-2`}>Victory!</h2>
                  <p className={`${theme.textColor} opacity-70 mb-4`}>
                    You saved all the creatures and cleared every word!
                  </p>
                </>
              ) : (
                <>
                  <Flame className={`w-16 h-16 mx-auto ${theme.accentColor} mb-4`} />
                  <h2 className={`text-2xl font-bold ${theme.textColor} mb-2`}>Game Over</h2>
                  <p className={`${theme.textColor} opacity-70 mb-4`}>
                    You saved {savedCount} creatures!
                  </p>
                </>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setLocation(backPath)}
                  className="gap-2"
                  data-testid="button-exit"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Exit
                </Button>
                <Button
                  onClick={startGame}
                  className={`gap-2 ${theme.creatureGradient} text-white`}
                  data-testid="button-play-again"
                >
                  <RotateCcw className="h-4 w-4" />
                  Play Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
