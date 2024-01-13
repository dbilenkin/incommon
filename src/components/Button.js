import React from 'react';

const Button = ({ children, onClick, className, disabled = false, type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-blue-500 hover:bg-blue-700 text-white text-xl font-bold py-2 px-4 rounded ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
