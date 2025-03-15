import React, { useState } from 'react';
import { updateDoc } from 'firebase/firestore'; // Make sure you import updateDoc correctly

const ConnectionThresholdRangeInput = ({ roundRef }) => {
  const [connectionThreshold, setConnectionThreshold] = useState(50); // Default value

  const handleChange = async (newValue) => {
    setConnectionThreshold(newValue);
    try {
      await updateDoc(roundRef, { connectionThreshold: parseInt(newValue) });
      console.log("Update successful");
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="range"
        min="0"
        max="100"
        value={connectionThreshold}
        onChange={(e) => handleChange(e.target.value)}
        className="range range-primary"
      />
      <span className="text-sm">{connectionThreshold}%</span>
    </div>
  );
};

export default ConnectionThresholdRangeInput;
