import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, Trophy, Flame, Play, RotateCcw, Star, Circle, Sparkles, X, Gamepad2, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { speak } from "@/lib/voice";
import { playSuccessSound } from "@/lib/speech";
import { useGuestModeContext } from "@/hooks/use-guest-mode";

interface Bubble {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  size: number;
}

export default function GuestWordPop() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { guestData, markPopGameCompleted } = useGuestModeContext();
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
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "levelup" | null>(null);
  const [celebrateWord, setCelebrateWord] = useState<string>("");
  const [wordsPlayed, setWordsPlayed] = useState(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const bubbleIdRef = useRef(0);
  
  const ROUNDS_PER_LEVEL = 5;

  const playableWords = useMemo(() => {
    return guestData.words.map((w, index) => ({ 
      id: index, 
      word: w.word.toLowerCase(), 
      status: w.status 
    }));
  }, [guestData.words]);

  const calculateSpeed = useCallback((lvl: number, round: number) => {
    const completedLevelsBonus = 0.1 * ROUNDS_PER_LEVEL * (lvl - 1) * lvl / 2;
    const currentRoundBonus = round * lvl * 0.1;
    return 1.3 + completedLevelsBonus + currentRoundBonus;
  }, []);

  const getDistractorCount = () => {
    return 3;
  };

  const pickNewTarget = useCallback(() => {
    if (playableWords.length === 0) return;
    const randomIndex = Math.floor(Math.random() * playableWords.length);
    const word = playableWords[randomIndex].word;
    setTargetWord(word);
    speak(word);
  }, [playableWords]);

  const spawnBubble = useCallback((word: string) => {
    if (!gameAreaRef.current) return;
    const area = gameAreaRef.current.getBoundingClientRect();
    const size = 70 + Math.random() * 30;
    const x = Math.random() * (area.width - size);
    
    const baseSpeed = calculateSpeed(level, roundsInLevel);
    const bubble: Bubble = {
      id: bubbleIdRef.current++,
      word,
      x,
      y: area.height,
      speed: baseSpeed + Math.random() * 0.3,
      size,
    };
    
    setBubbles(prev => [...prev, bubble]);
  }, [level, roundsInLevel, calculateSpeed]);

  const spawnRound = useCallback(() => {
    if (playableWords.length === 0) return;
    
    pickNewTarget();
    setBubbles([]);
    
    setTimeout(() => {
      const distractorCount = getDistractorCount();
      const targetIndex = Math.floor(Math.random() * (distractorCount + 1));
      
      const randomIndex = Math.floor(Math.random() * playableWords.length);
      const target = playableWords[randomIndex].word;
      
      for (let i = 0; i <= distractorCount; i++) {
        setTimeout(() => {
          if (i === targetIndex) {
            spawnBubble(target);
          } else {
            const otherWords = playableWords.filter(w => w.word !== target);
            if (otherWords.length > 0) {
              const distractor = otherWords[Math.floor(Math.random() * otherWords.length)];
              spawnBubble(distractor.word);
            }
          }
        }, i * 300);
      }
    }, 500);
  }, [pickNewTarget, spawnBubble, level, playableWords]);

  const popBubble = useCallback((bubble: Bubble) => {
    setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    
    if (bubble.word === targetWord) {
      playSuccessSound();
      setScore(prev => prev + (10 * level) + (streak * 2));
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setCelebrateWord(bubble.word);
      setFeedback("correct");
      setWordsPlayed(prev => prev + 1);
      
      setRoundsInLevel(prev => {
        const newRounds = prev + 1;
        if (newRounds >= ROUNDS_PER_LEVEL) {
          setTimeout(() => {
            setLevel(l => l + 1);
            setLives(currentLives => Math.min(currentLives + 1, 3));
            setRoundsInLevel(0);
            setFeedback("levelup");
            setTimeout(() => {
              setFeedback(null);
              spawnRound();
            }, 1500);
          }, 800);
          return 0;
        } else {
          setTimeout(() => {
            setFeedback(null);
            spawnRound();
          }, 800);
          return newRounds;
        }
      });
    } else {
      speak(bubble.word);
      setStreak(0);
      setFeedback("wrong");
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setTimeout(() => {
            setGameState("gameover");
            markPopGameCompleted();
          }, 500);
        } else {
          setTimeout(() => {
            setFeedback(null);
          }, 500);
        }
        return newLives;
      });
    }
  }, [targetWord, streak, bestStreak, level, spawnRound, markPopGameCompleted]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const animate = () => {
      setBubbles(prev => {
        const updated = prev.map(bubble => ({
          ...bubble,
          y: bubble.y - bubble.speed,
        })).filter(bubble => bubble.y > -100);
        
        return updated;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing" && bubbles.length === 0 && targetWord && !feedback) {
      const timer = setTimeout(() => {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState("gameover");
            markPopGameCompleted();
          } else {
            spawnRound();
          }
          return newLives;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [bubbles.length, gameState, targetWord, feedback, spawnRound, markPopGameCompleted]);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setStreak(0);
    setLives(3);
    setLevel(1);
    setRoundsInLevel(0);
    setWordsPlayed(0);
    setBubbles([]);
    spawnRound();
  };

  const childName = guestData.child?.name || "Guest";

  if (playableWords.length < 3) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500/10 to-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
          <div className="container max-w-2xl mx-auto p-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/guest/child/${childId}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Pop Game</h1>
          </div>
        </div>
        <div className="container max-w-2xl mx-auto p-4 text-center">
          <p className="text-muted-foreground">Need at least 3 words to play!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500/10 to-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="container max-w-2xl mx-auto p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/guest/child/${childId}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {gameState === "playing" && (
              <>
                <Badge variant="secondary" className="gap-1" data-testid="score-display">
                  <Trophy className="h-3 w-3" />
                  {score}
                </Badge>
                <Badge variant="outline" className="gap-1" data-testid="streak-display">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {streak}
                </Badge>
                <Badge variant="outline" data-testid="level-display">
                  Lv.{level}
                </Badge>
                <Badge variant="outline" data-testid="speed-display">
                  {calculateSpeed(level, roundsInLevel).toFixed(1)}x
                </Badge>
              </>
            )}
          </div>
          {gameState === "playing" && (
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={`h-5 w-5 ${i < lives ? "fill-red-500 text-red-500" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div 
        ref={gameAreaRef}
        className="relative w-full overflow-hidden"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {gameState === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-80">
              <CardContent className="p-6 text-center space-y-4">
                <Circle className="h-12 w-12 mx-auto text-blue-500 fill-blue-400" />
                <h2 className="text-xl font-bold">Pop the Word!</h2>
                <p className="text-muted-foreground">
                  Listen for the word, then pop the matching bubble!
                </p>
                <Button onClick={startGame} className="w-full gap-2" data-testid="button-start-game">
                  <Play className="h-4 w-4" />
                  Start Game
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "playing" && targetWord && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <Button
              variant="outline"
              className="gap-2 bg-background/90 backdrop-blur"
              onClick={() => speak(targetWord)}
              data-testid="button-hear-word"
            >
              <Volume2 className="h-4 w-4" />
              Hear Word
            </Button>
          </div>
        )}

        <AnimatePresence>
          {bubbles.map(bubble => (
            <motion.button
              key={bubble.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              style={{
                left: bubble.x,
                top: bubble.y,
                width: bubble.size,
                height: bubble.size,
                fontSize: Math.max(12, bubble.size / 5),
              }}
              onClick={() => popBubble(bubble)}
              data-testid={`bubble-${bubble.word}`}
            >
              {bubble.word}
            </motion.button>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {feedback === "correct" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <Sparkles className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-500">{celebrateWord}</div>
              </div>
            </motion.div>
          )}

          {feedback === "wrong" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <X className="h-16 w-16 text-red-500" />
            </motion.div>
          )}

          {feedback === "levelup" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-6">
                <Star className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">Level {level}!</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur">
            <Card className="w-80">
              <CardContent className="p-6 text-center space-y-4">
                <Gamepad2 className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-bold">Game Over!</h2>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">{score} points</p>
                  <p className="text-muted-foreground">
                    Best streak: {bestStreak} | Words: {wordsPlayed}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button onClick={startGame} className="w-full gap-2" data-testid="button-play-again">
                    <RotateCcw className="h-4 w-4" />
                    Play Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation(`/guest/child/${childId}`)}
                    data-testid="button-back-to-dashboard"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
