import React, { useState } from 'react';
import { updateDoc } from 'firebase/firestore';

const getThresholds = (numPlayers) => {
  switch (numPlayers) {
    case 12:
    case 11:
      return [.6, .8, .9];
    case 10:
    case 9:
      return [.55, .7, .85];
    case 8:
    case 7:
      return [.5, .65, .8];
    case 6:
    case 5:
      return [.3, .5, .7];
    default:
      return [0, .5];
  }
}

const ConnectionThresholdSelector = ({ roundData, roundRef }) => {
  const { connectionScores } = roundData;

  const thresholds = getThresholds(roundData.players.length);
  const labels = ["Strong", "Stronger", "Strongest"];
  const options = [];
  for (let i = 0; i < thresholds.length; i++) {
    options.push({
      label: labels[i],
      value: connectionScores[Math.floor(connectionScores.length * thresholds[i])]
    })
  }

  const [selectedOption, setSelectedOption] = useState(options[0].value);

  const handleChange = async (newValue) => {
    setSelectedOption(newValue);
    try {
      await updateDoc(roundRef, { connectionThreshold: newValue });
      console.log("Update successful");
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  return (
    <div className="flex justify-around p-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-center space-x-1">
          <input
            type="radio"
            name="connectionThreshold"
            value={option.value}
            checked={selectedOption === option.value}
            onChange={() => handleChange(option.value)}
            className="radio radio-primary w-8 h-8" // Larger radio buttons
          />
          <span className="text-lg text-gray-200">{option.label}</span> {/* Larger text */}
        </label>
      ))}
    </div>

  );
};

export default ConnectionThresholdSelector;
