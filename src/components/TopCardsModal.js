// TopCardsModal.jsx
import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import HostCard from './HostCard'; // Update the import path as necessary

const TopCardsModal = ({ topCards, deck, deckType, cardSize, word }) => {
  // Animation for the modal to fly in from the bottom
  const modalAnimation = useSpring({
    from: { transform: 'translateY(100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  });

  const deckTypeDisplay = deckType === 'original' ? 'cards' : deckType;

  return (
    <animated.div style={modalAnimation} className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg p-8 pb-9 border-4 border-gray-200">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Top 5 {deckTypeDisplay} associated with the word <span className='text-green-500 font-bold uppercase'>{word}</span>
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {topCards.map((cardIndex, i) => (
            <div key={i} className="p-3">
              {/* Replace this with your actual card component and its props */}
              <HostCard
                size={cardSize}
                deck={deck}
                cardIndex={cardIndex}
                flip={true}
                showName={Boolean(deck[cardIndex].name)}
              />
            </div>
          ))}
        </div>
      </div>
    </animated.div>
  );
};

export default TopCardsModal;
