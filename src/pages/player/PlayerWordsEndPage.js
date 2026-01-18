import React, { useState, useEffect, useContext } from 'react';
import { collection, query, getDocs, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Spinner from '../../components/Spinner';

function PlayerWordsEndPage({ gameData, gameRef, players }) {
  const [allRounds, setAllRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const { currentPlayerName } = useContext(CurrentGameContext);
  const firstPlayer = players[0]?.name === currentPlayerName;

  // Fetch all rounds data
  useEffect(() => {
    async function fetchAllRounds() {
      try {
        const roundsRef = collection(gameRef, 'rounds');
        const q = query(roundsRef, orderBy('roundNumber', 'asc'));
        const querySnapshot = await getDocs(q);

        const rounds = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setAllRounds(rounds);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching rounds: ", error);
        setLoading(false);
      }
    }

    fetchAllRounds();
  }, [gameRef]);

  // Calculate stats when rounds are loaded
  useEffect(() => {
    if (allRounds.length === 0) return;

    // Compile all words found by each player across all rounds
    const playerStats = {};
    const allWordsInGame = [];
    const wordFrequency = {}; // Track how many players found each word

    players.forEach(p => {
      playerStats[p.name] = {
        name: p.name,
        totalScore: p.gameScore || 0,
        totalWords: 0,
        longestWord: '',
        allWords: [],
        uniqueWords: [], // Words only this player found
        bestRoundWords: 0
      };
    });

    // Process each round
    allRounds.forEach(round => {
      if (!round.players) return;

      const roundWordCounts = {};

      round.players.forEach(p => {
        const words = p.foundWords || [];
        const playerName = p.name;

        if (!playerStats[playerName]) return;

        // Track words per round for "best round" stat
        roundWordCounts[playerName] = words.length;

        words.forEach(word => {
          playerStats[playerName].allWords.push(word);
          playerStats[playerName].totalWords++;

          // Track longest word
          if (word.length > playerStats[playerName].longestWord.length) {
            playerStats[playerName].longestWord = word;
          }

          // Track word frequency for unique words
          const upperWord = word.toUpperCase();
          if (!wordFrequency[upperWord]) {
            wordFrequency[upperWord] = [];
          }
          wordFrequency[upperWord].push(playerName);

          // Add to all words list
          allWordsInGame.push({
            word: upperWord,
            player: playerName,
            length: word.length,
            round: round.roundNumber
          });
        });
      });

      // Update best round count
      Object.entries(roundWordCounts).forEach(([name, count]) => {
        if (playerStats[name] && count > playerStats[name].bestRoundWords) {
          playerStats[name].bestRoundWords = count;
        }
      });
    });

    // Find unique words (only one player found it across all rounds)
    Object.entries(wordFrequency).forEach(([word, foundBy]) => {
      if (foundBy.length === 1) {
        const playerName = foundBy[0];
        if (playerStats[playerName]) {
          playerStats[playerName].uniqueWords.push(word);
        }
      }
    });

    // Calculate awards
    const sortedByScore = Object.values(playerStats).sort((a, b) => b.totalScore - a.totalScore);
    const sortedByWords = Object.values(playerStats).sort((a, b) => b.totalWords - a.totalWords);
    const sortedByLongest = Object.values(playerStats).sort((a, b) => b.longestWord.length - a.longestWord.length);
    const sortedByUnique = Object.values(playerStats).sort((a, b) => b.uniqueWords.length - a.uniqueWords.length);
    const sortedByBestRound = Object.values(playerStats).sort((a, b) => b.bestRoundWords - a.bestRoundWords);

    // Find longest words overall
    const longestWords = [...allWordsInGame]
      .sort((a, b) => b.length - a.length)
      .slice(0, 5);

    setStats({
      playerStats,
      leaderboard: sortedByScore,
      awards: {
        wordWizard: sortedByWords[0], // Most words
        bigWordEnergy: sortedByLongest[0], // Longest word
        uniqueMind: sortedByUnique[0]?.uniqueWords.length > 0 ? sortedByUnique[0] : null, // Most unique
        hotStreak: sortedByBestRound[0] // Best single round
      },
      longestWords,
      totalWordsFound: allWordsInGame.length,
      totalRounds: allRounds.length
    });
  }, [allRounds, players]);

  const handlePlayAgain = async () => {
    // Reset game state to setup, keeping the same players
    try {
      // Delete all rounds
      const roundsRef = collection(gameRef, 'rounds');
      const roundsSnapshot = await getDocs(roundsRef);
      const deletePromises = roundsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Reset player scores
      const playersRef = collection(gameRef, 'players');
      const playersSnapshot = await getDocs(playersRef);

      const updatePromises = playersSnapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          gameScore: 0,
          foundWords: []
        })
      );
      await Promise.all(updatePromises);

      // Reset game state
      await updateDoc(gameRef, {
        gameState: 'setup',
        currentRound: 0
      });
    } catch (error) {
      console.error("Error resetting game:", error);
    }
  };

  if (loading || !stats) {
    return <Spinner />;
  }

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  const currentPlayerStats = stats.playerStats[currentPlayerName];
  const currentPlayerRank = stats.leaderboard.findIndex(p => p.name === currentPlayerName) + 1;

  return (
    <div className="max-w-screen-sm mx-auto p-2">
      {/* Winner Celebration */}
      <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-lg p-4 mb-2 text-center">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="text-2xl font-bold text-white">
          {stats.leaderboard[0].name} Wins!
        </h2>
        <p className="text-yellow-200 text-lg">
          {stats.leaderboard[0].totalScore} points
        </p>
      </div>

      {/* Final Standings */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
          Final Standings
        </h3>
        <div className="flex flex-col gap-2">
          {stats.leaderboard.map((player, index) => {
            const isMe = player.name === currentPlayerName;
            return (
              <div
                key={player.name}
                className={`flex items-center justify-between px-3 py-2 rounded-lg
                  ${isMe ? 'bg-green-900 border border-green-500' : 'bg-gray-900'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl w-8">{getMedal(index)}</span>
                  <span className={`text-lg ${isMe ? 'font-bold text-white' : 'text-gray-300'}`}>
                    {player.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm">{player.totalWords} words</span>
                  <span className="text-xl font-bold text-green-400">{player.totalScore}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Awards */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
          Awards
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {/* Word Wizard - Most Words */}
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-sm text-gray-400">Word Wizard</div>
            <div className="text-lg font-bold text-white">{stats.awards.wordWizard.name}</div>
            <div className="text-sm text-green-400">{stats.awards.wordWizard.totalWords} words</div>
          </div>

          {/* Big Word Energy - Longest Word */}
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🧠</div>
            <div className="text-sm text-gray-400">Big Word Energy</div>
            <div className="text-lg font-bold text-white">{stats.awards.bigWordEnergy.name}</div>
            <div className="text-sm text-green-400">{stats.awards.bigWordEnergy.longestWord}</div>
          </div>

          {/* Hot Streak - Best Single Round */}
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-sm text-gray-400">Hot Streak</div>
            <div className="text-lg font-bold text-white">{stats.awards.hotStreak.name}</div>
            <div className="text-sm text-green-400">{stats.awards.hotStreak.bestRoundWords} in one round</div>
          </div>

          {/* Unique Mind - Most Unique Words */}
          {stats.awards.uniqueMind && (
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-sm text-gray-400">Unique Mind</div>
              <div className="text-lg font-bold text-white">{stats.awards.uniqueMind.name}</div>
              <div className="text-sm text-green-400">{stats.awards.uniqueMind.uniqueWords.length} unique</div>
            </div>
          )}
        </div>
      </div>

      {/* Your Stats */}
      {currentPlayerStats && (
        <div className="bg-gray-800 rounded-lg p-4 mb-2">
          <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
            Your Stats
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-3xl font-bold text-green-400">{currentPlayerRank}{currentPlayerRank === 1 ? 'st' : currentPlayerRank === 2 ? 'nd' : currentPlayerRank === 3 ? 'rd' : 'th'}</div>
              <div className="text-sm text-gray-400">Place</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">{currentPlayerStats.totalScore}</div>
              <div className="text-sm text-gray-400">Points</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{currentPlayerStats.totalWords}</div>
              <div className="text-sm text-gray-400">Words Found</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400 uppercase">{currentPlayerStats.longestWord || '-'}</div>
              <div className="text-sm text-gray-400">Longest Word</div>
            </div>
          </div>
          {currentPlayerStats.uniqueWords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Your Unique Finds ({currentPlayerStats.uniqueWords.length})</div>
              <div className="flex flex-wrap gap-1">
                {currentPlayerStats.uniqueWords.slice(0, 10).map(word => (
                  <span key={word} className="bg-purple-900 text-purple-200 px-2 py-1 rounded text-sm">
                    {word}
                  </span>
                ))}
                {currentPlayerStats.uniqueWords.length > 10 && (
                  <span className="text-gray-500 text-sm">+{currentPlayerStats.uniqueWords.length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Stats */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
          Game Stats
        </h3>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-gray-200">{stats.totalRounds}</div>
            <div className="text-sm text-gray-400">Rounds</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-200">{stats.totalWordsFound}</div>
            <div className="text-sm text-gray-400">Total Words</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-200">{players.length}</div>
            <div className="text-sm text-gray-400">Players</div>
          </div>
        </div>

        {/* Longest Words */}
        {stats.longestWords.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-2">Longest Words of the Game</div>
            <div className="flex flex-wrap gap-2">
              {stats.longestWords.map((item, idx) => (
                <div key={idx} className="bg-gray-900 px-2 py-1 rounded">
                  <span className="text-white font-semibold">{item.word}</span>
                  <span className="text-gray-500 text-sm ml-1">({item.player})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Play Again Button */}
      {firstPlayer ? (
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-xl mb-4"
        >
          Play Again
        </button>
      ) : (
        <p className="text-center text-gray-400 py-4 mb-4">
          Waiting for <span className="text-green-500 font-bold">{players[0]?.name}</span> to start a new game...
        </p>
      )}
    </div>
  );
}

export default PlayerWordsEndPage;
