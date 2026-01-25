import React, { useState, useEffect, useContext, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Button from '../../components/Button';
import { getWordsOutOfWordsWords } from '../../utils';
import OutOfWordsWords from '../../components/OutOfWordsWords';
import WordAndScore from '../../components/WordAndScore';

const PlayerWordsRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, minWordLength, gameTime, numRounds, untimed, language = 'en', columnLayout = false } = gameData;
  const currentPlayerIndex = currentRound % players.length;

  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const firstPlayer = players[0].name === currentPlayerName;
  const isSinglePlayer = players.length === 1;

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

  // Missed words state
  const [validWordList, setValidWordList] = useState([]);
  const [missedWords, setMissedWords] = useState([]);

  // Single player mode state
  const [singlePlayerScore, setSinglePlayerScore] = useState(0);
  const [singlePlayerComplete, setSinglePlayerComplete] = useState(false);

  // Ref to track if we've initialized from Firebase (for refresh recovery)
  const hasInitializedFromFirebase = useRef(false);

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
    hasInitializedFromFirebase.current = false;  // Reset for new round
    // Reset single player state
    setSinglePlayerScore(0);
    setSinglePlayerComplete(false);
    setMissedWords([]);

    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (docSnap) => {
          setRoundRef(_roundRef);
          const data = docSnap.data();

          // Document was deleted (e.g., Play Again) - don't process
          if (!data) return;

          setRoundData(data);

          // Restore state on refresh (only once)
          if (!hasInitializedFromFirebase.current) {
            // Handle refresh during reveal phase
            if (data.wordsRevealed) {
              hasInitializedFromFirebase.current = true;

              // CRITICAL: Restore foundWords FIRST, before setting timesUp
              // (because timesUp triggers a useEffect that writes foundWords to Firebase)
              const currentPlayer = players.find(p => p.name === currentPlayerName);
              if (currentPlayer?.foundWords) {
                setFoundWords(currentPlayer.foundWords);
              }

              setTimesUp(true);
              setWordsRevealed(true);

              // Restore reveal progress from Firebase
              if (data.globallyRevealedWords) {
                setGloballyRevealedWords(data.globallyRevealedWords);
              }
              if (data.playerScores) {
                setPlayerScores(data.playerScores);
              }
              if (data.revealState) {
                setRevealPlayerIndex(data.revealState.currentPlayerIndex || 0);
                // +1 to move to next word after the last revealed one
                setRevealWordIndex((data.revealState.currentWordIndex || 0) + 1);
              }

              // Restore player order (needed for first player to continue reveal)
              const sortedPlayers = [...players].sort(
                (a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0)
              );
              setPlayerOrder(sortedPlayers);
            }
            // Handle refresh in untimed mode when round ended but reveal not started
            // Only restore if Firebase actually has words (meaning it's a refresh, not normal gameplay)
            else if (untimed && data.roundEnded) {
              hasInitializedFromFirebase.current = true;
              const currentPlayer = players.find(p => p.name === currentPlayerName);
              // Only restore if there are actually words to restore (page refresh scenario)
              // In normal gameplay, players subcollection was reset so foundWords is empty
              if (currentPlayer?.foundWords?.length > 0) {
                setFoundWords(currentPlayer.foundWords);
              }
              setTimesUp(true);
            }
          }

          // Start timer when word is chosen (only in timed mode)
          if (data.word && !timer && !data.wordsRevealed && !untimed) {
            // Mark as initialized once the game is in progress
            // This prevents restore logic from overwriting local state during normal gameplay
            hasInitializedFromFirebase.current = true;
            timer = setTimeout(() => setTimesUp(true), duration * 1000);
          }

          // In untimed mode, mark as initialized when word is chosen (game in progress)
          if (untimed && data.word && !data.wordsRevealed && !data.roundEnded) {
            hasInitializedFromFirebase.current = true;
          }

          // In untimed mode, listen for roundEnded from first player
          if (untimed && data.roundEnded) {
            setTimesUp(true);
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

  // Load valid word list for missed words calculation
  useEffect(() => {
    const loadWordList = async () => {
      try {
        const wordFile = language === 'ru' ? 'words/valid_words_ru.txt' : 'words/valid_words.txt';
        const response = await fetch(wordFile);
        if (response.ok) {
          const text = await response.text();
          const words = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w);
          setValidWordList(words);
        }
      } catch (err) {
        console.error('Failed to load word list:', err);
      }
    };
    loadWordList();
  }, [language]);

  // Single player mode: calculate score and missed words immediately when time is up
  useEffect(() => {
    if (!isSinglePlayer || !timesUp || !roundData?.word || validWordList.length === 0 || singlePlayerComplete) return;

    const mainWord = roundData.word.toUpperCase();

    // Helper: check if a word can be formed from the main word's letters
    const canFormWord = (word, availableLetters) => {
      const letterCount = {};
      for (const letter of availableLetters) {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
      }
      for (const letter of word) {
        if (!letterCount[letter] || letterCount[letter] === 0) {
          return false;
        }
        letterCount[letter]--;
      }
      return true;
    };

    // Calculate total score - each word gets (length - minWordLength + 1) * 1
    // (as if playing against 1 opponent who got 0 words)
    const totalScore = foundWords.reduce((sum, word) => {
      return sum + (word.length - minWordLength + 1);
    }, 0);
    setSinglePlayerScore(totalScore);

    // Find missed words (5+ letters that could be formed but weren't found)
    const possibleWords = validWordList.filter(word =>
      word.length >= 5 && word !== mainWord && canFormWord(word, mainWord)
    );

    const foundWordsUpper = new Set(foundWords.map(w => w.toUpperCase()));
    const missed = possibleWords
      .filter(w => !foundWordsUpper.has(w))
      .sort((a, b) => b.length - a.length || a.localeCompare(b));
    setMissedWords(missed);

    setSinglePlayerComplete(true);

    // Update Firebase with the score
    async function updateSinglePlayerScore() {
      const currentPlayer = players[0];
      const newGameScore = (currentPlayer.gameScore || 0) + totalScore;

      // Update player's game score
      const playersRef = collection(gameRef, 'players');
      const playerDocRef = doc(playersRef, currentPlayerId);
      await updateDoc(playerDocRef, { gameScore: newGameScore });

      // Mark round as complete
      await updateDoc(roundRef, {
        revealComplete: true,
        playerScores: { [currentPlayerId]: totalScore },
        players: [{ ...currentPlayer, score: totalScore, gameScore: newGameScore }]
      });
    }

    if (roundRef) {
      updateSinglePlayerScore();
    }
  }, [isSinglePlayer, timesUp, roundData?.word, validWordList, foundWords, singlePlayerComplete]);

  // Calculate missed words when reveal completes
  useEffect(() => {
    if (!roundData?.revealComplete || !roundData?.word || validWordList.length === 0) return;
    if (isSinglePlayer) return; // Already handled above for single player

    const mainWord = roundData.word.toUpperCase();

    // Helper: check if a word can be formed from the main word's letters
    const canFormWord = (word, availableLetters) => {
      const letterCount = {};
      for (const letter of availableLetters) {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
      }
      for (const letter of word) {
        if (!letterCount[letter] || letterCount[letter] === 0) {
          return false;
        }
        letterCount[letter]--;
      }
      return true;
    };

    // Find all possible words (5+ letters) that can be formed, excluding the original word
    const possibleWords = validWordList.filter(word =>
      word.length >= 5 && word !== mainWord && canFormWord(word, mainWord)
    );

    // Get all words found by all players
    const allFoundWords = new Set();
    players.forEach(p => {
      (p.foundWords || []).forEach(w => allFoundWords.add(w.toUpperCase()));
    });

    // Missed words = possible words that nobody found
    const missed = possibleWords
      .filter(w => !allFoundWords.has(w))
      .sort((a, b) => b.length - a.length || a.localeCompare(b));

    setMissedWords(missed);
  }, [roundData?.revealComplete, roundData?.word, validWordList, players]);

  const handleWordSelection = async (wordOption) => {
    setWord(wordOption);
    await updateDoc(roundRef, {
      word: wordOption
    });
  }

  const handleRevealWords = async () => {
    // Mark as initialized so we don't restore from Firebase on updates
    hasInitializedFromFirebase.current = true;
    setWordsRevealed(true);

    // Build player list with up-to-date foundWords
    // For current player, use local state (always up-to-date)
    // For other players, use Firebase data (players prop)
    const playersWithWords = players.map(p => {
      if (p.name === currentPlayerName) {
        return { ...p, foundWords: foundWords };
      }
      return p;
    });

    // Sort players by word count (most first) and fix this order
    const sortedPlayers = [...playersWithWords].sort(
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

      // Also update the players subcollection with final gameScores
      // (needed for end game stats)
      const playersRef = collection(gameRef, 'players');
      const updatePromises = updatedPlayers.map(p => {
        const playerDocRef = doc(playersRef, p.id);
        return updateDoc(playerDocRef, { gameScore: p.gameScore });
      });
      await Promise.all(updatePromises);

      return;
    }

    // Update indices if we moved to a different position
    if (foundPlayerIndex !== revealPlayerIndex) {
      setRevealPlayerIndex(foundPlayerIndex);
    }
    setRevealWordIndex(foundWordIndex);

    // Start animating
    setIsAnimating(true);

    // Calculate points: (wordLength - minWordLength + 1) * playersWithoutWord
    // This incentivizes longer words more than the minimum length
    const playersWithWord = playerOrder.filter(p => p.foundWords?.includes(nextWord));
    const playersWithoutWordCount = playerOrder.length - playersWithWord.length;
    const points = (nextWord.length - minWordLength + 1) * playersWithoutWordCount;

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
    }, 1000);
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
        // Reset foundWords for all players in Firebase before starting next round
        const playersRef = collection(gameRef, 'players');
        const playersSnapshot = await getDocs(playersRef);
        const resetPromises = playersSnapshot.docs.map(playerDoc =>
          updateDoc(playerDoc.ref, { foundWords: [] })
        );
        await Promise.all(resetPromises);

        // Create next round with clean player data (no foundWords)
        const cleanPlayers = updatedPlayers.map(p => ({
          ...p,
          foundWords: []
        }));

        const roundsRef = collection(gameRef, "rounds")
        await addDoc(roundsRef, {
          roundNumber: currentRound + 1,
          word: '',
          players: cleanPlayers,
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
    // Cross out only if worth 0 points (everyone had it)
    const isCrossedOut = scoreInfo.points === 0;
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

    // Get current player's found words - use local state which is always up-to-date
    // (players prop may not have updated from Firebase yet)
    const myWords = foundWords;

    // For non-first players, reconstruct player order from players prop
    // but use local foundWords for current player
    const playersWithMyWords = players.map(p =>
      p.name === currentPlayerName ? { ...p, foundWords: foundWords } : p
    );
    const displayPlayerOrder = playerOrder.length > 0
      ? playerOrder
      : [...playersWithMyWords].sort((a, b) => (b.foundWords?.length || 0) - (a.foundWords?.length || 0));

    // Get current reveal player index from Firebase for non-first players
    const currentRevealIdx = firstPlayer ? revealPlayerIndex : (revealState.currentPlayerIndex || 0);

    // Progress text
    const currentRevealPlayer = displayPlayerOrder[currentRevealIdx];
    const progressText = currentRevealPlayer
      ? `${currentRevealPlayer.name}'s words`
      : '';

    // Get current word info for display
    const revealedWords = firstPlayer ? globallyRevealedWords : (roundData.globallyRevealedWords || {});
    const currentWordInfo = currentRevealWord ? revealedWords[currentRevealWord] : null;
    const currentWordPoints = currentWordInfo?.points || 0;
    const currentWordLength = currentRevealWord?.length || 0;

    // Find all players who have the current word
    const playersWithCurrentWord = currentRevealWord
      ? displayPlayerOrder.filter(p => p.foundWords?.includes(currentRevealWord)).map(p => p.name)
      : [];

    // Get celebration based on word length (same as WordAndScore)
    const getCelebration = (length, points) => {
      if (points === 0) return { emoji: '', text: '', textClass: '' };
      if (length >= 7) return { emoji: '🔥', text: 'INCREDIBLE!!!', textClass: 'text-yellow-400 font-black italic' };
      if (length === 6) return { emoji: '⭐', text: 'Amazing!', textClass: 'text-yellow-300 font-bold italic' };
      if (length === 5) return { emoji: '✨', text: 'nice', textClass: 'text-blue-300 font-semibold' };
      return { emoji: '', text: '', textClass: '' };
    };

    const celebration = getCelebration(currentWordLength, currentWordPoints);

    return (
      <div className="m-2">
        {/* Reveal header with word, score, and players */}
        {!roundData.revealComplete && (
          <div className="bg-gray-800 border border-green-500 rounded-lg mb-2 p-3">
            {/* Top row: whose words + Next button */}
            <div className="flex items-center justify-between">
              <p className="text-xl text-gray-200 font-semibold">{currentRevealPlayer?.name}'s Words</p>
              {firstPlayer && (
                <button
                  onClick={handleNextReveal}
                  disabled={isAnimating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold rounded-lg text-lg whitespace-nowrap"
                >
                  Next
                </button>
              )}
            </div>

            {/* Word, score, and celebration - all on one line */}
            <div className="flex items-center justify-center gap-2 my-3 min-h-[48px]">
              {celebration.emoji && currentWordInfo && (
                <span className="text-2xl">{celebration.emoji}</span>
              )}
              <span className="text-4xl font-bold text-green-400 uppercase">
                {currentRevealWord || '—'}
              </span>
              {currentWordInfo && (
                <span className={`text-3xl font-bold ${currentWordPoints > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentWordPoints > 0 ? `+${currentWordPoints}` : '(0)'}
                </span>
              )}
              {celebration.text && currentWordInfo && (
                <span className={`text-lg ${celebration.textClass}`}>{celebration.text}</span>
              )}
            </div>

            {/* Players who had this word */}
            {currentWordInfo && playersWithCurrentWord.length > 0 && (
              <div className="bg-gray-900 rounded-lg px-3 py-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {playersWithCurrentWord.map((name, idx) => (
                    <span key={idx} className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-base">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All players scores - sorted by points - only show after reveal complete */}
        {roundData.revealComplete && (
          <div className="bg-gray-800 p-3 rounded-lg mb-2">
            <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">Leaderboard</p>
            <div className="flex flex-col gap-1">
              {[...displayPlayerOrder]
                .map(player => ({ ...player, score: myScores[player.id] || 0 }))
                .sort((a, b) => b.score - a.score)
                .map((player, index) => {
                  const isMe = player.name === currentPlayerName;
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                  return (
                    <div
                      key={player.id || index}
                      className={`flex justify-between items-center px-2 py-1 rounded
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

        {/* Missed words - show after reveal complete */}
        {roundData.revealComplete && missedWords.length > 0 && (
          <div className="bg-gray-800 p-3 rounded-lg mb-2">
            <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">
              Missed Words ({missedWords.length})
            </p>
            <div className="grid grid-cols-3 gap-1 text-lg">
              {missedWords.map((word, index) => (
                <span key={index} className="text-gray-200">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Player's own words */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">Your Words ({myWords.length})</p>
          <div className="grid grid-cols-2 gap-1 text-xl">
            {myWords.map((word, index) => {
              const { isRevealed, isCrossedOut, points } = getWordDisplayInfo(word);
              const isCurrentWord = currentRevealWord === word;

              return (
                <WordAndScore
                  key={index}
                  word={word}
                  points={points}
                  highlight={isCurrentWord}
                  isRevealed={isRevealed}
                  isCrossedOut={isCrossedOut}
                />
              );
            })}
          </div>
        </div>

        {/* Reveal complete - show next round button for first player */}
        {roundData.revealComplete && (
          <div className="mt-2">
            {firstPlayer ? (
              <button
                onClick={startNextRound}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-xl"
              >
                {currentRound === (numRounds || players.length) ? 'End Game' : 'Next Round'}
              </button>
            ) : (
              <p className="text-xl text-gray-300 bg-gray-800 px-3 py-3 rounded-lg text-center">
                Waiting for <span className="text-green-500 font-bold">{players[0].name}</span>
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
      <p className="mx-4 text-2xl font-semibold text-gray-300 bg-gray-800 px-4 py-4 rounded-lg shadow mt-4">
        {untimed ? 'Round ended!' : 'Times up!'} <br></br>Now <span className="text-green-500 font-bold">{players[0].name}</span> can start the reveal.
      </p>
    );
  }

  // Single player results view - shown immediately when time is up
  const showSinglePlayerResults = () => {
    if (!singlePlayerComplete) {
      return (
        <div className="m-4 text-gray-300">
          <div className="animate-pulse">Calculating results...</div>
        </div>
      );
    }

    // Get word info with points
    const getWordPoints = (word) => word.length - minWordLength + 1;

    // Sort words by points (length) descending
    const sortedWords = [...foundWords].sort((a, b) => b.length - a.length);

    return (
      <div className="m-2">
        {/* Score summary */}
        <div className="bg-gradient-to-b from-green-700 to-green-900 rounded-lg p-4 mb-2 text-center">
          <p className="text-xl text-green-200 mb-1">Round {currentRound} Complete!</p>
          <div className="text-5xl font-bold text-white mb-1">{singlePlayerScore}</div>
          <p className="text-green-200">points</p>
        </div>

        {/* Words found with points */}
        <div className="bg-gray-800 p-3 rounded-lg mb-2">
          <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">
            Your Words ({foundWords.length})
          </p>
          <div className="grid grid-cols-2 gap-1">
            {sortedWords.map((word, index) => {
              const points = getWordPoints(word);
              return (
                <div key={index} className="flex justify-between items-center bg-gray-900 px-2 py-1 rounded">
                  <span className="text-white text-lg uppercase">{word}</span>
                  <span className="text-green-400 font-bold">+{points}</span>
                </div>
              );
            })}
          </div>
          {foundWords.length === 0 && (
            <p className="text-gray-500 text-center py-2">No words found</p>
          )}
        </div>

        {/* Missed words */}
        {missedWords.length > 0 && (
          <div className="bg-gray-800 p-3 rounded-lg mb-2">
            <p className="text-lg text-gray-400 mb-2 border-b border-gray-600 pb-1">
              Missed Words ({missedWords.length})
            </p>
            <div className="grid grid-cols-3 gap-1 text-lg max-h-48 overflow-y-auto">
              {missedWords.map((word, index) => (
                <span key={index} className="text-gray-400">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next round button */}
        <button
          onClick={startNextRound}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-xl"
        >
          {currentRound === (numRounds || players.length) ? 'See Final Results' : 'Next Round'}
        </button>
      </div>
    );
  };

  const handleEndRound = async () => {
    // In untimed mode, notify all players via Firebase
    if (roundRef) {
      await updateDoc(roundRef, { roundEnded: true });
    }
    setTimesUp(true);
  };

  const showMakeWords = () => {
    return (
      <div className='max-w-screen-sm bg-gray-800'>
        {/* Header with round and word */}
        <div className="flex justify-between items-center font-semibold text-gray-300 border-b border-gray-600 px-3 py-2">
          <span className='text-lg'>Round {currentRound}</span>
          <span className='text-2xl font-bold uppercase text-green-500'>{roundData.word}</span>
        </div>
        <OutOfWordsWords
          word={roundData.word}
          minWordLength={minWordLength}
          foundWords={foundWords}
          setFoundWords={setFoundWords}
          duration={duration}
          untimed={untimed}
          language={language}
          columnLayout={columnLayout} />
        {/* End Round button for first player in untimed mode */}
        {untimed && firstPlayer && (
          <div className="px-3 pb-3">
            <button
              onClick={handleEndRound}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg text-lg"
            >
              End Round
            </button>
          </div>
        )}
      </div>
    )
  }

  const showChooseWord = () => {

    if (!wordList || wordList.length === 0) {
      const _wordList = getWordsOutOfWordsWords(language);
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
        // Single player mode: show results directly without reveal sequence
        if (isSinglePlayer) {
          return showSinglePlayerResults();
        }
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