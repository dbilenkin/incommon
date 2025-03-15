import React, { useState } from 'react';

const Toggle = ({className}) => {
  const [isOn, setIsOn] = useState(false);

  const toggleSwitch = () => {
    setIsOn(!isOn);
  };

  return (
    <div className="flex items-center cursor-pointer" onClick={toggleSwitch}>
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={isOn} readOnly />
        <div 
          className={`block w-14 h-8 rounded-full transition ${isOn ? 'bg-green-500' : 'bg-gray-600'}`}
        ></div>
        <div 
          className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"
          style={{ transform: isOn ? 'translateX(100%)' : 'none' }}
        ></div>
      </div>
      <div className={`ml-3 ${className}`}>
        {isOn ? 'Sounds On' : 'Sounds Off'}
      </div>
    </div>
  );
};

export default Toggle;
