import { motion } from "framer-motion";
import { Check, Gamepad2, Sparkles, Flame, MessageSquareText } from "lucide-react";

const STEPS = [
  { key: "word-pop", label: "Word Pop", icon: Gamepad2 },
  { key: "flashcards", label: "Flashcards", icon: Sparkles },
  { key: "lava-letters", label: "Lava Letters", icon: Flame },
  { key: "sentence", label: "Sentence", icon: MessageSquareText },
];

interface LessonProgressStepperProps {
  currentStep: "word-pop" | "flashcards" | "lava-letters" | "sentence";
  skippedSteps?: string[];
}

export function LessonProgressStepper({ currentStep, skippedSteps = [] }: LessonProgressStepperProps) {
  const visibleSteps = STEPS.filter(s => !skippedSteps.includes(s.key));
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2 bg-muted/50 border-b">
      {visibleSteps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = isComplete ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div className={`w-6 h-0.5 mx-0.5 rounded-full transition-colors ${
                i <= currentIndex ? "bg-primary" : "bg-muted-foreground/20"
              }`} />
            )}
            <motion.div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isComplete
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
              animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0, repeatDelay: 2 }}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{step.label}</span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
