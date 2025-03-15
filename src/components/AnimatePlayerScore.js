import React, { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const AnimatedPlayerScore = ({ score, onRest }) => {
  const [props, set] = useSpring(() => ({
    transform: 'scale(1)', // Initial scale
    // onRest,
  }));

  useEffect(() => {
    set({ transform: 'scale(1.5)' }); // Enlarge
    const timer = setTimeout(() => {
      set({ transform: 'scale(1)' }); // Shrink back to normal size
    }, 500);

    return () => clearTimeout(timer);
  }, [set]);

  return (
    <animated.div style={{
      ...props,
      position: 'absolute',
      display: 'flex',
      justifyContent: 'center', // Center content horizontally
      alignItems: 'start', // Center content vertically
      width: '100%', // Take full width to allow horizontal centering
      height: '100%', // Take full height to allow vertical centering
    }}>
      {score}
    </animated.div>
  );
};

export default AnimatedPlayerScore;
