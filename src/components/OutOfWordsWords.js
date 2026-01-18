import React, { useState, useEffect } from 'react';
import './OutOfWordsWords.css';
import TimerBar from './TimerBar';

const OutOfWordsWords = ({ word, minWordLength, foundWords, setFoundWords, duration }) => {
  const letters = word.split('');
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [wordList, setWordList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track display order of letters (array of original indices)
  const [letterOrder, setLetterOrder] = useState(() => letters.map((_, i) => i));

  // Shuffle the letter display order
  const handleScramble = () => {
    const newOrder = [...letterOrder];
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setLetterOrder(newOrder);
  };

  useEffect(() => {
    const loadWordList = async () => {
      try {
        const response = await fetch('words/base_words.txt');
        if (!response.ok) {
          throw new Error('Failed to load word list');
        }
        const text = await response.text();
        const words = text.split('\n').map(word => word.trim());
        setWordList(words);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadWordList();
  }, []);

  const handleLetterClick = (letter, index) => {
    const updatedSelectedLetters = [...selectedLetters, { letter, index }];
    setSelectedLetters(updatedSelectedLetters);
    setCurrentWord(currentWord + letter.toUpperCase());
  };

  const handleBackspaceClick = () => {
    const updatedSelectedLetters = [...selectedLetters];
    updatedSelectedLetters.pop();
    setSelectedLetters(updatedSelectedLetters);
    setCurrentWord(updatedSelectedLetters.map(item => item.letter.toUpperCase()).join(''));
  };

  const handleSubmitClick = () => {
    if (currentWord.length < minWordLength) {
      alert("too short");
    } else if (foundWords.includes(currentWord)) {
      alert("already found!");
    } else if (wordList.includes(currentWord.toLowerCase())) {
      setFoundWords([...foundWords, currentWord]);
    } else {
      alert(`Word "${currentWord}" is not valid!`);
    }
    setSelectedLetters([]);
    setCurrentWord('');
  };

  const isLetterSelected = (index) => {
    return selectedLetters.some(item => item.index === index);
  };

  if (loading) {
    return <div className="text-gray-300">Loading word list...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <>
      <div className='px-2 py-4'>
        <TimerBar duration={duration} />
      </div>
      <div className="out-of-words-words px-4 bg-gray-800 rounded-lg text-gray-300">
        <div className="controls-container flex items-center justify-between gap-4">
          <button
            onClick={handleBackspaceClick}
            className="backspace-button px-4 py-3 bg-red-500 text-white rounded shadow text-xl"
          >
            Delete
          </button>
          <div className="current-word-container mb-4 text-3xl">
            <span className="guess font-bold">{currentWord}</span>
          </div>
          <button
            onClick={handleSubmitClick}
            className="submit-button px-4 py-3 bg-green-500 text-white rounded shadow text-xl"
          >
            Enter
          </button>
        </div>
        <div className="letters-container flex flex-wrap justify-center mb-4">
          {letterOrder.map((originalIndex) => (
            <button
              key={originalIndex}
              onClick={() => handleLetterClick(letters[originalIndex], originalIndex)}
              disabled={isLetterSelected(originalIndex)}
              className={`letter-button w-14 h-14 m-1 rounded shadow text-3xl font-bold ${isLetterSelected(originalIndex) ? 'bg-gray-500 text-gray-300' : 'bg-blue-500 text-white'}`}
            >
              {letters[originalIndex].toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={handleScramble}
            className="px-4 py-2 bg-gray-600 text-white rounded shadow text-lg"
          >
            Scramble
          </button>
        </div>
        <div className="found-words-container mt-6 bg-gray-900 p-4 rounded-lg">
          <h3 className="text-2xl font-bold mb-4">Found Words:</h3>
          <div className="grid grid-cols-3 gap-2">
            {foundWords.length > 0 && foundWords.map((foundWord, index) => (
              <div key={index} className="text-white text-xl">
                {foundWord}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>

  );
};

export default OutOfWordsWords;
