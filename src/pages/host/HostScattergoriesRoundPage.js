import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import Nav from '../../components/Nav';
import { playerColors } from '../../constants';
import { getContrastYIQ } from '../../utils';

const HostScattergoriesRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, shortId, roundTime } = gameData;
  const duration = roundTime || 90;

  const [roundData, setRoundData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(duration);

  // Fetch round data
  useEffect(() => {
    setTimeRemaining(duration);

    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (docSnap) => {
          setRoundData(docSnap.data());
        });
      }
    });
  }, [currentRound, gameRef, duration]);

  // Countdown timer
  useEffect(() => {
    if (roundData && !roundData.answersRevealed && !roundData.timerEnded) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [roundData]);

  if (!roundData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { letter, categories } = roundData;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const getGameCode = () => (
    <span>Game Code: <span className='text-yellow-500 font-bold uppercase'>{shortId}</span></span>
  );

  // Input phase - show letter, categories, and player status
  const showInputPhase = () => {
    const playersSubmitted = players.filter(p => p.answersSubmitted).length;

    return (
      <div className="max-w-screen-xl mx-auto px-4 mt-4">
        {/* Letter and timer */}
        <div className="bg-gray-800 rounded-lg p-6 mb-4 text-center">
          <div className="flex justify-between items-center">
            <span className="text-2xl text-gray-400">Round {currentRound}</span>
            <span className={`text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-green-400'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl text-gray-400">Letter: </span>
            <span className="text-9xl font-bold text-yellow-400">{letter}</span>
          </div>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {categories.map((category, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-4">
              <span className="text-gray-500 text-lg">#{idx + 1}</span>
              <p className="text-2xl text-gray-200 font-semibold">{category}</p>
            </div>
          ))}
        </div>

        {/* Player status */}
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xl text-gray-400 mb-3">
            Players Answering ({playersSubmitted}/{players.length} submitted)
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((player, idx) => (
              <div
                key={player.id}
                style={{
                  backgroundColor: playerColors[idx % playerColors.length],
                  color: getContrastYIQ(playerColors[idx % playerColors.length])
                }}
                className={`px-4 py-2 rounded-lg text-xl font-semibold ${
                  player.answersSubmitted ? 'opacity-50' : ''
                }`}
              >
                {player.name} {player.answersSubmitted && '✓'}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Reveal phase - show category and all answers
  const showRevealPhase = () => {
    const currentCatIdx = roundData.revealState?.currentCategoryIndex || 0;
    const allAnswers = roundData.allAnswers || {};
    const playerScores = roundData.playerScores || {};

    // Get current category for display
    const displayCatIdx = Math.min(currentCatIdx, 5);
    const categoryAnswers = allAnswers[displayCatIdx] || {};
    const categoryRejected = roundData.rejectedAnswers?.[displayCatIdx] || {};

    return (
      <div className="max-w-screen-xl mx-auto px-4 mt-4">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-2xl text-gray-400">Round {currentRound}</span>
            <span className="text-5xl font-bold text-yellow-400">{letter}</span>
          </div>
        </div>

        {!roundData.revealComplete && (
          <>
            {/* Current category */}
            <div className="bg-gray-800 border-2 border-green-500 rounded-lg p-6 mb-4 text-center">
              <p className="text-xl text-gray-400 mb-2">Category {displayCatIdx + 1}/6</p>
              <p className="text-4xl text-green-400 font-bold">{categories[displayCatIdx]}</p>
            </div>

            {/* All player answers for this category */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {players.map((player, idx) => {
                const playerAnswer = (player.answers || {})[displayCatIdx] || '';
                const normalizedAnswer = playerAnswer.trim().toUpperCase();
                const isRejected = normalizedAnswer && categoryRejected[normalizedAnswer] === true;
                const isDuplicate = normalizedAnswer && categoryAnswers[normalizedAnswer]?.length > 1;
                const isUnique = normalizedAnswer && categoryAnswers[normalizedAnswer]?.length === 1 && !isRejected;

                return (
                  <div
                    key={player.id}
                    className="bg-gray-800 rounded-lg p-4"
                    style={{
                      borderLeft: `4px solid ${playerColors[idx % playerColors.length]}`
                    }}
                  >
                    <p className="text-lg text-gray-400 mb-2">{player.name}</p>
                    <p className={`text-3xl font-bold uppercase ${
                      !normalizedAnswer ? 'text-gray-600' :
                      isRejected ? 'text-red-400 line-through' :
                      isDuplicate ? 'text-red-400 line-through' :
                      isUnique ? 'text-green-400' : 'text-gray-300'
                    }`}>
                      {normalizedAnswer || '—'}
                    </p>
                    {isRejected && <p className="text-red-400 text-xl mt-1">rejected</p>}
                    {!isRejected && isUnique && <p className="text-green-400 text-xl font-bold mt-1">+1</p>}
                    {!isRejected && isDuplicate && <p className="text-red-400 text-xl mt-1">(duplicate)</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Scores */}
        {roundData.revealComplete && (
          <div className="grid grid-cols-2 gap-4">
            {/* Round scores */}
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-2xl text-gray-400 mb-4 border-b border-gray-600 pb-2">Round Scores</p>
              <div className="space-y-2">
                {[...players]
                  .map(player => ({ ...player, roundScore: playerScores[player.id] || 0 }))
                  .sort((a, b) => b.roundScore - a.roundScore)
                  .map((player, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const pIdx = players.findIndex(p => p.id === player.id);

                    return (
                      <div
                        key={player.id}
                        className="flex justify-between items-center px-4 py-3 bg-gray-900 rounded-lg"
                        style={{
                          borderLeft: `4px solid ${playerColors[pIdx % playerColors.length]}`
                        }}
                      >
                        <span className="text-2xl text-gray-200">
                          {medal} {player.name}
                        </span>
                        <span className="text-3xl font-bold text-green-400">
                          {player.roundScore}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Total scores */}
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-2xl text-gray-400 mb-4 border-b border-gray-600 pb-2">Total Scores</p>
              <div className="space-y-2">
                {[...players]
                  .map(player => ({
                    ...player,
                    totalScore: (roundData.startingGameScores?.[player.id] || 0) + (playerScores[player.id] || 0)
                  }))
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((player, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const pIdx = players.findIndex(p => p.id === player.id);

                    return (
                      <div
                        key={player.id}
                        className="flex justify-between items-center px-4 py-3 bg-gray-900 rounded-lg"
                        style={{
                          borderLeft: `4px solid ${playerColors[pIdx % playerColors.length]}`
                        }}
                      >
                        <span className="text-2xl text-gray-200">
                          {medal} {player.name}
                        </span>
                        <span className="text-3xl font-bold text-blue-400">
                          {player.totalScore}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Waiting message */}
        {roundData.revealComplete && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-xl text-gray-400">
              Waiting for <span className="text-green-500 font-bold">{players[0]?.name}</span> to continue...
            </p>
          </div>
        )}
      </div>
    );
  };

  // Waiting for reveal
  const showWaitingPhase = () => {
    return (
      <div className="max-w-screen-xl mx-auto px-4 mt-4">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-5xl text-yellow-400 font-bold mb-4">Time's Up!</p>
          <p className="text-2xl text-gray-400">
            Waiting for <span className="text-green-500 font-bold">{players[0]?.name}</span> to start the reveal...
          </p>
        </div>

        {/* Show letter and categories */}
        <div className="mt-4 bg-gray-800 rounded-lg p-6 text-center">
          <span className="text-3xl text-gray-400">Letter: </span>
          <span className="text-7xl font-bold text-yellow-400">{letter}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {categories.map((category, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-4">
              <span className="text-gray-500 text-lg">#{idx + 1}</span>
              <p className="text-xl text-gray-200">{category}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Nav
        className="max-w-screen-xl"
        gameCode={getGameCode()}
        round={currentRound}
      />
      {roundData.answersRevealed ? showRevealPhase() :
       (roundData.timerEnded || timeRemaining === 0) ? showWaitingPhase() :
       showInputPhase()}
    </div>
  );
};

export default HostScattergoriesRoundPage;
