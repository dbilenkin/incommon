import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import './HostCard.css';
import cardback from './card-back.jpg';

function HostCard({ deck, cardIndex, placeholder, flip, position, backToChosenCards, highlight, size, showName, flyAway }) {

  const [isFlyAway, setIsFlyAway] = useState(false);
  // const [cardSize, setCardSize] = useState({ width: 100, height: 140 });

  const translateY = position;

  // Combined flip, scale, and translate animation
  const [{ transform, opacity, zIndex, boxShadow }, set] = useSpring(() => ({
    boxShadow: '0 12.5px 10px -10px rgba(50, 50, 73, 0.4)',
    opacity: 1,
    transform: `perspective(600px) rotateY(0deg) scale(1)`,
    zIndex: 0,
    config: { mass: 5, tension: 300, friction: 100 }
  }));

  // Trigger fly-away animation
  useEffect(() => {
    if (flyAway && !isFlyAway) {
      console.log({flyAway});
      const up = Math.random() > .5 ? 1 : -1;
      const randomX = Math.random() * window.innerWidth; // Random X offscreen
      const randomY = 3000 * up; // Random Y offscreen
      // const randomY = Math.random() * (window.innerHeight * 2) - window.innerHeight; // Random Y offscreen

      const randomRotate = Math.random() * 720 - 360; // Random rotation

      set({
        to: {
          transform: `translateX(${randomX}px) translateY(${randomY}px) rotateY(180deg) scale(1)`
        },
        from: {
          transform: 'translateX(0px) translateY(0px) rotateY(180deg) scale(1)'
        },
        config: { mass: 1, tension: 200, friction: 300 }
      });

      setIsFlyAway(true); // Prevent re-triggering the animation
    }
  }, [flyAway, isFlyAway, set]);

  useEffect(() => {
    if (flyAway) return;
    set({
      transform: `perspective(600px) rotateY(${flip ? 180 : 0}deg) scale(${flip ? 1.2 : 1}) translateY(${flip ? translateY : '0px'})`,
      zIndex: flip ? 10 : 0,
      opacity: flip ? 1 : 0,
      immediate: key => key === 'zIndex',
    });

    if (backToChosenCards) {
      set({ transform: `perspective(600px) rotateY(180deg) scale(1) translateY(0px)`, zIndex: 0 });
    }
  }, [flip, backToChosenCards, set, translateY]);

  useEffect(() => {
    if (highlight && !flyAway) {
      console.log({highlight});
      set({
        boxShadow: '0 0 20px 10px gold',
        transform: `perspective(600px) rotateY(180deg) scale(1.3) translateY(${translateY})`,
        zIndex: 100,
        immediate: key => key === 'zIndex',
      });

      setTimeout(() => {
        set({
          boxShadow: '0 12.5px 10px -10px rgba(50, 50, 73, 0.4)',
          transform: `perspective(600px) rotateY(180deg) scale(1) translateY(0px)`,
          zIndex: 10
        });
      }, 1500);
    }
  }, [highlight])



  // useEffect(() => {
  //   function handleResize() {
  //     let newWidth = Math.min(window.innerHeight / 7.7, 100);
  //     let newHeight = Math.min(window.innerHeight / 5.5, 140);
  //     setCardSize({ width: newWidth, height: newHeight });
  //   }

  //   handleResize();

  //   window.addEventListener('resize', handleResize);

  //   return () => window.removeEventListener('resize', handleResize);
  // }, []);

  // Card styles
  const cardStyle = {
    position: 'relative',
    width: size.width,
    height: size.height,
    zIndex: zIndex,
  };

  // Card face styles
  const cardFaceStyle = {
    position: 'absolute', // Card faces are absolute
    display: 'flex',
    borderStyle: 'solid',
    borderWidth: '4px',
    borderRadius: '4px',
    borderColor: 'white',
    boxShadow,
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden', // Hide the back side when it is facing away
    backgroundImage: `url(${cardback})`,
    opacity: opacity.to(o => 1 - o),
    transform,
    transformStyle: 'preserve-3d',
  };

  const displayName = () => {
    const name = deck[cardIndex].name;
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ").slice(1).join(" ");

    return (
      <div className='text-white text-center bg-gray-800 w-full p-1 text-sm flex justify-center self-end'>{firstName} <br></br> {lastName} </div>
    )
  }

  return (
    placeholder ?
      <div style={{
        width: size.width,
        height: size.height,
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: 'white',
        borderRadius: '8px',
      }}></div>
      :
      <animated.div style={cardStyle}>
        <animated.div className='card'
          style={{
            ...cardFaceStyle,
            backgroundImage: `url('images/card-back.jpg')`,
            opacity: opacity.to(o => 1 - o),
          }}
        ></animated.div>
        <animated.div className={'card ' + (highlight ? 'highlight' : '')}
          style={{
            ...cardFaceStyle,
            backgroundImage: `url(${deck[cardIndex].imageUrl})`,
            opacity,
            rotateY: "180deg",
          }}
        >{showName && displayName()}</animated.div>
      </animated.div>
  );
}

export default HostCard;
