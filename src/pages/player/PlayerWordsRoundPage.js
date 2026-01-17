import React, { useState, useEffect, useContext, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Button from '../../components/Button';
import { getWordsOutOfWordsWords } from '../../utils';
import OutOfWordsWords from '../../components/OutOfWordsWords';
import WordAndScore from '../../components/WordAndScore';

const PlayerWordsRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, minWordLength, gameTime, numRounds } = gameData;
  const currentPlayerIndex = currentRound % players.length;

  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const firstPlayer = players[0].name === currentPlayerName;

  const [word, setWord] = useState('');
  const [roundData, setRoundData] = useState('');
  const [roundRef, setRoundRef] = useState(null);
  const [wordList, setWordList] = useState([]);
  const [timesUp, setTimesUp] = useState(false);
  const [foundWords, setFoundWords] = useState([]);
  const [wordsRevealed, setWordsRevealed] = useState(false);
  const [customWord, setCustomWord] = useState('');

  // Reveal state (for first player only)
  const [playerOrder, setPlayerOrder] = useState([]);
  const [revealPlayerIndex, setRevealPlayerIndex] = useState(0);
  const [revealWordIndex, setRevealWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [globallyRevealedWords, setGloballyRevealedWords] = useState({});
  const [playerScores, setPlayerScores] = useState({});

  // Ref to track if we've already restored state from Firebase (prevents re-restore on every update)
  const hasRestoredState = useRef(false);

  const duration = gameTime * 60;

  let timer;

  useEffect(() => {
    console.log({ currentPlayerId })
  }, [currentPlayerId])

  useEffect(() => {
    if (timesUp) {
      async function updateFoundWords() {
        try {
          const currentPlayerDocRef = doc(gameRef, 'players', currentPlayerId);
          await updateDoc(currentPlayerDocRef, {
            foundWords: foundWords
          });
    
        } catch (error) {
          console.error("Error updating player's chosenCards: ", error);
        }
      }

      updateFoundWords()
    }
  }, [timesUp])

  useEffect(() => {
    setTimesUp(false);
    setFoundWords([]);
    setWordsRevealed(false);
    setRoundData(null);  // Clear old round data to prevent flash
    setPlayerOrder([]);
    setRevealPlayerIndex(0);
    setRevealWordIndex(0);
    setGloballyRevealedWords({});
    setPlayerScores({});
    hasRestoredState.current = false;  // Reset restore flag for new round

    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (docSnap) => {
          setRoundRef(_roundRef);
          const data = docSnap.data();
          setRoundData(data);

          // Restore state from Firebase on refresh (only once per round)
          // This detects a page refresh: Firebase says reveal started but we haven't restored yet
          if (data.wordsRevealed && !hasRestoredState.current) {
            hasRestoredState.current = true;  // Mark as restored to prevent re-running
            setWordsRevealed(true);
            setTimesUp(true);

            // Restore reveal state from Firebase
            if (data.globallyRevealedWords) {
              setGloballyRevealedWords(data.globallyRevealedWords);
            }
            if (data.playerScores) {
              setPlayerScores(data.playerScores);
            }
            if (data.revealState) {
              setRevealPlayerIndex(data.revealState.currentPlayerIndex || 0);
              // +1 because we want to start at the next word after the last revealed one
              setRevealWordIndex((data.revealState.currentWordIndex || 0) + 1);
            }

            // Restore player order for reveal display
            const sortedPlayers = [...players].sort(
              (a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0)
            );
            setPlayerOrder(sortedPlayers);
          } else if (data.word && !timer && !data.wordsRevealed) {
            // Only start timer if we're not in reveal phase
            timer = setTimeout(() => setTimesUp(true), duration * 1000);
          }
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [currentRound, gameRef]);

  useEffect(() => {
    const currPlayer = players.find(player => player.name === currentPlayerName);
  }, [players, currentPlayerName]);

  const handleWordSelection = async (wordOption) => {
    setWord(wordOption);
    await updateDoc(roundRef, {
      word: wordOption
    });
  }

  const handleRevealWords = async () => {
    hasRestoredState.current = true;  // Prevent restore logic from overwriting our state
    setWordsRevealed(true);

    // Sort players by word count (most first) and fix this order
    const sortedPlayers = [...players].sort(
      (a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0)
    );
    setPlayerOrder(sortedPlayers);

    // Initialize player scores
    const initialScores = {};
    sortedPlayers.forEach(p => { initialScores[p.id] = 0; });
    setPlayerScores(initialScores);

    await updateDoc(roundRef, {
      wordsRevealed: true,
      revealState: {
        currentPlayerIndex: 0,
        currentWordIndex: 0,
        currentWord: ''
      }
    });
  }

  // Helper to find next unrevealed word for a player
  const findNextUnrevealedWord = (player, startIndex, revealedWords) => {
    if (!player?.foundWords) return { word: null, index: -1 };
    for (let i = startIndex; i < player.foundWords.length; i++) {
      if (revealedWords[player.foundWords[i]] === undefined) {
        return { word: player.foundWords[i], index: i };
      }
    }
    return { word: null, index: -1 };
  };

  // Helper to find next player with unrevealed words
  const findNextPlayerWithUnrevealedWords = (startPlayerIndex, revealedWords) => {
    for (let i = startPlayerIndex; i < playerOrder.length; i++) {
      const { word } = findNextUnrevealedWord(playerOrder[i], 0, revealedWords);
      if (word !== null) {
        return i;
      }
    }
    return -1; // No more players with unrevealed words
  };

  const handleNextReveal = async () => {
    if (isAnimating) return;

    // Find the next unrevealed word starting from current position
    let searchPlayerIndex = revealPlayerIndex;
    let searchWordIndex = revealWordIndex;
    let nextWord = null;
    let foundPlayerIndex = -1;
    let foundWordIndex = -1;

    // Search for next unrevealed word
    while (searchPlayerIndex < playerOrder.length) {
      const player = playerOrder[searchPlayerIndex];
      const { word, index } = findNextUnrevealedWord(player, searchWordIndex, globallyRevealedWords);

      if (word !== null) {
        nextWord = word;
        foundPlayerIndex = searchPlayerIndex;
        foundWordIndex = index;
        break;
      }

      // Move to next player
      searchPlayerIndex++;
      searchWordIndex = 0;
    }

    // No more unrevealed words - we're done
    if (nextWord === null) {
      const updatedPlayers = playerOrder.map(p => ({
        ...p,
        score: playerScores[p.id] || 0,
        gameScore: (p.gameScore || 0) + (playerScores[p.id] || 0)
      }));

      await updateDoc(roundRef, {
        players: updatedPlayers,
        globallyRevealedWords: globallyRevealedWords,
        playerScores: playerScores,
        revealComplete: true,
        revealState: {
          currentPlayerIndex: revealPlayerIndex,
          currentWordIndex: revealWordIndex,
          currentWord: ''
        }
      });
      return;
    }

    // Update indices if we moved to a different position
    if (foundPlayerIndex !== revealPlayerIndex) {
      setRevealPlayerIndex(foundPlayerIndex);
    }
    setRevealWordIndex(foundWordIndex);

    // Start animating
    setIsAnimating(true);

    // Calculate points: wordLength * playersWithoutWord
    const playersWithWord = playerOrder.filter(p => p.foundWords?.includes(nextWord));
    const playersWithoutWordCount = playerOrder.length - playersWithWord.length;
    const points = nextWord.length * playersWithoutWordCount;

    // Update local state
    const newGloballyRevealedWords = {
      ...globallyRevealedWords,
      [nextWord]: { points, revealedBy: playerOrder[foundPlayerIndex].name }
    };
    setGloballyRevealedWords(newGloballyRevealedWords);

    // Award points to all players who have this word
    const newPlayerScores = { ...playerScores };
    playersWithWord.forEach(p => {
      newPlayerScores[p.id] = (newPlayerScores[p.id] || 0) + points;
    });
    setPlayerScores(newPlayerScores);

    // Update Firebase with current word being revealed
    await updateDoc(roundRef, {
      globallyRevealedWords: newGloballyRevealedWords,
      playerScores: newPlayerScores,
      revealState: {
        currentPlayerIndex: foundPlayerIndex,
        currentWordIndex: foundWordIndex,
        currentWord: nextWord
      }
    });

    // Animation delay, then allow next click (but keep word visible)
    setTimeout(() => {
      setRevealWordIndex(foundWordIndex + 1);
      setIsAnimating(false);
    }, 2000);
  }

  const startNextRound = async () => {
    setWordList([]);
    const updatedPlayers = [...players];
    for (let i = 0; i < roundData.players.length; i++) {
      updatedPlayers[i].gameScore = roundData.players[i].gameScore;
    }

    try {
      const totalRounds = numRounds || roundData.players.length;
      if (currentRound === totalRounds) {
        await updateDoc(gameRef, {
          gameState: "ended"
        });
      } else {
        const roundsRef = collection(gameRef, "rounds")
        await addDoc(roundsRef, {
          roundNumber: currentRound + 1,
          word: '',
          players: updatedPlayers,
        });

        await updateDoc(gameRef, {
          currentRound: currentRound + 1,
        });
      }

    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }

  // Get word display info (same logic as host)
  const getWordDisplayInfo = (word) => {
    // Use Firebase state for non-first-player, local state for first player
    const revealedWords = firstPlayer ? globallyRevealedWords : (roundData.globallyRevealedWords || {});
    const scoreInfo = revealedWords[word];
    if (!scoreInfo) {
      return { isRevealed: false, isCrossedOut: false, points: 0 };
    }
    // Cross out if: someone else revealed it, OR it's worth 0 points (everyone had it)
    const isCrossedOut = scoreInfo.revealedBy !== currentPlayerName || scoreInfo.points === 0;
    return {
      isRevealed: true,
      isCrossedOut,
      points: scoreInfo.points
    };
  };

  // Mobile reveal view - shows current word and player's own words
  const showRevealView = () => {
    const revealState = roundData.revealState || {};
    const currentRevealWord = revealState.currentWord || '';
    const myScores = firstPlayer ? playerScores : (roundData.playerScores || {});
    const myScore = myScores[currentPlayerId] || 0;

    // Get current player's found words
    const currentPlayer = players.find(p => p.name === currentPlayerName);
    const myWords = currentPlayer?.foundWords || [];

    // For non-first players, reconstruct player order from players prop
    const displayPlayerOrder = playerOrder.length > 0
      ? playerOrder
      : [...players].sort((a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0));

    // Get current reveal player index from Firebase for non-first players
    const currentRevealIdx = firstPlayer ? revealPlayerIndex : (revealState.currentPlayerIndex || 0);

    // Progress text
    const currentRevealPlayer = displayPlayerOrder[currentRevealIdx];
    const progressText = currentRevealPlayer
      ? `${currentRevealPlayer.name}'s words`
      : '';

    return (
      <div className="m-4">
        {/* Current word being revealed */}
        {currentRevealWord && (
          <div className="bg-gray-800 border-2 border-green-500 p-5 rounded-lg mb-4">
            <p className="text-lg text-gray-400 uppercase">Revealing</p>
            <p className="text-5xl font-bold text-green-400 uppercase">{currentRevealWord}</p>
          </div>
        )}

        {/* First player controls */}
        {firstPlayer && !roundData.revealComplete && (
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <p className="text-lg text-gray-300 mb-3">{progressText}</p>
            <Button
              className="w-full text-xl"
              buttonType="large"
              onClick={handleNextReveal}
              disabled={isAnimating}
            >
              {isAnimating ? 'Revealing...' : 'Next'}
            </Button>
          </div>
        )}

        {/* All players scores - sorted by points - only show after reveal complete */}
        {roundData.revealComplete && (
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <p className="text-xl text-gray-400 mb-3 border-b border-gray-600 pb-2">Leaderboard</p>
            <div className="flex flex-col gap-2">
              {[...displayPlayerOrder]
                .map(player => ({ ...player, score: myScores[player.id] || 0 }))
                .sort((a, b) => b.score - a.score)
                .map((player, index) => {
                  const isMe = player.name === currentPlayerName;
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                  return (
                    <div
                      key={player.id || index}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg
                        ${isMe ? 'bg-gray-700' : 'bg-gray-900'}`}
                    >
                      <span className={`text-xl ${isMe ? 'font-bold text-white' : 'text-gray-300'}`}>
                        {medal} {player.name}
                      </span>
                      <span className="text-xl font-bold text-green-400">{player.score}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Player's own words */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-xl text-gray-400 mb-3 border-b border-gray-600 pb-2">Your Words</p>
          <div className="grid grid-cols-2 gap-3 text-2xl">
            {myWords.map((word, index) => {
              const { isRevealed, isCrossedOut, points } = getWordDisplayInfo(word);
              const isCurrentWord = currentRevealWord === word;

              return (
                <WordAndScore
                  key={index}
                  word={word}
                  points={points}
                  highlight={isCurrentWord}
                  isRevealed={true}
                  isCrossedOut={isRevealed ? isCrossedOut : false}
                />
              );
            })}
          </div>
        </div>

        {/* Reveal complete - show next round button for first player */}
        {roundData.revealComplete && (
          <div className="mt-4">
            {firstPlayer ? (
              <Button className="w-full" buttonType="large" onClick={startNextRound}>
                {currentRound === (numRounds || players.length) ? 'End Game' : 'Start Next Round'}
              </Button>
            ) : (
              <p className="text-xl font-semibold text-gray-300 bg-gray-800 px-4 py-3 rounded-lg">
                Waiting for <span className="text-green-500 font-bold">{players[0].name}</span> to {currentRound === (numRounds || players.length) ? 'end the game' : 'start next round'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const showFirstPlayerChoices = () => {
    // If reveal has started, show the reveal view
    if (roundData.wordsRevealed) {
      return showRevealView();
    }

    // Otherwise show the "Reveal Words" button
    return (
      <div className='m-4'>
        <Button className="w-full" buttonType="large" onClick={handleRevealWords}>
          Reveal Words
        </Button>
      </div>
    );
  };

  const showWaitingForNextRound = () => {
    // If reveal has started, show the reveal view
    if (roundData.wordsRevealed) {
      return showRevealView();
    }

    // Otherwise show waiting message
    return (
      <p className="mx-4 text-xl font-semibold text-gray-300 bg-gray-800 px-4 py-3 rounded-lg shadow mt-4">
        Times up! <br></br>Now <span className="text-green-500 font-bold">{players[0].name}</span> can start the reveal.
      </p>
    );
  }

  const showMakeWords = () => {
    return (
      <div className='max-w-screen-sm bg-gray-800'>
        <div className="deckContainer mb-4 mx-auto bg-gray-800">
          <p className="flex justify-between items-center font-semibold text-gray-300 bg-gray-800 border-b border-gray-500 px-3 py-2">
            <span className='text-lg'>Round {currentRound}</span>
            <span className='text-2xl font-bold uppercase text-green-500'>{roundData.word}</span>
          </p>
          <div>
            <OutOfWordsWords 
              word={roundData.word} 
              minWordLength={minWordLength} 
              foundWords={foundWords} 
              setFoundWords={setFoundWords}
              duration={duration} />
          </div>
        </div>
      </div>
    )
  }

  const showChooseWord = () => {

    if (!wordList || wordList.length === 0) {
      const _wordList = getWordsOutOfWordsWords();
      setWordList(_wordList);
    }

    return (
      <div className='bg-gray-800 mx-4 text-gray-300 text-xl p-6 mt-4 rounded-lg'>
        <p className="text-2xl font-semibold mb-4">Choose the word for <br></br>round {currentRound}</p>
        <div className="">
          {wordList.map((wordOption, index) => (
            <Button
              key={index}
              onClick={() => handleWordSelection(wordOption)}
              buttonType='large'
              className="w-full mb-6 text-xl">
              {wordOption}
            </Button>
          ))}
        </div>
        <div className="mt-2 border-t border-gray-600 pt-4">
          <p className="text-xl mb-2">Or type your own:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 bg-gray-700 rounded text-white uppercase text-xl"
              placeholder="Enter word..."
            />
            <Button
              onClick={() => handleWordSelection(customWord)}
              disabled={customWord.length < 6}
              className="text-xl px-4"
            >
              Use
            </Button>
          </div>
        </div>
      </div>
    )
  };


  const showWaitingForWord = () => {
    return (
      <div className='m-4 text-gray-300 bg-gray-800 rounded-lg shadow'>
        <p className="text-2xl font-semibold px-4 py-4">
          Waiting for <span className="text-green-500 font-bold">{players[currentPlayerIndex].name}</span> <br></br>to choose the word
        </p>
      </div>
    )
  }

  const displayRoundPage = () => {
    // Show loading while roundData is being fetched
    if (!roundData) {
      return (
        <div className="m-4 text-gray-300">
          <div className="animate-pulse">Loading round...</div>
        </div>
      );
    }

    const chooserName = players[currentPlayerIndex].name;
    const chooser = chooserName === currentPlayerName;

    if (roundData.word) {
      if (timesUp) {
        if (firstPlayer) {
          return showFirstPlayerChoices();
        }
        return showWaitingForNextRound();
      }
      return showMakeWords();
    }

    if (chooser) {
      return showChooseWord();
    }
    return showWaitingForWord();
  }

  return (
    <div className="max-w-screen-sm mx-auto text-center">
      {displayRoundPage()}
    </div>
  );
};

export default PlayerWordsRoundPage;