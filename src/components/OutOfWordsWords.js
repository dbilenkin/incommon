import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './OutOfWordsWords.css';
import TimerBar from './TimerBar';

const OutOfWordsWords = ({ word, minWordLength, foundWords, setFoundWords, duration, untimed, language = 'en', columnLayout = false }) => {
  const { t } = useTranslation(['words', 'common']);
  const letters = word.split('');
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [wordList, setWordList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track display order of letters (array of original indices)
  const [letterOrder, setLetterOrder] = useState(() => letters.map((_, i) => i));

  // Toast and shake state
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isShaking, setIsShaking] = useState(false);
  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ show: true, message });
    setIsShaking(true);

    // Remove shake after animation
    setTimeout(() => setIsShaking(false), 500);

    // Hide toast after delay
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2000);
  };

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
        const wordFile = language === 'ru' ? 'words/valid_words_ru.txt' : 'words/valid_words.txt';
        const response = await fetch(wordFile);
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
  }, [language]);

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
      showToast(t('toasts.tooShort'));
    } else if (currentWord.toLowerCase() === word.toLowerCase()) {
      showToast(t('toasts.cantUseOriginal'));
    } else if (foundWords.includes(currentWord)) {
      showToast(t('toasts.alreadyFound'));
    } else if (wordList.includes(currentWord.toLowerCase())) {
      setFoundWords([...foundWords, currentWord]);
    } else {
      showToast(t('toasts.notValid'));
    }
    setSelectedLetters([]);
    setCurrentWord('');
  };

  const isLetterSelected = (index) => {
    return selectedLetters.some(item => item.index === index);
  };

  if (loading) {
    return <div className="text-gray-300">{t('loading')}</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="out-of-words-words bg-gray-800 text-gray-300">
      {/* Timer - only show in timed mode */}
      {!untimed && (
        <div className='px-3 py-2'>
          <TimerBar duration={duration} />
        </div>
      )}

      {/* Current word input area with toast */}
      <div className="relative px-3 py-2">
        {/* Toast notification */}
        <div className={`absolute -top-1 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-lg font-semibold whitespace-nowrap">
            {toast.message}
          </div>
        </div>

        {/* Word display with shake */}
        <div className={`flex items-center justify-center h-12 bg-gray-900 rounded-lg mb-2 ${isShaking ? 'animate-shake' : ''}`}>
          <span className="text-3xl font-bold text-white tracking-wider">
            {currentWord || <span className="text-gray-600">{t('tapLetters')}</span>}
          </span>
        </div>

        {/* Delete and Enter buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleBackspaceClick}
            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow text-lg font-semibold"
          >
            {t('common:buttons.delete')}
          </button>
          <button
            onClick={handleSubmitClick}
            className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow text-lg font-semibold"
          >
            {t('common:buttons.enter')}
          </button>
        </div>
      </div>

      {/* Letter buttons - split into two rows */}
      {(() => {
        const topRowCount = Math.ceil(letterOrder.length / 2);
        const topRow = letterOrder.slice(0, topRowCount);
        const bottomRow = letterOrder.slice(topRowCount);

        return (
          <div className="letters-container px-2 pb-1 flex justify-center">
            <div className={columnLayout ? '' : 'flex flex-col items-center'}>
              <div className="flex">
                {topRow.map((originalIndex) => (
                  <button
                    key={originalIndex}
                    onClick={() => handleLetterClick(letters[originalIndex], originalIndex)}
                    disabled={isLetterSelected(originalIndex)}
                    className={`letter-button w-14 h-14 m-1 rounded shadow text-3xl font-bold ${isLetterSelected(originalIndex) ? 'bg-gray-600 text-gray-400' : 'bg-blue-500 text-white'}`}
                  >
                    {letters[originalIndex].toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex">
                {bottomRow.map((originalIndex) => (
                  <button
                    key={originalIndex}
                    onClick={() => handleLetterClick(letters[originalIndex], originalIndex)}
                    disabled={isLetterSelected(originalIndex)}
                    className={`letter-button w-14 h-14 m-1 rounded shadow text-3xl font-bold ${isLetterSelected(originalIndex) ? 'bg-gray-600 text-gray-400' : 'bg-blue-500 text-white'}`}
                  >
                    {letters[originalIndex].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Scramble button */}
      <div className="flex justify-center py-2">
        <button
          onClick={handleScramble}
          className="px-6 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded shadow text-base"
        >
          {t('common:buttons.scramble')}
        </button>
      </div>

      {/* Found words */}
      <div className="found-words-container bg-gray-900 mx-2 mb-2 p-3 rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-700 pb-1 mb-2">
          <span className="text-lg text-gray-400">{t('found')}</span>
          <span className="text-lg font-bold text-green-400">{foundWords.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {foundWords.length > 0 && foundWords.map((foundWord, index) => (
            <div key={index} className="text-white text-lg">
              {foundWord}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OutOfWordsWords;
