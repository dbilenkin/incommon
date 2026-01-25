import React, { useState, useEffect, useContext } from 'react';
import { collection, query, getDocs, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Spinner from '../../components/Spinner';

function PlayerWordsEndPage({ gameData, gameRef, players }) {
  const { t } = useTranslation(['endPage', 'common']);
  const [allRounds, setAllRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const { currentPlayerName } = useContext(CurrentGameContext);
  const firstPlayer = players[0]?.name === currentPlayerName;
  const isSinglePlayer = players.length === 1;

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
    const wordFrequency = {}; // Track how many players found each word (and by whom)
    const playerRoundScores = {}; // Track scores per round for each player

    players.forEach(p => {
      playerStats[p.name] = {
        id: p.id,
        name: p.name,
        totalScore: p.gameScore || 0,
        totalWords: 0,
        longestWord: '',
        allWords: [],
        uniqueWords: [], // Words only this player found
        commonWords: [], // Words everyone found
        bestRoundWords: 0,
        roundScores: [] // Score per round
      };
      playerRoundScores[p.name] = [];
    });

    const numPlayers = players.length;

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

        // Track round score
        const roundScore = round.playerScores?.[p.id] || 0;
        playerStats[playerName].roundScores.push(roundScore);

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
            wordFrequency[upperWord] = new Set();
          }
          wordFrequency[upperWord].add(playerName);

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

    // Find unique words and common words
    Object.entries(wordFrequency).forEach(([word, foundBySet]) => {
      const foundBy = Array.from(foundBySet);
      if (foundBy.length === 1) {
        // Unique word - only one player found it
        const playerName = foundBy[0];
        if (playerStats[playerName]) {
          playerStats[playerName].uniqueWords.push(word);
        }
      } else if (foundBy.length === numPlayers) {
        // Common word - everyone found it
        foundBy.forEach(playerName => {
          if (playerStats[playerName]) {
            playerStats[playerName].commonWords.push(word);
          }
        });
      }
    });

    // === HELPER FUNCTIONS FOR AWARDS ===

    // Calculate vowel percentage
    const getVowelPercentage = (word) => {
      const vowels = word.toUpperCase().match(/[AEIOU]/g) || [];
      return vowels.length / word.length;
    };

    // Find longest consecutive consonant streak
    const getConsecutiveConsonants = (word) => {
      const matches = word.toUpperCase().match(/[^AEIOU]+/g) || [];
      return Math.max(0, ...matches.map(m => m.length));
    };

    // Calculate unique letters used
    const getUniqueLetters = (words) => {
      const letters = new Set();
      words.forEach(word => {
        word.toUpperCase().split('').forEach(c => letters.add(c));
      });
      return letters.size;
    };

    // Calculate overlap between two players
    const getPlayerOverlap = (player1Words, player2Words) => {
      const set1 = new Set(player1Words.map(w => w.toUpperCase()));
      const set2 = new Set(player2Words.map(w => w.toUpperCase()));
      let overlap = 0;
      set1.forEach(w => { if (set2.has(w)) overlap++; });
      return overlap;
    };

    // Calculate score variance (for consistency)
    const getScoreVariance = (scores) => {
      if (scores.length < 2) return 0;
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
      return variance;
    };

    // === CALCULATE ALL POSSIBLE AWARDS ===
    const allAwards = [];
    const playerNames = Object.keys(playerStats);

    // 1. Word Wizard - Most words
    const sortedByWords = [...playerNames].sort((a, b) =>
      playerStats[b].totalWords - playerStats[a].totalWords
    );
    if (playerStats[sortedByWords[0]].totalWords > 0) {
      allAwards.push({
        id: 'wordWizard',
        name: t('awards.wordWizard'),
        emoji: '',
        winner: sortedByWords[0],
        detail: t('awards.details.words', { count: playerStats[sortedByWords[0]].totalWords })
      });
    }

    // 2. Big Word Energy - Longest word
    const sortedByLongest = [...playerNames].sort((a, b) =>
      playerStats[b].longestWord.length - playerStats[a].longestWord.length
    );
    if (playerStats[sortedByLongest[0]].longestWord.length > 0) {
      allAwards.push({
        id: 'bigWordEnergy',
        name: t('awards.bigWordEnergy'),
        emoji: '',
        winner: sortedByLongest[0],
        detail: playerStats[sortedByLongest[0]].longestWord
      });
    }

    // 3. Hot Streak - Best single round
    const sortedByBestRound = [...playerNames].sort((a, b) =>
      playerStats[b].bestRoundWords - playerStats[a].bestRoundWords
    );
    if (playerStats[sortedByBestRound[0]].bestRoundWords > 0) {
      allAwards.push({
        id: 'hotStreak',
        name: t('awards.hotStreak'),
        emoji: '',
        winner: sortedByBestRound[0],
        detail: t('awards.details.inOneRound', { count: playerStats[sortedByBestRound[0]].bestRoundWords })
      });
    }

    // 4. Unique Mind - Most unique words
    const sortedByUnique = [...playerNames].sort((a, b) =>
      playerStats[b].uniqueWords.length - playerStats[a].uniqueWords.length
    );
    if (playerStats[sortedByUnique[0]].uniqueWords.length > 0) {
      allAwards.push({
        id: 'uniqueMind',
        name: t('awards.uniqueMind'),
        emoji: '',
        winner: sortedByUnique[0],
        detail: t('awards.details.unique', { count: playerStats[sortedByUnique[0]].uniqueWords.length })
      });
    }

    // 5. Basic - Most words that EVERYONE found
    const sortedByCommon = [...playerNames].sort((a, b) =>
      playerStats[b].commonWords.length - playerStats[a].commonWords.length
    );
    if (playerStats[sortedByCommon[0]].commonWords.length > 0) {
      allAwards.push({
        id: 'basic',
        name: t('awards.basic'),
        emoji: '',
        winner: sortedByCommon[0],
        detail: t('awards.details.obvious', { count: playerStats[sortedByCommon[0]].commonWords.length })
      });
    }

    // 6. Vowel Movement - Word with highest vowel percentage
    let bestVowelWord = null;
    let bestVowelPct = 0;
    let bestVowelPlayer = null;
    allWordsInGame.forEach(item => {
      const pct = getVowelPercentage(item.word);
      if (pct > bestVowelPct || (pct === bestVowelPct && item.word.length > (bestVowelWord?.length || 0))) {
        bestVowelPct = pct;
        bestVowelWord = item.word;
        bestVowelPlayer = item.player;
      }
    });
    if (bestVowelWord && bestVowelPct > 0.4) { // At least 40% vowels to be interesting
      allAwards.push({
        id: 'vowelMovement',
        name: t('awards.vowelMovement'),
        emoji: '',
        winner: bestVowelPlayer,
        detail: bestVowelWord
      });
    }

    // 7. Consonant Queen - Word with most consecutive consonants
    let bestConsonantWord = null;
    let bestConsonantStreak = 0;
    let bestConsonantPlayer = null;
    allWordsInGame.forEach(item => {
      const streak = getConsecutiveConsonants(item.word);
      if (streak > bestConsonantStreak) {
        bestConsonantStreak = streak;
        bestConsonantWord = item.word;
        bestConsonantPlayer = item.player;
      }
    });
    if (bestConsonantWord && bestConsonantStreak >= 3) { // At least 3 consonants in a row
      allAwards.push({
        id: 'consonantQueen',
        name: t('awards.consonantQueen'),
        emoji: '',
        winner: bestConsonantPlayer,
        detail: bestConsonantWord
      });
    }

    // 8. Alphabet Soup - Most unique letters used
    const letterCounts = {};
    playerNames.forEach(name => {
      letterCounts[name] = getUniqueLetters(playerStats[name].allWords);
    });
    const sortedByLetters = [...playerNames].sort((a, b) => letterCounts[b] - letterCounts[a]);
    if (letterCounts[sortedByLetters[0]] > 0) {
      allAwards.push({
        id: 'alphabetSoup',
        name: t('awards.alphabetSoup'),
        emoji: '',
        winner: sortedByLetters[0],
        detail: t('awards.details.letters', { count: letterCounts[sortedByLetters[0]] })
      });
    }

    // 9. Photo Finish - Closest final scores
    let closestPair = null;
    let closestDiff = Infinity;
    for (let i = 0; i < playerNames.length; i++) {
      for (let j = i + 1; j < playerNames.length; j++) {
        const diff = Math.abs(playerStats[playerNames[i]].totalScore - playerStats[playerNames[j]].totalScore);
        if (diff < closestDiff && diff > 0) {
          closestDiff = diff;
          closestPair = [playerNames[i], playerNames[j]];
        }
      }
    }
    if (closestPair && closestDiff <= 20) { // Only if difference is 20 or less
      // Award goes to the lower scorer (they almost caught up!)
      const lowerScorer = playerStats[closestPair[0]].totalScore < playerStats[closestPair[1]].totalScore
        ? closestPair[0] : closestPair[1];
      allAwards.push({
        id: 'photoFinish',
        name: t('awards.photoFinish'),
        emoji: '',
        winner: lowerScorer,
        detail: t('awards.details.ptsBehind', { count: closestDiff })
      });
    }

    // 10. Hive Mind - Most overlap with one specific other player
    let bestOverlap = 0;
    let hiveMindPlayer = null;
    let hiveMindPartner = null;
    for (let i = 0; i < playerNames.length; i++) {
      for (let j = i + 1; j < playerNames.length; j++) {
        const overlap = getPlayerOverlap(
          playerStats[playerNames[i]].allWords,
          playerStats[playerNames[j]].allWords
        );
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          hiveMindPlayer = playerNames[i];
          hiveMindPartner = playerNames[j];
        }
      }
    }
    if (hiveMindPlayer && bestOverlap >= 3) { // At least 3 words in common
      allAwards.push({
        id: 'hiveMind',
        name: t('awards.hiveMind'),
        emoji: '',
        winner: hiveMindPlayer,
        detail: t('awards.details.withPlayer', { count: bestOverlap, name: hiveMindPartner })
      });
    }

    // 11. Lone Wolf - Least average overlap with others
    const avgOverlaps = {};
    playerNames.forEach(name => {
      let totalOverlap = 0;
      let count = 0;
      playerNames.forEach(other => {
        if (other !== name) {
          totalOverlap += getPlayerOverlap(playerStats[name].allWords, playerStats[other].allWords);
          count++;
        }
      });
      avgOverlaps[name] = count > 0 ? totalOverlap / count : 0;
    });
    const sortedByLoneWolf = [...playerNames].sort((a, b) => avgOverlaps[a] - avgOverlaps[b]);
    // Only award if they have words and there's meaningful difference
    if (playerStats[sortedByLoneWolf[0]].totalWords > 0 && playerNames.length > 2) {
      allAwards.push({
        id: 'loneWolf',
        name: t('awards.loneWolf'),
        emoji: '',
        winner: sortedByLoneWolf[0],
        detail: t('awards.details.avgOverlap', { value: avgOverlaps[sortedByLoneWolf[0]].toFixed(1) })
      });
    }

    // 12. Steady Eddie - Most consistent scores across rounds (lowest variance)
    if (allRounds.length >= 2) {
      const variances = {};
      playerNames.forEach(name => {
        variances[name] = getScoreVariance(playerStats[name].roundScores);
      });
      const sortedByConsistency = [...playerNames]
        .filter(name => playerStats[name].roundScores.length >= 2)
        .sort((a, b) => variances[a] - variances[b]);
      if (sortedByConsistency.length > 0) {
        const avgScore = playerStats[sortedByConsistency[0]].roundScores.reduce((a,b) => a+b, 0) /
                        playerStats[sortedByConsistency[0]].roundScores.length;
        allAwards.push({
          id: 'steadyEddie',
          name: t('awards.steadyEddie'),
          emoji: '',
          winner: sortedByConsistency[0],
          detail: t('awards.details.ptsPerRound', { value: Math.round(avgScore) })
        });
      }
    }

    // 13. Comeback Kid - Biggest improvement from worst to best round
    if (allRounds.length >= 2) {
      const improvements = {};
      playerNames.forEach(name => {
        const scores = playerStats[name].roundScores;
        if (scores.length >= 2) {
          improvements[name] = Math.max(...scores) - Math.min(...scores);
        } else {
          improvements[name] = 0;
        }
      });
      const sortedByComeback = [...playerNames].sort((a, b) => improvements[b] - improvements[a]);
      if (improvements[sortedByComeback[0]] > 0) {
        allAwards.push({
          id: 'comebackKid',
          name: t('awards.comebackKid'),
          emoji: '',
          winner: sortedByComeback[0],
          detail: t('awards.details.swing', { value: improvements[sortedByComeback[0]] })
        });
      }
    }

    // 14. Sleeper Hit - Started lowest, improved most by end
    if (allRounds.length >= 2) {
      // Find who had the lowest score in round 1
      const round1Scores = {};
      playerNames.forEach(name => {
        round1Scores[name] = playerStats[name].roundScores[0] || 0;
      });
      const lowestRound1 = [...playerNames].sort((a, b) => round1Scores[a] - round1Scores[b])[0];

      // Check if they improved significantly
      const totalImprovement = playerStats[lowestRound1].totalScore - round1Scores[lowestRound1];
      if (totalImprovement > 0 && round1Scores[lowestRound1] < Math.max(...Object.values(round1Scores))) {
        allAwards.push({
          id: 'sleeperHit',
          name: t('awards.sleeperHit'),
          emoji: '',
          winner: lowestRound1,
          detail: `${round1Scores[lowestRound1]}→${playerStats[lowestRound1].totalScore}`
        });
      }
    }

    // === SELECT AWARDS TO DISPLAY ===
    // Goal: Pick 4-6 awards ensuring each player gets at least one (if possible)
    const selectAwards = (allAwards, playerNames, targetCount = 6) => {
      const selected = [];
      const playersWithAwards = new Set();
      const usedAwardIds = new Set();

      // Use deterministic order based on award id (no random shuffle - causes different results per client)
      const shuffled = [...allAwards].sort((a, b) => a.id.localeCompare(b.id));

      // First pass: ensure each player gets at least one award
      playerNames.forEach(playerName => {
        if (playersWithAwards.has(playerName)) return;

        const awardForPlayer = shuffled.find(a =>
          a.winner === playerName && !usedAwardIds.has(a.id)
        );
        if (awardForPlayer) {
          selected.push(awardForPlayer);
          playersWithAwards.add(playerName);
          usedAwardIds.add(awardForPlayer.id);
        }
      });

      // Second pass: fill remaining slots with random awards
      shuffled.forEach(award => {
        if (selected.length >= targetCount) return;
        if (usedAwardIds.has(award.id)) return;

        selected.push(award);
        usedAwardIds.add(award.id);
        playersWithAwards.add(award.winner);
      });

      // Sort by a consistent order for display
      const awardOrder = ['wordWizard', 'bigWordEnergy', 'hotStreak', 'uniqueMind', 'basic',
                         'vowelMovement', 'consonantQueen', 'alphabetSoup', 'photoFinish',
                         'hiveMind', 'loneWolf', 'steadyEddie', 'comebackKid', 'sleeperHit'];
      selected.sort((a, b) => awardOrder.indexOf(a.id) - awardOrder.indexOf(b.id));

      return selected;
    };

    const selectedAwards = selectAwards(allAwards, playerNames, Math.min(6, Math.max(4, playerNames.length)));

    // Find longest words overall
    const longestWords = [...allWordsInGame]
      .sort((a, b) => b.length - a.length)
      .slice(0, 5);

    // Sort leaderboard by score (with name tiebreaker for consistent ordering across clients)
    const sortedByScore = Object.values(playerStats).sort((a, b) =>
      b.totalScore - a.totalScore || a.name.localeCompare(b.name)
    );

    setStats({
      playerStats,
      leaderboard: sortedByScore,
      selectedAwards,
      allAwards, // Keep all for debugging if needed
      longestWords,
      totalWordsFound: allWordsInGame.length,
      totalRounds: allRounds.length
    });
  }, [allRounds, players, t]);

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
    if (index === 0) return '';
    if (index === 1) return '';
    if (index === 2) return '';
    return '';
  };

  const getOrdinal = (n) => {
    if (n === 1) return t('ordinal.1');
    if (n === 2) return t('ordinal.2');
    if (n === 3) return t('ordinal.3');
    return t('ordinal.other');
  };

  const currentPlayerStats = stats.playerStats[currentPlayerName];
  const currentPlayerRank = stats.leaderboard.findIndex(p => p.name === currentPlayerName) + 1;

  return (
    <div className="max-w-screen-sm mx-auto p-2">
      {/* Winner Celebration / Solo Results */}
      {isSinglePlayer ? (
        <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg p-4 mb-2 text-center">
          <div className="text-4xl mb-2"></div>
          <h2 className="text-2xl font-bold text-white">
            {t('singlePlayer.title')}
          </h2>
          <p className="text-blue-200 text-lg">
            {t('singlePlayer.finalScore', { score: stats.leaderboard[0].totalScore })}
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-lg p-4 mb-2 text-center">
          <div className="text-4xl mb-2"></div>
          <h2 className="text-2xl font-bold text-white">
            {t('winner.title', { name: stats.leaderboard[0].name })}
          </h2>
          <p className="text-yellow-200 text-lg">
            {t('winner.points', { count: stats.leaderboard[0].totalScore })}
          </p>
        </div>
      )}

      {/* Final Standings - skip for single player */}
      {!isSinglePlayer && (
        <div className="bg-gray-800 rounded-lg p-4 mb-2">
          <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
            {t('standings.title')}
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
                    <span className="text-gray-400 text-sm">{player.totalWords} {t('standings.words')}</span>
                    <span className="text-xl font-bold text-green-400">{player.totalScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Awards - skip for single player or if no awards */}
      {!isSinglePlayer && stats.selectedAwards.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-2">
          <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
            {t('awards.title')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {stats.selectedAwards.map(award => (
              <div key={award.id} className="bg-gray-900 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{award.emoji}</div>
                <div className="text-sm text-gray-400">{award.name}</div>
                <div className="text-lg font-bold text-white">{award.winner}</div>
                <div className="text-sm text-green-400">{award.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Stats */}
      {currentPlayerStats && (
        <div className="bg-gray-800 rounded-lg p-4 mb-2">
          <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
            {isSinglePlayer ? t('stats.summary') : t('stats.yourStats')}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            {!isSinglePlayer && (
              <div>
                <div className="text-3xl font-bold text-green-400">{currentPlayerRank}{getOrdinal(currentPlayerRank)}</div>
                <div className="text-sm text-gray-400">{t('stats.place')}</div>
              </div>
            )}
            <div>
              <div className="text-3xl font-bold text-green-400">{currentPlayerStats.totalScore}</div>
              <div className="text-sm text-gray-400">{t('stats.points')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{currentPlayerStats.totalWords}</div>
              <div className="text-sm text-gray-400">{t('stats.wordsFound')}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400 uppercase">{currentPlayerStats.longestWord || '-'}</div>
              <div className="text-sm text-gray-400">{t('stats.longestWord')}</div>
            </div>
          </div>
          {!isSinglePlayer && currentPlayerStats.uniqueWords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-2">{t('stats.yourUniqueFinds', { count: currentPlayerStats.uniqueWords.length })}</div>
              <div className="flex flex-wrap gap-1">
                {currentPlayerStats.uniqueWords.slice(0, 10).map(word => (
                  <span key={word} className="bg-purple-900 text-purple-200 px-2 py-1 rounded text-sm">
                    {word}
                  </span>
                ))}
                {currentPlayerStats.uniqueWords.length > 10 && (
                  <span className="text-gray-500 text-sm">{t('stats.more', { count: currentPlayerStats.uniqueWords.length - 10 })}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Stats */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <h3 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-600 pb-2">
          {t('gameStats.title')}
        </h3>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-gray-200">{stats.totalRounds}</div>
            <div className="text-sm text-gray-400">{t('gameStats.rounds')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-200">{stats.totalWordsFound}</div>
            <div className="text-sm text-gray-400">{t('gameStats.totalWords')}</div>
          </div>
          {!isSinglePlayer && (
            <div>
              <div className="text-2xl font-bold text-gray-200">{players.length}</div>
              <div className="text-sm text-gray-400">{t('gameStats.players')}</div>
            </div>
          )}
        </div>

        {/* Longest Words */}
        {stats.longestWords.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-2">{t('gameStats.longestWordsOfGame')}</div>
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
          {t('common:buttons.playAgain')}
        </button>
      ) : (
        <p className="text-center text-gray-400 py-4 mb-4">
          {t('waitingForNewGame', { name: players[0]?.name })}
        </p>
      )}
    </div>
  );
}

export default PlayerWordsEndPage;
