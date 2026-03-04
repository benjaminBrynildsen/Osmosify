import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, ArrowRight, Sparkles, Flame, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonTransitionProps {
  fromLabel: string;
  toLabel: string;
  toIcon: "flashcards" | "lava-letters" | "sentence";
  encouragement: string;
  statLine?: string;
  onContinue: () => void;
  autoAdvanceMs?: number;
}

const ICONS = {
  flashcards: Sparkles,
  "lava-letters": Flame,
  sentence: MessageSquareText,
};

export function LessonTransition({
  fromLabel,
  toLabel,
  toIcon,
  encouragement,
  statLine,
  onContinue,
  autoAdvanceMs = 4000,
}: LessonTransitionProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoAdvanceMs / 1000));
  const NextIcon = ICONS[toIcon];

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onContinue, autoAdvanceMs]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/90 to-primary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Floating stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
              y: -30,
              rotate: 0,
              scale: 0.4 + Math.random() * 0.6,
            }}
            animate={{
              y: (typeof window !== "undefined" ? window.innerHeight : 800) + 30,
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            }}
            transition={{
              duration: 2.5 + Math.random() * 2,
              delay: Math.random() * 1.5,
              repeat: Infinity,
              repeatDelay: Math.random() * 2,
            }}
          >
            <Star className="h-6 w-6 text-yellow-300/60 fill-yellow-300/60" />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative z-10 text-center"
        initial={{ scale: 0.5, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <motion.div
          className="flex justify-center gap-1 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Star className="h-8 w-8 text-yellow-300 fill-yellow-300" />
          <Star className="h-10 w-10 text-yellow-300 fill-yellow-300" />
          <Star className="h-8 w-8 text-yellow-300 fill-yellow-300" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-1">{encouragement}</h1>
        {statLine && (
          <p className="text-lg text-white/80 mb-6">{statLine}</p>
        )}

        <motion.div
          className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-white/20 rounded-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <NextIcon className="h-5 w-5 text-white" />
          <span className="text-white font-semibold">Up Next: {toLabel}</span>
        </motion.div>

        <Button
          size="lg"
          onClick={onContinue}
          className="bg-white text-primary hover:bg-white/90 gap-2 min-w-[200px]"
        >
          Let's Go!
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-sm text-white/60 mt-3">
          Starting in {countdown}...
        </p>
      </motion.div>
    </motion.div>
  );
}
