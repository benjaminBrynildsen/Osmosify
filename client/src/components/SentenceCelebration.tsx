import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Volume2, ArrowRight, Mic, MicOff } from "lucide-react";
import { 
  startCollectiveListening, 
  isSpeechRecognitionSupported,
  speakWord,
} from "@/lib/speech";
import { useGifCelebration } from "./GifCelebration";

interface SentenceCelebrationProps {
  childId?: string;
  masteredWords: string[];
  supportWords?: string[];
  onComplete: () => void;
  gifCelebrationsEnabled?: boolean;
}

export function SentenceCelebration({ childId, masteredWords, supportWords = [], onComplete, gifCelebrationsEnabled = true }: SentenceCelebrationProps) {
  const [sentence, setSentence] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [completedWords, setCompletedWords] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const speechSupported = isSpeechRecognitionSupported();
  const recognitionStartedRef = useRef(false);
  const completionTriggeredRef = useRef(false);
  
  const { celebrate, GifCelebrationComponent } = useGifCelebration();

  useEffect(() => {
    generateSentence();
  }, []);

  const generateSentence = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: masteredWords, supportWords }),
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
    recognitionStartedRef.current = false;
  }, []);

  const handleCompletion = useCallback(async () => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;
    
    setIsComplete(true);
    playBigCelebrationSound();
    if (gifCelebrationsEnabled) {
      celebrate("correct");
    }
    stopListening();
    
    if (childId) {
      try {
        await fetch(`/api/children/${childId}/increment-sentences-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Failed to increment sentences read:", err);
      }
    }
  }, [childId, gifCelebrationsEnabled, celebrate, stopListening]);

  const handleWordsMatched = useCallback((matchedIndices: Set<number>) => {
    setCompletedWords(prev => {
      const newCompleted = new Set([...Array.from(prev), ...Array.from(matchedIndices)]);
      
      // Play sound for new matches
      if (newCompleted.size > prev.size) {
        playWordSuccessSound();
      }
      
      // Check if all words are complete
      if (newCompleted.size >= words.length && words.length > 0 && !completionTriggeredRef.current) {
        setTimeout(() => handleCompletion(), 300);
      }
      
      return newCompleted;
    });
  }, [words.length, handleCompletion]);

  const startRecognition = useCallback(() => {
    if (!speechSupported || !voiceEnabled || words.length === 0) return;
    if (recognitionStartedRef.current) return;
    
    recognitionStartedRef.current = true;
    setIsListening(true);
    
    recognitionRef.current = startCollectiveListening(
      words,
      handleWordsMatched,
      (transcript: string) => {
        setSpokenText(transcript);
      },
      (error: string) => {
        console.warn('Recognition error:', error);
      },
      () => {
        setIsListening(false);
        recognitionStartedRef.current = false;
      }
    );
  }, [speechSupported, voiceEnabled, words, handleWordsMatched]);

  // Start collective recognition once when words are loaded
  useEffect(() => {
    if (!isComplete && words.length > 0 && voiceEnabled && speechSupported && !recognitionStartedRef.current) {
      const timer = setTimeout(() => {
        startRecognition();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [words.length, isComplete, voiceEnabled, speechSupported, startRecognition]);

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
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
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

  const handleMarkAllRead = () => {
    const allIndices = new Set(words.map((_, i) => i));
    setCompletedWords(allIndices);
    setTimeout(() => handleCompletion(), 300);
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
        
        {gifCelebrationsEnabled && GifCelebrationComponent}
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
              
              return (
                <motion.span
                  key={index}
                  className={`px-2 py-1 rounded transition-colors ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : "text-foreground"
                  }`}
                  animate={isCompleted ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.2 }}
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
              <span className="animate-pulse">Listening... read the sentence naturally</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-auto">
        <Button
          className="w-full"
          size="lg"
          variant="outline"
          onClick={handleMarkAllRead}
          data-testid="button-mark-all-read"
        >
          Mark Sentence as Read
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {completedWords.size} of {words.length} words recognized
        </p>
      </div>
      
      {gifCelebrationsEnabled && GifCelebrationComponent}
    </div>
  );
}
