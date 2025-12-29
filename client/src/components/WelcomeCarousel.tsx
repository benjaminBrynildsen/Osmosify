import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Brain, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";

interface WelcomeCarouselProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Brain,
    title: "Reading is Memory",
    description: "Your child already knows these words from speaking - they just need to connect the sounds they know to letters on the page.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: BookOpen,
    title: "Learn by Osmosis",
    description: "Consistent exposure fills the gaps naturally, just like how they learned to talk - through repetition and everyday practice.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Sparkles,
    title: "Practice Makes Progress",
    description: "A few minutes each day builds lasting reading confidence. Small, consistent steps lead to big breakthroughs.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export function WelcomeCarousel({ onComplete }: WelcomeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("osmosify_welcome_seen", "true");
    onComplete();
  };

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <div className={`w-24 h-24 rounded-full ${slide.bgColor} flex items-center justify-center mb-8`}>
              <Icon className={`w-12 h-12 ${slide.color}`} />
            </div>
            
            <h2 className="text-2xl font-bold mb-4" data-testid={`welcome-title-${currentSlide}`}>
              {slide.title}
            </h2>
            
            <p className="text-muted-foreground text-lg leading-relaxed" data-testid={`welcome-description-${currentSlide}`}>
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide 
                  ? "bg-primary w-8" 
                  : "bg-muted-foreground/30"
              }`}
              data-testid={`welcome-dot-${index}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              className="flex-1"
              data-testid="button-welcome-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          
          {isLastSlide ? (
            <Button
              size="lg"
              onClick={handleComplete}
              className="flex-1"
              data-testid="button-welcome-start"
            >
              Get Started
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              className="flex-1"
              data-testid="button-welcome-next"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        <button
          onClick={handleComplete}
          className="w-full text-center text-sm text-muted-foreground"
          data-testid="button-welcome-skip"
        >
          Skip introduction
        </button>
      </div>
    </div>
  );
}

export function useWelcomeSeen() {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("osmosify_welcome_seen") === "true";
    setHasSeenWelcome(seen);
  }, []);

  const markWelcomeSeen = () => {
    localStorage.setItem("osmosify_welcome_seen", "true");
    setHasSeenWelcome(true);
  };

  return { hasSeenWelcome, markWelcomeSeen };
}
