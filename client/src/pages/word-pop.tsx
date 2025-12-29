import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, Trophy, Flame, Play, RotateCcw, Star, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Word, Child, Book } from "@shared/schema";

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
  const childId = id || "";

  const [gameState, setGameState] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [roundsInLevel, setRoundsInLevel] = useState(0);
  const [targetWord, setTargetWord] = useState<string>("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [wordsPlayed, setWordsPlayed] = useState(0);
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
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

  const playableWords = useMemo(() => {
    if (book && book.words) {
      return book.words
        .filter(w => w.length >= 2 && w.length <= 12)
        .map((word, index) => ({ id: index, word: word.toLowerCase(), status: "new" as const }));
    }
    
    return words.filter(w => w.word.length >= 2 && w.word.length <= 12);
  }, [words, book]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        const preferredNames = ['Samantha', 'Karen', 'Victoria', 'Google US English', 'Microsoft Zira', 'Google UK English Female'];
        const found = englishVoices.find(v => preferredNames.some(name => v.name.includes(name)));
        setPreferredVoice(found || englishVoices[0] || voices[0] || null);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [preferredVoice]);

  const getRandomWords = useCallback((count: number, mustInclude: string): string[] => {
    const available = playableWords.filter(w => w.word !== mustInclude).map(w => w.word);
    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count - 1);
    selected.push(mustInclude);
    return selected.sort(() => Math.random() - 0.5);
  }, [playableWords]);

  const spawnBubbles = useCallback((target: string, currentLevel: number) => {
    if (!gameAreaRef.current) return;
    
    const areaWidth = gameAreaRef.current.offsetWidth;
    const areaHeight = gameAreaRef.current.offsetHeight;
    const baseBubbleCount = 4;
    const extraBubbles = Math.min(Math.floor((currentLevel - 1) / 2), 2);
    const bubbleCount = Math.min(baseBubbleCount + extraBubbles, playableWords.length);
    const selectedWords = getRandomWords(bubbleCount, target);
    
    const baseSpeed = 0.5 + (currentLevel - 1) * 0.15;
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
  }, [playableWords, getRandomWords]);

  const nextRound = useCallback((currentLevel?: number) => {
    if (playableWords.length < 2) return;
    
    const lvl = currentLevel ?? level;
    const randomWord = playableWords[Math.floor(Math.random() * playableWords.length)];
    setTargetWord(randomWord.word);
    setWordsPlayed(prev => prev + 1);
    spawnBubbles(randomWord.word, lvl);
    
    setTimeout(() => {
      speak(randomWord.word);
    }, 500);
  }, [playableWords, spawnBubbles, speak, level]);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setStreak(0);
    setLives(3);
    setLevel(1);
    setRoundsInLevel(0);
    setWordsPlayed(0);
    setBestStreak(0);
    nextRound(1);
  }, [nextRound]);

  const handleBubbleTap = useCallback((bubble: Bubble) => {
    if (gameState !== "playing") return;
    
    if (bubble.word === targetWord) {
      setBubbles([]);
      const levelBonus = level * 5;
      const points = 10 + streak * 2 + levelBonus;
      setScore(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(best => Math.max(best, newStreak));
        return newStreak;
      });
      setFeedback("correct");
      
      setRoundsInLevel(prev => {
        const newRounds = prev + 1;
        if (newRounds >= ROUNDS_PER_LEVEL) {
          setLevel(lvl => {
            const newLevel = lvl + 1;
            speak(`Level ${newLevel}!`);
            setTimeout(() => {
              setFeedback(null);
              nextRound(newLevel);
            }, 1200);
            return newLevel;
          });
          return 0;
        } else {
          speak("Great!");
          setTimeout(() => {
            setFeedback(null);
            nextRound();
          }, 800);
          return newRounds;
        }
      });
    } else {
      setStreak(0);
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState("gameover");
        }
        return newLives;
      });
      setFeedback("wrong");
      speak("Try again");
      
      setTimeout(() => {
        setFeedback(null);
      }, 500);
    }
  }, [gameState, targetWord, streak, nextRound, speak]);

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
              setGameState("gameover");
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

  const backPath = bookId ? `/child/${childId}/books` : `/child/${childId}`;

  if (playableWords.length < 4) {
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
              <h2 className="text-xl font-bold mb-2">Not Enough Words</h2>
              <p className="text-muted-foreground mb-4">
                {book 
                  ? `This book needs at least 4 words in ${child?.name}'s library to play Word Pop!`
                  : `Add at least 4 words to ${child?.name}'s library to play Word Pop!`
                }
              </p>
              <Button onClick={() => setLocation(`/child/${childId}/presets`)} data-testid="button-add-words">
                Add Word Lists
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
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <div className="bg-green-500/20 rounded-full p-8">
                <Star className="w-16 h-16 text-green-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <Trophy className="w-20 h-20 text-primary mb-6" />
            <h1 className="text-3xl font-bold mb-2">Word Pop</h1>
            {book && (
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BookOpen className="w-4 h-4" />
                <span>{book.title}</span>
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

        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-background/80 backdrop-blur-sm">
            <Trophy className="w-20 h-20 text-amber-500 mb-4" />
            <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
            
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
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setLocation(backPath)} data-testid="button-exit">
                Exit
              </Button>
              <Button onClick={startGame} data-testid="button-play-again">
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
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
              fontSize: Math.max(14, 18 - bubble.word.length),
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
