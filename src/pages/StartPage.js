import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/Firebase';
import { generateShortId } from '../utils';
import { CurrentGameContext } from '../contexts/CurrentGameContext';
import Button from '../components/Button';
import Nav from '../components/Nav';

function StartPage() {
  const { setCurrentPlayerName, setCurrentPlayerId, setGameRef } = useContext(CurrentGameContext);

  useEffect(() => {
    const storedPlayerName = localStorage.getItem('currentPlayerName');
    if (storedPlayerName) {
      setCurrentPlayerName(storedPlayerName);
    }
  }, [setCurrentPlayerName]);

  const [playerName, setPlayerName] = useState('');
  const [shortId, setShortId] = useState('');
  const [gameType, setGameType] = useState('Incommon');
  const navigate = useNavigate();

  const newGameJson = {
    gameState: 'setup',
    gameType: gameType
  };

  const handleSetShortId = value => {
    setShortId(value.toUpperCase().slice(0, 4).trim());
  };

  const handleSetPlayerName = value => {
    setPlayerName(value.slice(0, 11).trim());
  };

  const handleCreateGame = async () => {
    const gameRef = await addDoc(collection(db, 'games'), newGameJson);
    setGameRef(gameRef);
    const gameId = gameRef.id;
    const shortId = generateShortId(gameId);

    await updateDoc(gameRef, {
      shortId: shortId
    });

    navigate(`/host/${shortId}`);
  };

  const handleJoinGame = async () => {
    if (!playerName || !shortId) {
      alert('Please enter your name and game ID.');
      return;
    }

    setCurrentPlayerName(playerName);

    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('shortId', '==', shortId));

    await getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const gameId = querySnapshot.docs[0].id;
        const gameRef = doc(db, 'games', gameId);
        setGameRef(gameRef);

        const playersRef = collection(gameRef, "players");
        addDoc(playersRef, {
          name: playerName,
          gameScore: 0,
          roundScore: 0,
          chosenCards: [],
          connections: {},
          joinedAt: serverTimestamp()
        }).then(player => {
          setCurrentPlayerId(player.id);
          navigate(`/player/${shortId}`);
        }).catch((error) => {
          console.error(error);
        });
      } else {
        alert('Invalid game ID.');
      }
    });
  };

  return (
    <div className="">
      <Nav className="max-w-screen-md" />
      <div className='max-w-screen-md mx-auto text-gray-100'>
        <div className="bg-gray-800 mx-4 p-4 mt-4 rounded-lg">
          <div className="mb-4">
            <div className="text-gray-300 text-2xl font-bold mb-2">Select Game Type</div>
            <div className="flex items-center justify-evenly">
              <div className="flex items-center mr-4">
                <input
                  type="radio"
                  id="incommon"
                  name="gameType"
                  value="Incommon"
                  checked={gameType === 'Incommon'}
                  onChange={(e) => setGameType(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="incommon" className="text-gray-300 text-2xl">Incommon</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="outofwords"
                  name="gameType"
                  value="Out of Words, Words"
                  checked={gameType === 'Out of Words, Words'}
                  onChange={(e) => setGameType(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="outofwords" className="text-gray-300 text-2xl">Out of Words, Words</label>
              </div>
            </div>
          </div>


          <Button onClick={handleCreateGame} buttonType="large" className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded">
            Create Game
          </Button>
        </div>
        <div className='text-2xl bg-gray-800 mx-4 p-4 mt-4 rounded-lg'>
          <div className='flex'>
            <div className="mb-4 w-2/3">
              <label htmlFor="playerName" className="block text-gray-300 text-2xl font-bold mb-2">Your Name</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={e => handleSetPlayerName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-800 text-gray-300"
              />
            </div>

            <div className="ml-4 mb-4 w-1/3">
              <label htmlFor="shortId" className="block text-gray-300 text-2xl font-bold mb-2">Game ID</label>
              <input
                type="text"
                id="shortId"
                value={shortId}
                onChange={e => handleSetShortId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-800 text-gray-300"
              />
            </div>
          </div>
          <Button onClick={handleJoinGame} buttonType="large" className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded">
            Join Game
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StartPage;
