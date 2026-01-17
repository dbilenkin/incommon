import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import Nav from '../../components/Nav';
import WordAndScore from '../../components/WordAndScore';

const HostWordsRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, shortId } = gameData;
  const currentPlayerIndex = currentRound % players.length;
  const chooserName = players[currentPlayerIndex].name;

  const [roundData, setRoundData] = useState(null);
  const [playerOrder, setPlayerOrder] = useState([]);

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

  // When wordsRevealed becomes true, set player order for display
  useEffect(() => {
    if (roundData?.wordsRevealed && playerOrder.length === 0) {
      const sortedPlayers = [...players].sort(
        (a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0)
      );
      setPlayerOrder(sortedPlayers);
    }
  }, [roundData?.wordsRevealed, players]);

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

  // Get reveal state from Firebase
  const globallyRevealedWords = roundData.globallyRevealedWords || {};
  const playerScores = roundData.playerScores || {};
  const revealState = roundData.revealState || {};
  const currentRevealPlayerIndex = revealState.currentPlayerIndex || 0;
  const currentWord = revealState.currentWord || '';

  // Get display list - use playerOrder during reveal, otherwise sort players
  // Filter out any undefined players to prevent errors during Firebase updates
  const displayPlayers = (playerOrder.length > 0
    ? playerOrder
    : [...players].sort((a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0))
  ).filter(p => p != null);

  const getWordDisplayInfo = (word, playerName) => {
    const scoreInfo = globallyRevealedWords[word];
    if (!scoreInfo) {
      return { isRevealed: false, isCrossedOut: false, points: 0 };
    }
    // Cross out if: someone else revealed it, OR it's worth 0 points (everyone had it)
    const isCrossedOut = scoreInfo.revealedBy !== playerName || scoreInfo.points === 0;
    return {
      isRevealed: true,
      isCrossedOut,
      points: scoreInfo.points
    };
  };

  return (
    <div>
      <Nav className={`${players.length <= 4 ? 'max-w-screen-lg' : 'max-w-screen-xl'}`}
        gameCode={getGameCode()}
        round={currentRound}
        word={getWord()} />

      <div className="grid grid-cols-4 gap-2 justify-stretch mt-2 mx-auto max-w-screen-xl">
        {displayPlayers.map((player, pIndex) => {
          const isCurrentPlayer = playerOrder.length > 0 && playerOrder[currentRevealPlayerIndex]?.id === player.id;

          return (
            <div key={player.id || pIndex}
              className={`flex flex-col bg-gray-800 text-gray-200 rounded-lg p-4 m-2
                ${isCurrentPlayer ? 'border-2 border-yellow-500' : ''}`}>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                <div className={`text-left font-semibold ${isCurrentPlayer ? 'text-yellow-400' : ''}`}>
                  {player.name}
                </div>
                <div className="text-lg">
                  {player.foundWords?.length || 0} words | {playerScores[player.id] || 0} pts
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-2xl">
                {Array.isArray(player.foundWords) && player.foundWords.map((foundWord, index) => {
                  const { isRevealed, isCrossedOut, points } = getWordDisplayInfo(foundWord, player.name);
                  const isCurrentWord = currentWord === foundWord;

                  return (
                    <WordAndScore key={index}
                      word={foundWord}
                      points={points}
                      highlight={isCurrentWord}
                      isRevealed={isRevealed}
                      isCrossedOut={isCrossedOut} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HostWordsRoundPage;
