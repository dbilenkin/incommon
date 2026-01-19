import React, { useState, useEffect, useContext, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc, deleteField } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Button from '../../components/Button';
import { getRandomScattergoriesLetter } from '../../utils';

const PlayerScattergoriesRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, roundTime, numRounds } = gameData;
  const duration = roundTime || 90;

  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const firstPlayer = players[0]?.name === currentPlayerName;

  const [roundData, setRoundData] = useState(null);
  const [roundRef, setRoundRef] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timesUp, setTimesUp] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);

  const hasInitializedFromFirebase = useRef(false);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const timerStarted = useRef(false);

  // Fetch round data - only re-run when round changes, NOT when players update
  useEffect(() => {
    setTimesUp(false);
    setAnswers({});
    setTimeRemaining(duration);
    hasInitializedFromFirebase.current = false;
    timerStarted.current = false;

    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        setRoundRef(_roundRef);

        onSnapshot(_roundRef, (docSnap) => {
          const data = docSnap.data();
          if (!data) return;

          setRoundData(data);

          // Listen for timerEnded from first player
          if (data.timerEnded && !hasInitializedFromFirebase.current) {
            hasInitializedFromFirebase.current = true;
            setTimesUp(true);
          }

          // Restore state on refresh (when answersRevealed is already true)
          if (!hasInitializedFromFirebase.current && data.answersRevealed) {
            hasInitializedFromFirebase.current = true;
            setTimesUp(true);
          }
        });
      }
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [currentRound, gameRef, duration]); // Removed players and currentPlayerName - only reset on round change

  // Start timer when round data is available
  useEffect(() => {
    if (roundData && !roundData.answersRevealed && !roundData.timerEnded && !timesUp && !timerStarted.current) {
      timerStarted.current = true;
      hasInitializedFromFirebase.current = true;

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-end timer
      timerRef.current = setTimeout(() => {
        setTimesUp(true);
      }, duration * 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [roundData, duration, timesUp]);

  // Submit answers when time is up
  useEffect(() => {
    if (timesUp && currentPlayerId && roundRef) {
      const submitAnswers = async () => {
        try {
          const currentPlayerDocRef = doc(gameRef, 'players', currentPlayerId);
          await updateDoc(currentPlayerDocRef, {
            answers: answers,
            answersSubmitted: true
          });

          // First player also sets timerEnded in Firebase to sync all players
          if (firstPlayer && !roundData?.timerEnded) {
            await updateDoc(roundRef, { timerEnded: true });
          }
        } catch (error) {
          console.error("Error submitting answers:", error);
        }
      };
      submitAnswers();
    }
  }, [timesUp, currentPlayerId, answers, gameRef, roundRef, firstPlayer, roundData?.timerEnded]);

  const handleAnswerChange = (categoryIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [categoryIndex]: value.toUpperCase()
    }));
  };

  const handleRejectAnswer = async (answer) => {
    const currentCatIdx = roundData.revealState?.currentCategoryIndex || 0;
    const currentRejected = roundData.rejectedAnswers?.[currentCatIdx] || {};
    const isCurrentlyRejected = currentRejected[answer];

    await updateDoc(roundRef, {
      [`rejectedAnswers.${currentCatIdx}.${answer}`]: isCurrentlyRejected ? deleteField() : true
    });
  };

  const handleEndTimer = async () => {
    if (roundRef) {
      await updateDoc(roundRef, { timerEnded: true });
    }
    setTimesUp(true);
  };

  const handleStartReveal = async () => {
    // Fetch fresh player data from Firebase to ensure we have all answers
    const playersRef = collection(gameRef, 'players');
    const playersSnapshot = await getDocs(playersRef);
    const freshPlayers = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate revealed categories with scoring
    const allAnswers = {};

    // Collect answers from all players (using fresh data)
    freshPlayers.forEach(player => {
      const playerAnswers = player.answers || {};
      Object.entries(playerAnswers).forEach(([catIdx, answer]) => {
        const normalizedAnswer = (answer || '').trim().toUpperCase();
        if (normalizedAnswer) {
          if (!allAnswers[catIdx]) {
            allAnswers[catIdx] = {};
          }
          if (!allAnswers[catIdx][normalizedAnswer]) {
            allAnswers[catIdx][normalizedAnswer] = [];
          }
          allAnswers[catIdx][normalizedAnswer].push(player.id);
        }
      });
    });

    // Initialize player scores
    const playerScores = {};
    freshPlayers.forEach(p => { playerScores[p.id] = 0; });

    await updateDoc(roundRef, {
      answersRevealed: true,
      revealState: { currentCategoryIndex: 0 },
      allAnswers,
      playerScores
    });
  };

  const handleNextCategory = async () => {
    const currentCatIdx = roundData.revealState?.currentCategoryIndex || 0;
    const allAnswers = roundData.allAnswers || {};
    const playerScores = { ...roundData.playerScores };
    const categoryRejected = roundData.rejectedAnswers?.[currentCatIdx] || {};

    // Score the current category
    const categoryAnswers = allAnswers[currentCatIdx] || {};
    Object.entries(categoryAnswers).forEach(([answer, playerIds]) => {
      const isRejected = categoryRejected[answer] === true;
      // Unique AND not rejected = 1 point
      if (playerIds.length === 1 && !isRejected) {
        playerScores[playerIds[0]] = (playerScores[playerIds[0]] || 0) + 1;
      }
    });

    // Store revealed category data
    const revealedCategories = { ...roundData.revealedCategories };
    revealedCategories[currentCatIdx] = {
      answers: categoryAnswers,
      scored: true
    };

    const nextCatIdx = currentCatIdx + 1;

    if (nextCatIdx >= 6) {
      // All categories revealed
      await updateDoc(roundRef, {
        revealState: { currentCategoryIndex: nextCatIdx },
        playerScores,
        revealedCategories,
        revealComplete: true
      });

      // Update players subcollection with scores
      const playersRef = collection(gameRef, 'players');
      const updatePromises = players.map(p => {
        const playerDocRef = doc(playersRef, p.id);
        const newGameScore = (p.gameScore || 0) + (playerScores[p.id] || 0);
        return updateDoc(playerDocRef, { gameScore: newGameScore });
      });
      await Promise.all(updatePromises);
    } else {
      await updateDoc(roundRef, {
        revealState: { currentCategoryIndex: nextCatIdx },
        playerScores,
        revealedCategories
      });
    }
  };

  const startNextRound = async () => {
    const totalRounds = numRounds || 3;

    if (currentRound >= totalRounds) {
      await updateDoc(gameRef, {
        gameState: "ended"
      });
    } else {
      // Reset player answers
      const playersRef = collection(gameRef, 'players');
      const playersSnapshot = await getDocs(playersRef);
      const resetPromises = playersSnapshot.docs.map(playerDoc =>
        updateDoc(playerDoc.ref, { answers: {}, answersSubmitted: false })
      );
      await Promise.all(resetPromises);

      // Create next round - new letter, same categories from game doc
      const letter = getRandomScattergoriesLetter();

      const roundsRef = collection(gameRef, "rounds");
      await addDoc(roundsRef, {
        roundNumber: currentRound + 1,
        letter,
        categories: gameData.categories,  // Reuse categories from game
        players,
        answersRevealed: false,
        revealState: { currentCategoryIndex: 0 },
        revealedCategories: {},
        playerScores: {},
        revealComplete: false
      });

      await updateDoc(gameRef, {
        currentRound: currentRound + 1
      });
    }
  };

  if (!roundData) {
    return (
      <div className="m-4 text-gray-300">
        <div className="animate-pulse">Loading round...</div>
      </div>
    );
  }

  const { letter, categories } = roundData;

  // Input phase
  const showInputPhase = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className="max-w-screen-sm mx-auto">
        {/* Header with letter, round, and timer */}
        <div className="bg-gray-800 p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg text-gray-400">Round {currentRound}</span>
            <span className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-green-400'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="text-center">
            <span className="text-6xl font-bold text-yellow-400">{letter}</span>
          </div>
        </div>

        {/* Category inputs */}
        <div className="bg-gray-800 p-3">
          {categories.map((category, idx) => (
            <div key={idx} className="mb-3">
              <label className="block text-gray-300 text-lg mb-1">{category}</label>
              <input
                type="text"
                value={answers[idx] || ''}
                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                placeholder={`${letter}...`}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-lg uppercase focus:outline-none focus:border-green-500"
                autoCapitalize="characters"
              />
            </div>
          ))}
        </div>

        {/* End round early button for first player */}
        {firstPlayer && (
          <div className="px-3 pb-3 bg-gray-800">
            <button
              onClick={handleEndTimer}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg text-lg"
            >
              End Round Early
            </button>
          </div>
        )}
      </div>
    );
  };

  // Reveal phase
  const showRevealPhase = () => {
    const currentCatIdx = roundData.revealState?.currentCategoryIndex || 0;
    const allAnswers = roundData.allAnswers || {};
    const playerScores = roundData.playerScores || {};
    const revealedCategories = roundData.revealedCategories || {};

    // Get current category answers for display
    const displayCatIdx = Math.min(currentCatIdx, 5);
    const categoryAnswers = allAnswers[displayCatIdx] || {};
    const categoryRejected = roundData.rejectedAnswers?.[displayCatIdx] || {};

    // Build player-centric answer display
    const playerAnswersList = players.map(player => {
      const playerAnswer = (player.answers || {})[displayCatIdx] || '';
      const normalizedAnswer = playerAnswer.trim().toUpperCase();
      const isRejected = normalizedAnswer && categoryRejected[normalizedAnswer] === true;
      const isDuplicate = normalizedAnswer && categoryAnswers[normalizedAnswer]?.length > 1;
      const isUnique = normalizedAnswer && categoryAnswers[normalizedAnswer]?.length === 1 && !isRejected;

      return {
        player,
        answer: normalizedAnswer,
        isDuplicate,
        isUnique,
        isRejected,
        points: isUnique && !isRejected ? 1 : 0
      };
    });

    return (
      <div className="max-w-screen-sm mx-auto p-2">
        {/* Current category being revealed */}
        {!roundData.revealComplete && (
          <div className="bg-gray-800 border border-green-500 rounded-lg mb-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg text-gray-400">Category {displayCatIdx + 1}/6</p>
              <span className="text-3xl font-bold text-yellow-400">{letter}</span>
            </div>

            <p className="text-xl text-green-400 font-semibold mb-3 text-center">
              {categories[displayCatIdx]}
            </p>

            {/* Player answers for this category */}
            <div className="space-y-2">
              {playerAnswersList.map(({ player, answer, isDuplicate, isUnique, isRejected }) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center px-3 py-2 rounded ${
                    player.name === currentPlayerName ? 'bg-gray-700' : 'bg-gray-900'
                  }`}
                >
                  <span className="text-gray-300">{player.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold uppercase ${
                      !answer ? 'text-gray-600' :
                      isRejected ? 'text-red-400 line-through' :
                      isDuplicate ? 'text-red-400 line-through' :
                      isUnique ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {answer || '—'}
                    </span>
                    {isRejected && <span className="text-red-400 text-sm">rejected</span>}
                    {!isRejected && isUnique && <span className="text-green-400 font-bold">+1</span>}
                    {!isRejected && isDuplicate && <span className="text-red-400">(0)</span>}
                    {firstPlayer && answer && (
                      <button
                        onClick={() => handleRejectAnswer(answer)}
                        className={`ml-1 px-2 py-1 rounded text-sm font-semibold ${
                          isRejected
                            ? 'bg-green-700 hover:bg-green-600 text-white'
                            : 'bg-red-700 hover:bg-red-600 text-white'
                        }`}
                      >
                        {isRejected ? '✓' : '✕'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Next category button for first player */}
            {firstPlayer && (
              <button
                onClick={handleNextCategory}
                className="w-full mt-3 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-lg"
              >
                {currentCatIdx >= 5 ? 'Show Scores' : 'Next Category'}
              </button>
            )}
          </div>
        )}

        {/* Scores after reveal complete */}
        {roundData.revealComplete && (
          <>
            <div className="bg-gray-800 p-3 rounded-lg mb-2">
              <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">Round Scores</p>
              <div className="flex flex-col gap-1">
                {[...players]
                  .map(player => ({ ...player, roundScore: playerScores[player.id] || 0 }))
                  .sort((a, b) => b.roundScore - a.roundScore)
                  .map((player, index) => {
                    const isMe = player.name === currentPlayerName;
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                    return (
                      <div
                        key={player.id}
                        className={`flex justify-between items-center px-2 py-1 rounded ${
                          isMe ? 'bg-gray-700' : 'bg-gray-900'
                        }`}
                      >
                        <span className={`text-xl ${isMe ? 'font-bold text-white' : 'text-gray-300'}`}>
                          {medal} {player.name}
                        </span>
                        <span className="text-xl font-bold text-green-400">
                          {player.roundScore}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Game totals */}
            <div className="bg-gray-800 p-3 rounded-lg mb-2">
              <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">Total Scores</p>
              <div className="flex flex-col gap-1">
                {[...players]
                  .map(player => ({
                    ...player,
                    totalScore: (player.gameScore || 0) + (playerScores[player.id] || 0)
                  }))
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((player, index) => {
                    const isMe = player.name === currentPlayerName;

                    return (
                      <div
                        key={player.id}
                        className={`flex justify-between items-center px-2 py-1 rounded ${
                          isMe ? 'bg-gray-700' : 'bg-gray-900'
                        }`}
                      >
                        <span className={`text-lg ${isMe ? 'font-bold text-white' : 'text-gray-300'}`}>
                          {player.name}
                        </span>
                        <span className="text-lg font-bold text-blue-400">
                          {player.totalScore}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Next round / end game button */}
            {firstPlayer ? (
              <button
                onClick={startNextRound}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-xl"
              >
                {currentRound >= (numRounds || 3) ? 'End Game' : 'Next Round'}
              </button>
            ) : (
              <p className="text-xl text-gray-300 bg-gray-800 px-3 py-3 rounded-lg text-center">
                Waiting for <span className="text-green-500 font-bold">{players[0]?.name}</span>
              </p>
            )}
          </>
        )}

        {/* Your answers summary */}
        {!roundData.revealComplete && (
          <div className="bg-gray-800 p-3 rounded-lg">
            <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">Your Answers</p>
            <div className="grid grid-cols-1 gap-1">
              {categories.map((category, idx) => {
                const myAnswer = answers[idx] || '';
                const isRevealed = idx < currentCatIdx;
                const isCurrent = idx === currentCatIdx;
                const catAnswers = allAnswers[idx] || {};
                const catRejected = roundData.rejectedAnswers?.[idx] || {};
                const normalizedAnswer = myAnswer.trim().toUpperCase();
                const isRejected = isRevealed && normalizedAnswer && catRejected[normalizedAnswer] === true;
                const isUnique = isRevealed && normalizedAnswer && catAnswers[normalizedAnswer]?.length === 1 && !isRejected;
                const isDuplicate = isRevealed && normalizedAnswer && catAnswers[normalizedAnswer]?.length > 1;

                return (
                  <div
                    key={idx}
                    className={`flex justify-between items-center px-2 py-1 rounded text-sm ${
                      isCurrent ? 'bg-green-900' : 'bg-gray-900'
                    }`}
                  >
                    <span className="text-gray-400 truncate mr-2">{category}</span>
                    <span className={`font-semibold uppercase ${
                      !myAnswer ? 'text-gray-600' :
                      isRejected ? 'text-red-400 line-through' :
                      isDuplicate ? 'text-red-400 line-through' :
                      isUnique ? 'text-green-400' :
                      'text-gray-300'
                    }`}>
                      {myAnswer || '—'}
                      {isRejected && <span className="ml-1 text-red-400 text-xs">rejected</span>}
                      {isUnique && <span className="ml-1 text-green-400">+1</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Waiting for reveal to start
  const showWaitingForReveal = () => {
    return (
      <div className="max-w-screen-sm mx-auto p-4">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <p className="text-2xl text-gray-300 mb-4">Time's Up!</p>
          <p className="text-lg text-gray-400">
            Your answers have been submitted.
          </p>

          {firstPlayer ? (
            <button
              onClick={handleStartReveal}
              className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-xl"
            >
              Start Reveal
            </button>
          ) : (
            <p className="mt-4 text-lg text-gray-400">
              Waiting for <span className="text-green-500 font-bold">{players[0]?.name}</span> to start the reveal
            </p>
          )}
        </div>

        {/* Show player's own answers */}
        <div className="bg-gray-800 p-3 rounded-lg mt-2">
          <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">Your Answers</p>
          <div className="grid grid-cols-1 gap-1">
            {categories.map((category, idx) => (
              <div key={idx} className="flex justify-between items-center px-2 py-1 bg-gray-900 rounded">
                <span className="text-gray-400 text-sm truncate mr-2">{category}</span>
                <span className="text-gray-200 font-semibold uppercase">
                  {answers[idx] || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Main render logic
  if (roundData.answersRevealed) {
    return showRevealPhase();
  }

  if (timesUp || roundData.timerEnded) {
    return showWaitingForReveal();
  }

  return showInputPhase();
};

export default PlayerScattergoriesRoundPage;
