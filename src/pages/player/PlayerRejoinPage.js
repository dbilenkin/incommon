import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../utils/Firebase';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Button from '../../components/Button';
import Nav from '../../components/Nav';

function PlayerRejoinPage() {
  const { setCurrentPlayerName, setCurrentPlayerId, setGameRef } = useContext(CurrentGameContext);

  const [playerName, setPlayerName] = useState('');
  const [shortId, setShortId] = useState('');
  const navigate = useNavigate();

  const handleSetShortId = value => {
    setShortId(value.toUpperCase());
  }

  const getCurrentPlayerId = (gameRef, currentPlayerName) => {
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

  const handleJoinGame = async () => {
    if (!playerName || !shortId) {
      alert('Please enter your name and game code.');
      return;
    }

    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('shortId', '==', shortId));

    await getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const gameId = querySnapshot.docs[0].id;
        const gameRef = doc(db, 'games', gameId);
        setGameRef(gameRef);
        setCurrentPlayerName(playerName);
        getCurrentPlayerId(gameRef, playerName)
        navigate(`/player/${shortId}`);
      } else {
        alert('Invalid game code.');
      }
    });
  };

  return (
    <div className="">
      <div className='max-w-screen-md mx-auto text-gray-100'>
        <div className='bg-gray-800 mx-4 p-4 mt-4 rounded-lg'>
          <div className='flex '>
            <div className="mb-4 w-2/3">
              <label htmlFor="playerName" className="block text-gray-300 text-sm font-bold mb-2">Your Name</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-800 text-gray-300"
              />
            </div>

            <div className="ml-4 mb-4 w-1/3">
              <label htmlFor="shortId" className="block text-gray-300 text-sm font-bold mb-2">Game Code</label>
              <input
                type="text"
                id="shortId"
                value={shortId}
                onChange={e => handleSetShortId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-800 text-gray-300"
              />
            </div>

          </div>
          <Button onClick={handleJoinGame} className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded">
            Rejoin Game
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PlayerRejoinPage;
