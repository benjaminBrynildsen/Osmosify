import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, RotateCcw, Star, Mic, MicOff, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Word } from "@shared/schema";
import { 
  initializeVoices, 
  speakWord, 
  startListening, 
  isSpeechRecognitionSupported,
  type RecognitionResult 
} from "@/lib/speech";

interface MasteryModeProps {
  mode: "mastery";
  onWordMastered: (wordId: string) => void;
  onComplete: (masteredWordIds: string[]) => void;
  masteryThreshold?: number;
}

interface HistoryModeProps {
  mode: "history";
  onResult: (wordId: string, isCorrect: boolean) => void;
  onComplete: (results: { wordId: string; isCorrect: boolean }[]) => void;
}

type FlashcardDisplayProps = {
  words: Word[];
  timerSeconds?: number;
} & (MasteryModeProps | HistoryModeProps);

interface WordProgress {
  word: Word;
  sessionCorrectCount: number;
  totalAttempts: number;
}

export function FlashcardDisplay(props: FlashcardDisplayProps) {
  const { words, mode, timerSeconds = 5 } = props;
  const masteryThreshold = mode === "mastery" ? (props.masteryThreshold ?? 7) : 1;

  const [wordProgress, setWordProgress] = useState<Map<string, WordProgress>>(new Map());
  const [queue, setQueue] = useState<string[]>([]);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [historyResults, setHistoryResults] = useState<{ wordId: string; isCorrect: boolean }[]>([]);
  const [showFeedback, setShowFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");

  const [isListening, setIsListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [spokenText, setSpokenText] = useState<string>("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const processingRef = useRef(false);

  const prevWordIdsRef = useRef<string>("");

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
    initializeVoices().then(() => {
      setVoicesReady(true);
    });
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const initializeSession = useCallback(() => {
    const progress = new Map<string, WordProgress>();
    words.forEach(word => {
      progress.set(word.id, {
        word,
        sessionCorrectCount: 0,
        totalAttempts: 0,
      });
    });
    setWordProgress(progress);
    
    const shuffledIds = words.map(w => w.id).sort(() => Math.random() - 0.5);
    setQueue(shuffledIds);
    setMasteredIds([]);
    setHistoryResults([]);
    setTotalCorrect(0);
    setTotalAttempts(0);
    setIsComplete(false);
    setIsInitialized(true);
    setCardKey(0);
    setTimeLeft(timerSeconds);
    setSpokenText("");
    processingRef.current = false;
  }, [words, timerSeconds]);

  useEffect(() => {
    const currentWordIds = words.map(w => w.id).sort().join(",");
    
    if (currentWordIds !== prevWordIdsRef.current) {
      prevWordIdsRef.current = currentWordIds;
      initializeSession();
    }
  }, [words, initializeSession]);

  const currentWordId = queue[0];
  const currentProgress = currentWordId ? wordProgress.get(currentWordId) : null;
  const currentWord = currentProgress?.word;

  const totalWords = words.length;
  const masteredCount = mode === "mastery" ? masteredIds.length : historyResults.length;
  const progressPercent = totalWords > 0 ? (masteredCount / totalWords) * 100 : 0;

  const handleAnswer = useCallback((isCorrect: boolean, fromVoice: boolean = false) => {
    if (!currentWordId || !currentProgress || showFeedback !== null || processingRef.current) return;
    
    processingRef.current = true;
    stopTimer();
    stopListening();

    setShowFeedback(isCorrect ? "correct" : "incorrect");
    setSlideDirection(isCorrect ? "left" : "right");
    setTotalAttempts(prev => prev + 1);
    
    if (isCorrect) {
      setTotalCorrect(prev => prev + 1);
    }

    const newQueue = [...queue];
    newQueue.shift();

    const updatedProgress = new Map(wordProgress);
    const wordProg = { ...currentProgress };
    wordProg.totalAttempts++;
    
    if (isCorrect) {
      wordProg.sessionCorrectCount++;
    }
    updatedProgress.set(currentWordId, wordProg);
    setWordProgress(updatedProgress);

    const feedbackDuration = isCorrect ? 800 : 500;

    if (voicesReady && currentWord) {
      setTimeout(() => {
        speakWord(currentWord.word);
      }, 200);
    }

    setTimeout(() => {
      setShowFeedback(null);
      setCardKey(prev => prev + 1);
      setTimeLeft(timerSeconds);
      setSpokenText("");
      processingRef.current = false;

      if (mode === "history") {
        const result = { wordId: currentWordId, isCorrect };
        const newResults = [...historyResults, result];
        setHistoryResults(newResults);
        (props as HistoryModeProps).onResult(currentWordId, isCorrect);

        if (newQueue.length === 0) {
          setIsComplete(true);
          (props as HistoryModeProps).onComplete(newResults);
        } else {
          setQueue(newQueue);
        }
      } else {
        const wordJustMastered = wordProg.sessionCorrectCount >= masteryThreshold;
        
        if (wordJustMastered) {
          const newMasteredIds = [...masteredIds, currentWordId];
          setMasteredIds(newMasteredIds);
          (props as MasteryModeProps).onWordMastered(currentWordId);
          
          if (newMasteredIds.length >= totalWords) {
            setIsComplete(true);
            (props as MasteryModeProps).onComplete(newMasteredIds);
          } else if (newQueue.length === 0) {
            const remainingWordIds = Array.from(updatedProgress.keys())
              .filter(id => !newMasteredIds.includes(id));
            
            if (remainingWordIds.length === 0) {
              setIsComplete(true);
              (props as MasteryModeProps).onComplete(newMasteredIds);
            } else {
              const shuffled = remainingWordIds.sort(() => Math.random() - 0.5);
              setQueue(shuffled);
            }
          } else {
            setQueue(newQueue);
          }
        } else {
          if (newQueue.length === 0) {
            const remainingWordIds = Array.from(updatedProgress.keys())
              .filter(id => !masteredIds.includes(id));
            
            if (remainingWordIds.length === 0) {
              setIsComplete(true);
              (props as MasteryModeProps).onComplete(masteredIds);
            } else {
              const shuffled = remainingWordIds.sort(() => Math.random() - 0.5);
              setQueue(shuffled);
            }
          } else {
            const minPosition = Math.min(2, newQueue.length);
            const maxPosition = Math.min(4, newQueue.length);
            const insertPosition = Math.floor(Math.random() * (maxPosition - minPosition + 1)) + minPosition;
            newQueue.splice(insertPosition, 0, currentWordId);
            setQueue(newQueue);
          }
        }
      }
    }, feedbackDuration);
  }, [currentWordId, currentProgress, showFeedback, queue, wordProgress, mode, masteredIds, historyResults, totalWords, masteryThreshold, props, stopTimer, stopListening, voicesReady, currentWord, timerSeconds]);

  const startVoiceRecognition = useCallback(() => {
    if (!currentWord || !speechSupported || !voiceEnabled || isListening || showFeedback !== null) return;

    setIsListening(true);
    setSpokenText("");

    recognitionRef.current = startListening(
      currentWord.word,
      (result: RecognitionResult) => {
        setSpokenText(result.transcript);
        if (result.isMatch) {
          handleAnswer(true, true);
        } else if (result.transcript) {
          handleAnswer(false, true);
        }
      },
      (error: string) => {
        console.warn('Recognition error:', error);
      },
      () => {
        setIsListening(false);
      }
    );
  }, [currentWord, speechSupported, voiceEnabled, isListening, showFeedback, handleAnswer]);

  useEffect(() => {
    if (!currentWord || showFeedback !== null || isComplete || !isInitialized) {
      stopTimer();
      return;
    }

    if (voiceEnabled && speechSupported) {
      const startDelay = setTimeout(() => {
        startVoiceRecognition();
      }, 300);
      return () => clearTimeout(startDelay);
    }
  }, [currentWord, showFeedback, isComplete, isInitialized, voiceEnabled, speechSupported, startVoiceRecognition, stopTimer]);

  useEffect(() => {
    if (!currentWord || showFeedback !== null || isComplete || !isInitialized) {
      stopTimer();
      return;
    }

    setTimeLeft(timerSeconds);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          if (!processingRef.current) {
            handleAnswer(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopTimer();
  }, [cardKey, currentWord, showFeedback, isComplete, isInitialized, timerSeconds, stopTimer, handleAnswer]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopListening();
    };
  }, [stopTimer, stopListening]);

  const speakCurrentWord = () => {
    if (currentWord && voicesReady) {
      speakWord(currentWord.word);
    }
  };

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-4" data-testid="flashcard-empty">
        <p className="text-lg font-medium text-foreground mb-2">No words to prepare</p>
        <p className="text-sm text-muted-foreground text-center">
          {mode === "mastery"
            ? "All words have been unlocked! Use 'Keep Words Strong' to review."
            : "No words available for review."}
        </p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isComplete) {
    if (mode === "history") {
      const correctCount = historyResults.filter(r => r.isCorrect).length;
      const percentage = Math.round((correctCount / historyResults.length) * 100);

      return (
        <motion.div 
          className="flex flex-col items-center justify-center min-h-96 p-4 space-y-6" 
          data-testid="flashcard-complete"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <p className="text-5xl font-bold text-primary mb-2">{percentage}%</p>
            <p className="text-lg font-medium text-foreground">
              {correctCount} of {historyResults.length} correct
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {percentage >= 80 ? "Great job!" : percentage >= 60 ? "Keep practicing!" : "Don't give up!"}
            </p>
          </div>
          <Button onClick={initializeSession} className="gap-2" data-testid="button-restart-session">
            <RotateCcw className="h-4 w-4" />
            Review Again
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-96 p-4 space-y-6" 
        data-testid="flashcard-complete"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center relative">
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
          </motion.div>
          <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            {masteredIds.length} / {totalWords}
          </p>
          <p className="text-lg font-medium text-foreground">
            Words Unlocked!
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {totalCorrect} correct out of {totalAttempts} total attempts
          </p>
        </div>
        <Button onClick={initializeSession} className="gap-2" data-testid="button-restart-session">
          <RotateCcw className="h-4 w-4" />
          Continue Preparing
        </Button>
      </motion.div>
    );
  }

  if (!currentWord || !currentProgress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const cardVariants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "left" ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "left" ? -300 : 300,
      opacity: 0,
    }),
  };

  const timerPercent = (timeLeft / timerSeconds) * 100;

  return (
    <div className="flex flex-col h-full" data-testid="flashcard-active">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-2">
          {mode === "mastery" ? (
            <>
              <span>{masteredIds.length} of {totalWords} unlocked</span>
              <span className="text-xs">
                This word: {currentProgress.sessionCorrectCount} / {masteryThreshold}
              </span>
            </>
          ) : (
            <>
              <span>{historyResults.length + 1} of {totalWords}</span>
              <span className="text-xs">Keep Words Strong</span>
            </>
          )}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
              timeLeft <= 2 ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 
              timeLeft <= 3 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
              'bg-muted text-muted-foreground'
            }`}>
              <span data-testid="text-timer">{timeLeft}s</span>
            </div>
            <Progress 
              value={timerPercent} 
              className={`w-20 h-2 ${timeLeft <= 2 ? '[&>div]:bg-red-500' : timeLeft <= 3 ? '[&>div]:bg-amber-500' : ''}`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {speechSupported && (
              <Button
                size="icon"
                variant={voiceEnabled ? "default" : "outline"}
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                data-testid="button-toggle-voice"
                className="relative"
              >
                {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={speakCurrentWord}
              disabled={!voicesReady}
              data-testid="button-speak-word"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isListening && (
          <div className="mt-2 text-center">
            <p className="text-sm text-muted-foreground">
              {spokenText ? (
                <span>Heard: "<span className="font-medium text-foreground">{spokenText}</span>"</span>
              ) : (
                <span className="animate-pulse">Listening... say the word!</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={cardKey}
            custom={slideDirection}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
          >
            <Card
              className={`min-h-80 flex items-center justify-center transition-colors duration-300 relative overflow-visible ${
                showFeedback === "correct"
                  ? "bg-emerald-500 border-emerald-500"
                  : showFeedback === "incorrect"
                  ? "bg-red-500/20 border-red-500"
                  : ""
              }`}
              data-testid="flashcard-word-display"
            >
              <CardContent className="p-8 text-center relative">
                {showFeedback === "correct" && (
                  <>
                    <motion.div
                      className="absolute top-2 left-4"
                      initial={{ opacity: 0, scale: 0, rotate: -30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <Star className="h-8 w-8 text-yellow-300 fill-yellow-300 drop-shadow" />
                    </motion.div>
                    <motion.div
                      className="absolute top-4 right-6"
                      initial={{ opacity: 0, scale: 0, rotate: 30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <Star className="h-6 w-6 text-yellow-300 fill-yellow-300 drop-shadow" />
                    </motion.div>
                    <motion.div
                      className="absolute bottom-20 left-8"
                      initial={{ opacity: 0, scale: 0, rotate: -15 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                    >
                      <Star className="h-5 w-5 text-yellow-300 fill-yellow-300 drop-shadow" />
                    </motion.div>
                    <motion.div
                      className="absolute bottom-24 right-4"
                      initial={{ opacity: 0, scale: 0, rotate: 15 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
                    >
                      <Star className="h-7 w-7 text-yellow-300 fill-yellow-300 drop-shadow" />
                    </motion.div>
                  </>
                )}
                
                {showFeedback === "incorrect" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2"
                  >
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">Try again!</p>
                  </motion.div>
                )}

                <motion.p
                  className={`text-5xl md:text-6xl font-bold break-words ${
                    showFeedback === "correct" 
                      ? "text-white" 
                      : showFeedback === "incorrect"
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  }`}
                  data-testid="text-flashcard-word"
                  animate={showFeedback === "incorrect" ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {currentWord.word}
                </motion.p>
                
                {mode === "mastery" && (
                  <div className="mt-6 flex justify-center gap-1">
                    {Array.from({ length: masteryThreshold }).map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          i < currentProgress.sessionCorrectCount
                            ? showFeedback === "correct" ? "bg-yellow-300" : "bg-emerald-500"
                            : showFeedback === "correct" ? "bg-white/30" : "bg-muted"
                        }`}
                        initial={i === currentProgress.sessionCorrectCount - 1 && showFeedback === "correct" ? { scale: 0 } : {}}
                        animate={i === currentProgress.sessionCorrectCount - 1 && showFeedback === "correct" ? { scale: [0, 1.5, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-4 border-t">
        <p className="text-center text-xs text-muted-foreground mb-3">
          {voiceEnabled && speechSupported ? "Say the word or tap a button" : "Parent: Mark as correct or incorrect"}
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-red-500/30 text-red-600 dark:text-red-400"
            onClick={() => handleAnswer(false)}
            disabled={showFeedback !== null}
            data-testid="button-incorrect"
          >
            <X className="h-6 w-6 mr-2" />
            Incorrect
          </Button>
          <Button
            size="lg"
            className="h-16 text-lg font-semibold bg-emerald-600 text-white"
            onClick={() => handleAnswer(true)}
            disabled={showFeedback !== null}
            data-testid="button-correct"
          >
            <Check className="h-6 w-6 mr-2" />
            Correct
          </Button>
        </div>
      </div>
    </div>
  );
}
