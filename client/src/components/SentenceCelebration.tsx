import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Volume2, ArrowRight, Mic, MicOff } from "lucide-react";
import { 
  startListening, 
  isSpeechRecognitionSupported,
  speakWord,
  type RecognitionResult 
} from "@/lib/speech";

interface SentenceCelebrationProps {
  masteredWords: string[];
  onComplete: () => void;
}

export function SentenceCelebration({ masteredWords, onComplete }: SentenceCelebrationProps) {
  const [sentence, setSentence] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [completedWords, setCompletedWords] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<{ stop: () => void; updateTargetWord: (word: string) => void } | null>(null);
  const speechSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    generateSentence();
  }, []);

  const generateSentence = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: masteredWords }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate sentence");
      }
      
      const data = await response.json();
      setSentence(data.sentence);
      const sentenceWords = data.sentence.split(/\s+/).filter((w: string) => w.length > 0);
      setWords(sentenceWords);
      setIsLoading(false);
    } catch (err) {
      console.error("Sentence generation error:", err);
      const fallbackSentence = createFallbackSentence(masteredWords);
      setSentence(fallbackSentence);
      const sentenceWords = fallbackSentence.split(/\s+/).filter(w => w.length > 0);
      setWords(sentenceWords);
      setIsLoading(false);
    }
  };

  const createFallbackSentence = (wordList: string[]): string => {
    const templates = [
      `I can read ${wordList[0] || "words"} and ${wordList[1] || "more"}.`,
      `The ${wordList[0] || "word"} is fun to say.`,
      `Look at ${wordList[0] || "this"} and ${wordList[1] || "that"}.`,
      `I like to read ${wordList.slice(0, 3).join(" and ")}.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (!speechSupported || !voiceEnabled || currentWordIndex >= words.length) return;

    const targetWord = words[currentWordIndex].replace(/[.,!?;:'"]/g, "").toLowerCase();
    
    setIsListening(true);
    
    recognitionRef.current = startListening(
      targetWord,
      (result: RecognitionResult) => {
        setSpokenText(result.transcript);
        markWordComplete(currentWordIndex);
      },
      (result: RecognitionResult) => {
        if (result.transcript) {
          setSpokenText(result.transcript);
          const spoken = result.transcript.toLowerCase();
          if (spoken.includes(targetWord)) {
            markWordComplete(currentWordIndex);
          }
        }
      },
      (error: string) => {
        console.warn('Recognition error:', error);
      },
      () => {
        setIsListening(false);
      }
    );
  }, [speechSupported, voiceEnabled, currentWordIndex, words]);

  const markWordComplete = useCallback((index: number) => {
    stopListening();
    
    const newCompleted = new Set(completedWords);
    newCompleted.add(index);
    setCompletedWords(newCompleted);
    setSpokenText("");
    
    playWordSuccessSound();
    
    if (newCompleted.size >= words.length) {
      setTimeout(() => {
        setIsComplete(true);
        playBigCelebrationSound();
      }, 500);
    } else {
      const nextIndex = index + 1;
      if (nextIndex < words.length) {
        setCurrentWordIndex(nextIndex);
      }
    }
  }, [completedWords, words.length, stopListening]);

  useEffect(() => {
    if (!isComplete && words.length > 0 && currentWordIndex < words.length && voiceEnabled && speechSupported) {
      const timer = setTimeout(() => {
        startRecognition();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWordIndex, words.length, isComplete, voiceEnabled, speechSupported, startRecognition]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const playWordSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {}
  };

  const playBigCelebrationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.15);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.4);
        oscillator.start(audioContext.currentTime + i * 0.15);
        oscillator.stop(audioContext.currentTime + i * 0.15 + 0.4);
      });
    } catch (e) {}
  };

  const speakSentence = () => {
    if (sentence) {
      speakWord(sentence, "shimmer");
    }
  };

  const handleManualWordComplete = () => {
    if (currentWordIndex < words.length) {
      markWordComplete(currentWordIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Star className="h-12 w-12 text-yellow-500" />
        </motion.div>
        <p className="mt-4 text-muted-foreground">Creating a special sentence for you...</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <motion.div 
        className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: -50,
                rotate: 0,
                scale: 0.5 + Math.random() * 0.5
              }}
              animate={{ 
                y: window.innerHeight + 50,
                rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
            >
              <Star className="h-8 w-8 text-yellow-300 fill-yellow-300" />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="relative z-10 text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
        >
          <div className="flex justify-center gap-2 mb-4">
            <Star className="h-12 w-12 text-yellow-300 fill-yellow-300" />
            <Star className="h-16 w-16 text-yellow-300 fill-yellow-300" />
            <Star className="h-12 w-12 text-yellow-300 fill-yellow-300" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Amazing!</h1>
          <p className="text-xl text-white/90 mb-6">You read the whole sentence!</p>
          
          <Card className="bg-white/20 border-white/30 mb-6">
            <CardContent className="p-4">
              <p className="text-lg text-white font-medium">{sentence}</p>
            </CardContent>
          </Card>
          
          <Button 
            size="lg" 
            onClick={onComplete}
            className="bg-white text-emerald-600 gap-2"
            data-testid="button-continue-after-sentence"
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4" data-testid="sentence-celebration">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Great job!</h2>
        <p className="text-muted-foreground">Now read this sentence out loud:</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <Button
          size="icon"
          variant="outline"
          onClick={speakSentence}
          data-testid="button-speak-sentence"
        >
          <Volume2 className="h-5 w-5" />
        </Button>
        {speechSupported && (
          <Button
            size="icon"
            variant={voiceEnabled ? "default" : "outline"}
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) stopListening();
            }}
            data-testid="button-toggle-sentence-voice"
          >
            {voiceEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2 justify-center text-2xl">
            {words.map((word, index) => {
              const isCompleted = completedWords.has(index);
              const isCurrent = index === currentWordIndex && !isComplete;
              
              return (
                <motion.span
                  key={index}
                  className={`px-2 py-1 rounded transition-colors ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-primary/20 text-primary underline"
                      : "text-foreground"
                  }`}
                  animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  data-testid={`sentence-word-${index}`}
                >
                  {word}
                </motion.span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isListening && voiceEnabled && (
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            {spokenText ? (
              <span>Heard: "<span className="font-medium text-foreground">{spokenText}</span>"</span>
            ) : (
              <span className="animate-pulse">Listening... say "{words[currentWordIndex]?.replace(/[.,!?;:'"]/g, "")}"</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-auto">
        <Button
          className="w-full"
          size="lg"
          onClick={handleManualWordComplete}
          disabled={currentWordIndex >= words.length}
          data-testid="button-mark-word-read"
        >
          Mark "{words[currentWordIndex]?.replace(/[.,!?;:'"]/g, "")}" as Read
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {completedWords.size} of {words.length} words read
        </p>
      </div>
    </div>
  );
}
