import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import Button from './Button';

const MessageModal = ({ header, message, dismiss, modalAction }) => {
  // Animation for the modal to fly in from the bottom
  const modalAnimation = useSpring({
    from: { transform: 'translateY(100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  });

  return (
    <animated.div style={modalAnimation} className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg p-6 border-4 border-gray-200">
        <h2 className="text-3xl font-bold mb-4 text-center">
          {header}
        </h2>
        <div className="flex justify-center">
          <div className='w-56'>
            {message}
          </div>
        </div>
        <div className='flex items-center mt-2'>
          <Button
            className="w-1/2 mx-4 mb-4 mt-2 bg-gray-800 border border-gray-300 text-gray-300"
            style={{ fontSize: '1rem' }}
            buttonType='secondary'
            onClick={dismiss}>
            Cancel
          </Button>
          <Button
            style={{ fontSize: '1rem' }}
            className={`w-1/2 mx-4 mb-4 mt-2`}
            onClick={modalAction}>
            Ok
          </Button>
        </div>
      </div>
    </animated.div>
  );
};

export default MessageModal;
