import React, { useState, useEffect } from 'react';

const TimerBar = ({ duration }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [width, setWidth] = useState('100%');

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prevTimeLeft => {
          const newTimeLeft = prevTimeLeft - 1;
          setWidth(`${(newTimeLeft / duration) * 100}%`);
          return newTimeLeft;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, duration]);

  const getColor = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage <= 20) {
      return 'bg-red-500';
    } else if (percentage <= 40) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  return (
    <div className="w-full h-4 bg-gray-700 rounded">
      <div
        className={`h-full rounded ${getColor()}`}
        style={{ width }}
      ></div>
    </div>
  );
};

export default TimerBar;
