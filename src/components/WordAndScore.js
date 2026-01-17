import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

function WordAndScore({ word, points, highlight, allPlayersHaveWord, isRevealed, isCrossedOut }) {

  // Combined flip, scale, and translate animation
  const [{ transform, boxShadow }, set] = useSpring(() => ({
    transform: `scale(1)`,
    config: { mass: 5, tension: 300, friction: 100 }
  }));


  useEffect(() => {
    if (highlight) {
      console.log({ highlight });
      set({
        transform: `scale(1.5)`
      });

      setTimeout(() => {
        set({
          transform: `scale(1)`
        });
      }, 1500);
    }
  }, [highlight])

  const wordStyle ={
    transform
  }

  const getPointsDisplay = () => {
    if (!isRevealed) return null;
    if (isCrossedOut) {
      return <span className="text-red-400 ml-1">(0)</span>;
    }
    return <span className="text-green-400 ml-1">+{points}</span>;
  };

  return (

    <animated.div
      className={`text-center ${!isRevealed ? 'blur-sm text-white' : ''} ${isCrossedOut ? 'line-through text-gray-500' : 'text-white'}`}
      style={wordStyle}
    >
      {word}{getPointsDisplay()}
    </animated.div>
  );
}

export default WordAndScore;
