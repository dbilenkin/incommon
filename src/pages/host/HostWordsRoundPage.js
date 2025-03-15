import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import Nav from '../../components/Nav';
import WordAndScore from '../../components/WordAndScore';

const HostWordsRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, shortId } = gameData;
  const currentPlayerIndex = currentRound % players.length;
  const chooserName = players[currentPlayerIndex].name;

  const [roundData, setRoundData] = useState(null);
  const [currentWord, setCurrentWord] = useState('');
  const [wordScores, setWordScores] = useState({});
  const [playerIndex, setPlayerIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [revealWords, setRevealWords] = useState(false);

  useEffect(() => {
    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (doc) => {
          setRoundData(doc.data());
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [currentRound, gameRef]);

  useEffect(() => {
    if (roundData && roundData.wordsRevealed) {
      setRevealWords(true);
    }
  }, [roundData]);

  useEffect(() => {
    if (!revealWords) return;
    const player = players[playerIndex];
    if (player && player.foundWords && wordIndex < player.foundWords.length) {
      const word = player.foundWords[wordIndex];

      let animationTime = 0;

      if (wordScores[word] === undefined) {
        animationTime = 2000;
        setCurrentWord(word);

        const playersWithWord = players.filter(p => p.foundWords.includes(word));
        const playersWithoutWordCount = players.length - playersWithWord.length;
        const points = word.length * playersWithoutWordCount;

        playersWithWord.forEach(p => {
          p.score = (p.score || 0) + points;
          const foundWord = p.foundWords.find(fw => fw === word);
          setWordScores({ ...wordScores, [foundWord]: points });
        });
      }

      setTimeout(() => setWordIndex(wordIndex + 1), animationTime);
      
    } else {
      setTimeout(() => {
        setCurrentWord('');
        setWordIndex(0);
        setPlayerIndex(playerIndex + 1);        
      }, 2000);
    }
  }, [revealWords, playerIndex, wordIndex]);


  if (!roundData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getWord = () => {
    const word = roundData.word;
    return (
      word ? <span>Word:  <span className='text-green-500 font-bold uppercase'>{word}</span></span> :
        <span>Waiting for <span className="text-green-500 font-bold">{chooserName}</span> to choose the word</span>
    )
  }

  const getGameCode = () => {
    return (
      <span>Game Code:  <span className='text-yellow-500 font-bold uppercase'>{shortId}</span></span>
    )
  }

  return (
    <div>
      <Nav className={`${players.length <= 4 ? 'max-w-screen-lg' : 'max-w-screen-xl'}`}
        gameCode={getGameCode()}
        round={currentRound}
        word={getWord()} />
      <div className="grid grid-cols-4 gap-2 justify-stretch mt-2 mx-auto max-w-screen-xl">
        {players
          .sort((a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0))
          .map((player, pIndex) => (
            <div key={pIndex} 
              className={`flex flex-col bg-gray-800 text-gray-200 rounded-lg p-4 m-2 
                ${pIndex === playerIndex ? 'border-2 border-yellow-600' : ''}`}>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                <div className={`text-left font-semibold`}>
                  {player.name}
                </div>
                <div className="text-lg">
                  {player.foundWords?.length || 0} words | {player.score || 0} points
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {player.foundWords?.map((foundWord, index) => {
                  const points = wordScores[foundWord];
                  const isCurrentWord = currentWord === foundWord;
                  const isRevealed = wordScores[foundWord] !== undefined;
                  const allPlayersHaveWord = players.every(p => p.foundWords.some(fw => fw === foundWord));

                  return (
                    <WordAndScore key={index}
                      word={foundWord}
                      points={points}
                      highlight={isCurrentWord}
                      allPlayersHaveWord={allPlayersHaveWord}
                      isRevealed={isRevealed} />
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default HostWordsRoundPage;
