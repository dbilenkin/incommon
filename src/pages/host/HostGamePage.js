import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../utils/Firebase';
import HostSetupPage from './HostSetupPage';
import HostBuildDeckPage from './HostBuildDeckPage';
import HostRoundPage from './HostRoundPage';
import HostWordsRoundPage from './HostWordsRoundPage';
import HostScattergoriesRoundPage from './HostScattergoriesRoundPage';
import HostEndPage from './HostEndPage';
import Spinner from '../../components/Spinner';
import { getDeck } from '../../utils';

const HostGamePage = () => {
  const [gameData, setGameData] = useState(null);
  const [gameRef, setGameRef] = useState(null);
  const [players, setPlayers] = useState([]);
  const { shortId } = useParams();

  useEffect(() => {
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('shortId', '==', shortId));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const gameId = querySnapshot.docs[0].id;
        const _gameRef = doc(db, 'games', gameId);
        setGameRef(_gameRef);
        onSnapshot(_gameRef, (doc) => {
          setGameData(doc.data());
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [shortId]);

  useEffect(() => {
    if (gameRef) {
      const playersRef = collection(gameRef, 'players');
      const q = query(playersRef, orderBy('joinedAt', 'asc'));
  
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setPlayers(prevPlayers => {
          // Convert existing players to a Map for easy access
          const playersMap = new Map(prevPlayers.map(player => [player.id, player]));
  
          // Update or add players
          querySnapshot.docs.forEach(doc => {
            const newPlayerData = { id: doc.id, ...doc.data() };
            const currentPlayer = playersMap.get(doc.id);
  
            // Update the player in the map only if the data has changed
            if (!currentPlayer || JSON.stringify(currentPlayer) !== JSON.stringify(newPlayerData)) {
              playersMap.set(doc.id, newPlayerData);
            }
          });
  
          // Remove players that are no longer in the snapshot
          const snapshotPlayerIds = new Set(querySnapshot.docs.map(doc => doc.id));
          playersMap.forEach((value, key) => {
            if (!snapshotPlayerIds.has(key)) {
              playersMap.delete(key);
            }
          });
  
          // Convert the Map back to an array
          return Array.from(playersMap.values());
        });
      });
  
      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    }
  }, [gameRef]);
  
  


  if (!gameData) {
    return (
      <Spinner />
    );
  }

  const displayHostPage = () => {
    const { deckType, indexDeck, gameState, gameType } = gameData;

    if (gameState === "setup") {
      return <HostSetupPage gameData={gameData} gameRef={gameRef} players={players} />
    }
    if (gameState === "buildDeck") {
      return <HostBuildDeckPage gameData={gameData} gameRef={gameRef} players={players} />
    }
    if (gameState === 'started') {
      if (gameType === 'Incommon') {
        return <HostRoundPage deck={getDeck(indexDeck, deckType)} gameData={gameData} gameRef={gameRef} players={players} />
      } else if (gameType === 'Out of Words, Words') {
        return <HostWordsRoundPage gameData={gameData} gameRef={gameRef} players={players} />
      } else if (gameType === 'Scattergories') {
        return <HostScattergoriesRoundPage gameData={gameData} gameRef={gameRef} players={players} />
      }
    }
    if (gameState === "ended") {
      return <HostEndPage deck={getDeck(indexDeck, deckType)} gameData={gameData} gameRef={gameRef} players={players} />
    }

    return <div>Something went wrong</div>
  }

  return (
    <div>
      {displayHostPage()}
    </div>

  );
};

export default HostGamePage;
