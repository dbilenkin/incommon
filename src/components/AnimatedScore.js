import React, { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const AnimatedScore = ({ score, startPosition, endPosition, onRest }) => {
  const [props, set] = useSpring(() => ({
    opacity: 0,
    // width: '100px', 
    // height: '100px',
    fontSize: '40px', // Larger font size
    transform: `translate(${startPosition.x}px, ${startPosition.y}px)`,
    onRest,
  }));

  // First part: Appear using opacity
  useEffect(() => {
    set({ opacity: 1 });
    // Second part: Move after a delay
    const timer = setTimeout(() => {
      set({ transform: `translate(${endPosition.x}px, ${endPosition.y}px)`, fontSize: '10px', opacity: 0 });
    }, 500); // Adjust delay as needed

    return () => clearTimeout(timer);
  }, [set, startPosition, endPosition]);

  return (
    <animated.div style={{
      ...props,
      position: 'absolute',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'white', // Distinct background
      border: '2px solid black', // Fun border
      borderRadius: '50%', // Rounded corners
      // width: '60px', // Fixed width
      // height: '60px', // Fixed height
      // fontSize: '1.5em', // Larger font size
      fontWeight: 'bold',
      padding: '5px',
      color: 'black', // Gold color for the text
    }}>
      +{score}
    </animated.div>
  );
};

export default AnimatedScore;