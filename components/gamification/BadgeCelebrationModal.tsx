"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

type Badge = {
  name: string;
  description: string;
  icon: string;
  rewardAmount: number;
};

interface BadgeCelebrationModalProps {
  badge: Badge | null;
  onClose: () => void;
}

export default function BadgeCelebrationModal({
  badge,
  onClose,
}: BadgeCelebrationModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (badge) {
      setShow(true);
      
      // Trigger confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#00ff87", "#60efff", "#f0ff00"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#00ff87", "#60efff", "#f0ff00"],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [badge]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {show && badge && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-gradient-to-br from-card via-card to-green/5 border-2 border-green/30 rounded-3xl p-8 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="text-center space-y-6">
                {/* Badge Icon with Animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    damping: 10,
                    stiffness: 100,
                    delay: 0.2,
                  }}
                  className="relative inline-block"
                >
                  <div className="text-8xl">{badge.icon}</div>
                  
                  {/* Sparkle Effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </motion.div>
                </motion.div>

                {/* Text Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="inline-block px-4 py-1.5 rounded-full bg-green/20 text-green text-sm font-bold uppercase tracking-wider">
                    🎉 Badge Unlocked!
                  </div>
                  
                  <h2 className="text-3xl font-black text-card-foreground">
                    {badge.name}
                  </h2>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {badge.description}
                  </p>

                  {badge.rewardAmount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="pt-4"
                    >
                      <div className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-green to-emerald-400 text-white">
                        <p className="text-sm font-bold uppercase tracking-wide mb-1">
                          Reward
                        </p>
                        <p className="text-2xl font-black">
                          ₦{badge.rewardAmount.toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Continue Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={handleClose}
                  className="w-full btn-primary py-4 text-lg font-bold"
                >
                  Continue
                </motion.button>
              </div>

              {/* Background Decoration */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -top-20 -left-20 w-40 h-40 bg-green rounded-full blur-3xl"
                />
                <motion.div
                  animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.1, 0.2, 0.1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.5,
                  }}
                  className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl"
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
