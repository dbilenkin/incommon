import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useTranslation } from 'react-i18next';

function WordAndScore({ word, points, highlight, allPlayersHaveWord, isRevealed, isCrossedOut, blurUnrevealed = false }) {
  const { t } = useTranslation('common');
  const [showEmoji, setShowEmoji] = useState(false);
  const wordLength = word?.length || 0;

  // Get animation config based on word length (only 5+ get special animations)
  const getAnimationConfig = () => {
    if (wordLength >= 7) {
      return { scale: 1.8, duration: 1000, emoji: '', text: t('celebration.incredible'), textClass: 'text-3xl text-yellow-400 font-black italic animate-pulse', hasEmoji: true };
    } else if (wordLength === 6) {
      return { scale: 1.6, duration: 800, emoji: '', text: t('celebration.amazing'), textClass: 'text-2xl text-yellow-300 font-bold italic', hasEmoji: true };
    } else if (wordLength === 5) {
      return { scale: 1.4, duration: 600, emoji: '', text: t('celebration.nice'), textClass: 'text-xl text-blue-300 font-semibold', hasEmoji: true };
    } else {
      return { scale: 1.2, duration: 500, emoji: '', text: '', textClass: '', hasEmoji: false };
    }
  };

  const animConfig = getAnimationConfig();

  // Combined flip, scale, and translate animation
  const [{ transform }, set] = useSpring(() => ({
    transform: `scale(1) rotate(0deg)`,
    config: { mass: 5, tension: 300, friction: 100 }
  }));

  // Emoji animation - floats up above the word
  const emojiSpring = useSpring({
    opacity: showEmoji ? 1 : 0,
    transform: showEmoji ? 'translateY(-40px) scale(1)' : 'translateY(0px) scale(0)',
    config: { tension: 300, friction: 20 }
  });

  useEffect(() => {
    if (highlight && points > 0) {
      // Show emoji only for 5+ letter words
      if (animConfig.hasEmoji) {
        setShowEmoji(true);
      }

      // Animate based on word length
      if (wordLength >= 7) {
        // Epic animation for 7+ letters
        set({ transform: `scale(${animConfig.scale}) rotate(5deg)` });
        setTimeout(() => set({ transform: `scale(${animConfig.scale}) rotate(-5deg)` }), 200);
        setTimeout(() => set({ transform: `scale(${animConfig.scale}) rotate(3deg)` }), 400);
        setTimeout(() => set({ transform: `scale(1) rotate(0deg)` }), animConfig.duration);
      } else if (wordLength === 6) {
        // Great animation for 6 letters
        set({ transform: `scale(${animConfig.scale}) rotate(3deg)` });
        setTimeout(() => set({ transform: `scale(${animConfig.scale}) rotate(-3deg)` }), 300);
        setTimeout(() => set({ transform: `scale(1) rotate(0deg)` }), animConfig.duration);
      } else if (wordLength === 5) {
        // Nice pop for 5 letters
        set({ transform: `scale(${animConfig.scale}) rotate(0deg)` });
        setTimeout(() => set({ transform: `scale(1) rotate(0deg)` }), animConfig.duration);
      } else {
        // Simple scale for 4 letters or less
        set({ transform: `scale(${animConfig.scale}) rotate(0deg)` });
        setTimeout(() => set({ transform: `scale(1) rotate(0deg)` }), animConfig.duration);
      }

      // Hide emoji after animation
      if (animConfig.hasEmoji) {
        setTimeout(() => setShowEmoji(false), animConfig.duration);
      }
    } else if (highlight) {
      // Simple scale for 0 points
      set({ transform: `scale(1.2) rotate(0deg)` });
      setTimeout(() => set({ transform: `scale(1) rotate(0deg)` }), 800);
    }
  }, [highlight]);

  const wordStyle = {
    transform
  };

  const getPointsDisplay = () => {
    if (!isRevealed) return null;
    if (isCrossedOut || points === 0) {
      return <span className="text-red-400 ml-1">(0)</span>;
    }
    return <span className="text-green-400 ml-1">+{points}</span>;
  };

  return (
    <div className="relative">
      <animated.div
        className={`text-center ${blurUnrevealed && !isRevealed ? 'blur-sm' : ''} ${isCrossedOut ? 'line-through text-gray-500' : 'text-white'}`}
        style={wordStyle}
      >
        {word}{getPointsDisplay()}
      </animated.div>
      {/* Floating celebration for 5+ letter words with points */}
      {points > 0 && animConfig.hasEmoji && (
        <animated.div
          style={emojiSpring}
          className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap flex items-center gap-1"
        >
          <span className={animConfig.textClass}>{animConfig.text}</span>
        </animated.div>
      )}
    </div>
  );
}

export default WordAndScore;
