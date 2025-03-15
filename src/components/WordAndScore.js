import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

function WordAndScore({ word, points, highlight, allPlayersHaveWord, isRevealed }) {

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


  return (

    <animated.div
      className={`text-white text-center ${!isRevealed ? 'blur-sm' : ''}`}
      style={wordStyle}
    >
      {word} {isRevealed && ` - ${points}`}
    </animated.div>
  );
}

export default WordAndScore;
