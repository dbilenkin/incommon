import React, { useState, useEffect, useContext } from 'react';
import { collection, query, getDocs, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Spinner from '../../components/Spinner';
import { resetScattergoriesState } from '../../utils';

function PlayerScattergoriesEndPage({ gameData, gameRef, players }) {
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

    const playerStats = {};

    players.forEach(p => {
      playerStats[p.name] = {
        id: p.id,
        name: p.name,
        totalScore: p.gameScore || 0,
        totalAnswers: 0,
        uniqueAnswers: 0,
        blankAnswers: 0
      };
    });

    // Process each round
    allRounds.forEach(round => {
      const allAnswers = round.allAnswers || {};

      // Count answers per player
      players.forEach(player => {
        const playerAnswers = player.answers || {};
        let roundAnswers = 0;
        let roundUnique = 0;
        let roundBlank = 0;

        for (let catIdx = 0; catIdx < 6; catIdx++) {
          const answer = (playerAnswers[catIdx] || '').trim().toUpperCase();
          if (answer) {
            roundAnswers++;
            const categoryAnswers = allAnswers[catIdx] || {};
            if (categoryAnswers[answer]?.length === 1) {
              roundUnique++;
            }
          } else {
            roundBlank++;
          }
        }

        if (playerStats[player.name]) {
          playerStats[player.name].totalAnswers += roundAnswers;
          playerStats[player.name].uniqueAnswers += roundUnique;
          playerStats[player.name].blankAnswers += roundBlank;
        }
      });
    });

    // Sort leaderboard by score
    const sortedByScore = Object.values(playerStats).sort((a, b) => b.totalScore - a.totalScore);

    setStats({
      playerStats,
      leaderboard: sortedByScore,
      totalRounds: allRounds.length
    });
  }, [allRounds, players]);

  const handlePlayAgain = async () => {
    try {
      // Reset scattergories state for new game
      resetScattergoriesState();

      // Delete all rounds
      const roundsRef = collection(gameRef, 'rounds');
      const roundsSnapshot = await getDocs(roundsRef);
      const deletePromises = roundsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Reset player scores and answers
      const playersRef = collection(gameRef, 'players');
      const playersSnapshot = await getDocs(playersRef);

      const updatePromises = playersSnapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          gameScore: 0,
          answers: {},
          answersSubmitted: false
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
                  <span className="text-gray-400 text-sm">{player.uniqueAnswers} unique</span>
                  <span className="text-xl font-bold text-green-400">{player.totalScore}</span>
                </div>
              </div>
            );
          })}
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
              <div className="text-3xl font-bold text-green-400">
                {currentPlayerRank}{currentPlayerRank === 1 ? 'st' : currentPlayerRank === 2 ? 'nd' : currentPlayerRank === 3 ? 'rd' : 'th'}
              </div>
              <div className="text-sm text-gray-400">Place</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">{currentPlayerStats.totalScore}</div>
              <div className="text-sm text-gray-400">Points</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{currentPlayerStats.uniqueAnswers}</div>
              <div className="text-sm text-gray-400">Unique Answers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">{currentPlayerStats.totalAnswers}</div>
              <div className="text-sm text-gray-400">Total Answers</div>
            </div>
          </div>
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
            <div className="text-2xl font-bold text-gray-200">{stats.totalRounds * 6}</div>
            <div className="text-sm text-gray-400">Categories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-200">{players.length}</div>
            <div className="text-sm text-gray-400">Players</div>
          </div>
        </div>
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

export default PlayerScattergoriesEndPage;
