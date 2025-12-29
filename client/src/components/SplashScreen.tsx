import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/Osmosify_1767037300178.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    if (!isVisible) {
      onComplete();
    }
  };

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          data-testid="splash-screen"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ 
              duration: 0.6, 
              ease: "easeOut",
              exit: { duration: 0.4 }
            }}
            className="flex flex-col items-center"
          >
            <img
              src={logoPath}
              alt="Osmosify"
              className="w-64 h-auto max-w-[80vw]"
              data-testid="splash-logo"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
