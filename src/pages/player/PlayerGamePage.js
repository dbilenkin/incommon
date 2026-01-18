import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/Firebase';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import PlayerRoundPage from './PlayerRoundPage';
import PlayerWordsRoundPage from './PlayerWordsRoundPage';
import PlayerSetupPage from './PlayerSetupPage';
import PlayerBuildDeckPage from './PlayerBuildDeckPage';
import PlayerEndPage from './PlayerEndPage';
import PlayerWordsEndPage from './PlayerWordsEndPage';
import PlayerRejoinPage from './PlayerRejoinPage';
import Nav from '../../components/Nav';
import { getDeck } from '../../utils';
import Spinner from '../../components/Spinner';

const PlayerGamePage = () => {

  const { shortId } = useParams();
  const [gameData, setGameData] = useState(null);
  const [players, setPlayers] = useState([]);

  const { gameRef, setGameRef, setCurrentPlayerId } = useContext(CurrentGameContext);
  const { currentPlayerName } = useContext(CurrentGameContext);

  const getCurrentPlayerId = gameRef => {
    const playersRef = collection(gameRef, 'players');
    const q = query(playersRef, where('name', '==', currentPlayerName, orderBy('joinedAt', 'asc')));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size >= 1) {
        const playerId = querySnapshot.docs[0].id;
        setCurrentPlayerId(playerId);
      } else {
        console.error('Invalid Player Name.');
      }
    })
  }

  useEffect(() => {
    if (gameRef) {
      onSnapshot(gameRef, (doc) => {
        console.log(doc.data());
        setGameData(doc.data());
        if (currentPlayerName) {
          getCurrentPlayerId(gameRef);
        }
      });
    } else {
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, where('shortId', '==', shortId));

      getDocs(q).then((querySnapshot) => {
        if (querySnapshot.size === 1) {
          const gameId = querySnapshot.docs[0].id;
          const _gameRef = doc(db, 'games', gameId);
          setGameRef(_gameRef)
          onSnapshot(_gameRef, (doc) => {
            // console.log(doc.data());
            setGameData(doc.data());

          });
          if (currentPlayerName) {
            getCurrentPlayerId(_gameRef);
          }
        } else {
          console.error('Invalid short ID.');
        }
      });
    }


  }, [shortId, gameRef, setGameRef]);

  useEffect(() => {
    if (gameRef) {
      const playersRef = collection(gameRef, 'players');
      const q = query(playersRef, orderBy('joinedAt', 'asc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const playersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(playersData);
      });

      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    }
  }, [gameRef]);

  if (!gameData) {
    return <Spinner />;
  }

  const displayPlayerPage = () => {
    if (!currentPlayerName) {
      return <PlayerRejoinPage />
    }
    const { deckType, indexDeck, gameState, gameType } = gameData;
    if (gameState === "setup") {
      return <PlayerSetupPage gameData={gameData} gameRef={gameRef} players={players} />
    }
    if (gameState === "buildDeck") {
      return <PlayerBuildDeckPage gameData={gameData} gameRef={gameRef} players={players} />
    }
    if (gameState === 'started') {
      if (gameType === 'Incommon') {
        return <PlayerRoundPage deck={getDeck(indexDeck, deckType)} gameData={gameData} gameRef={gameRef} players={players} />
      } else if (gameType === 'Out of Words, Words') {
        return <PlayerWordsRoundPage gameData={gameData} gameRef={gameRef} players={players} />
      }
    }
    if (gameState === "ended") {
      if (gameType === 'Out of Words, Words') {
        return <PlayerWordsEndPage gameData={gameData} gameRef={gameRef} players={players} />
      }
      return <PlayerEndPage deck={getDeck(indexDeck, deckType)} gameData={gameData} gameRef={gameRef} players={players} />
    }
    return <div>Something went wrong</div>
  }

  return (
    <div>
      <Nav className="max-w-screen-sm" name={currentPlayerName} />
      {displayPlayerPage()}
    </div>
  );
};

export default PlayerGamePage;
