import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import all GIFs from both categories using Vite's glob import
const correctGifs = import.meta.glob("@assets/gifs/correct/*.gif", { eager: true, import: "default" }) as Record<string, string>;
const incorrectGifs = import.meta.glob("@assets/gifs/incorrect/*.gif", { eager: true, import: "default" }) as Record<string, string>;

// Convert to arrays
const correctGifUrls = Object.values(correctGifs);
const incorrectGifUrls = Object.values(incorrectGifs);

export type GifCategory = "correct" | "incorrect";

interface GifCelebrationProps {
  show: boolean;
  category: GifCategory;
  onComplete?: () => void;
  duration?: number;
}

export function GifCelebration({ 
  show, 
  category, 
  onComplete, 
  duration = 2500 
}: GifCelebrationProps) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  const getRandomGif = useCallback((cat: GifCategory): string | null => {
    const gifs = cat === "correct" ? correctGifUrls : incorrectGifUrls;
    if (gifs.length === 0) return null;
    return gifs[Math.floor(Math.random() * gifs.length)];
  }, []);

  useEffect(() => {
    if (show) {
      const randomGif = getRandomGif(category);
      setGifUrl(randomGif);

      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, category, duration, onComplete, getRandomGif]);

  return (
    <AnimatePresence>
      {show && gifUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onComplete}
          data-testid="gif-celebration-overlay"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative max-w-sm mx-4"
          >
            <img
              src={gifUrl}
              alt={category === "correct" ? "Celebration!" : "Try again!"}
              className="rounded-lg shadow-2xl max-h-[60vh] object-contain"
              data-testid={`gif-${category}`}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for easier usage in components
export function useGifCelebration() {
  const [showGif, setShowGif] = useState(false);
  const [category, setCategory] = useState<GifCategory>("correct");

  const celebrate = useCallback((cat: GifCategory = "correct") => {
    setCategory(cat);
    setShowGif(true);
  }, []);

  const hideGif = useCallback(() => {
    setShowGif(false);
  }, []);

  return {
    showGif,
    category,
    celebrate,
    hideGif,
    GifCelebrationComponent: (
      <GifCelebration
        show={showGif}
        category={category}
        onComplete={hideGif}
      />
    ),
  };
}
