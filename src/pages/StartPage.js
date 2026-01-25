import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../utils/Firebase';
import { generateShortId } from '../utils';
import { CurrentGameContext } from '../contexts/CurrentGameContext';
import Button from '../components/Button';
import Nav from '../components/Nav';

function StartPage() {
  const { t } = useTranslation(['startPage', 'common']);
  const { setCurrentPlayerName, setCurrentPlayerId, setGameRef } = useContext(CurrentGameContext);

  useEffect(() => {
    const storedPlayerName = localStorage.getItem('currentPlayerName');
    if (storedPlayerName) {
      setCurrentPlayerName(storedPlayerName);
      setPlayerName(storedPlayerName);
    }
  }, [setCurrentPlayerName]);

  const [playerName, setPlayerName] = useState('');
  const [shortId, setShortId] = useState('');
  const [gameType, setGameType] = useState('Out of Words, Words');
  const [recentGames, setRecentGames] = useState([]);
  const [recentGamesFilter, setRecentGamesFilter] = useState('Out of Words, Words');
  const [showModal, setShowModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [modalName, setModalName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdGame, setCreatedGame] = useState(null);
  const [createModalName, setCreateModalName] = useState('');
  const navigate = useNavigate();

  // Fetch recent games
  const fetchRecentGames = async () => {
    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef,
      where('gameState', '==', 'setup')
    );

    const snapshot = await getDocs(q);
    const games = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(game => game.gameType === recentGamesFilter)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 3);
    setRecentGames(games);
  };

  useEffect(() => {
    fetchRecentGames();
  }, [recentGamesFilter]);

  const newGameJson = {
    gameState: 'setup',
    gameType: gameType,
    createdAt: serverTimestamp()
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
    const newShortId = generateShortId(gameId);

    await updateDoc(gameRef, {
      shortId: newShortId
    });

    // For Words or Scattergories game, show modal with join/host options
    if (gameType === 'Out of Words, Words' || gameType === 'Scattergories') {
      setCreatedGame({ shortId: newShortId, ref: gameRef });
      setCreateModalName(playerName || '');
      setShowCreateModal(true);
    } else {
      navigate(`/host/${newShortId}`);
    }
  };

  const handleCreateModalJoin = async () => {
    if (!createModalName.trim()) return;
    setShowCreateModal(false);
    await joinGameWithCode(createdGame.shortId, createModalName.trim());
  };

  const handleCreateModalHost = () => {
    setShowCreateModal(false);
    navigate(`/host/${createdGame.shortId}`);
  };

  const handleJoinGame = async () => {
    if (!playerName || !shortId) {
      alert(t('alerts.enterNameAndId'));
      return;
    }

    await joinGameWithCode(shortId, playerName);
  };

  const joinGameWithCode = async (gameCode, name) => {
    setCurrentPlayerName(name);
    localStorage.setItem('currentPlayerName', name);

    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('shortId', '==', gameCode));

    await getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const gameId = querySnapshot.docs[0].id;
        const gameRef = doc(db, 'games', gameId);
        setGameRef(gameRef);

        const playersRef = collection(gameRef, "players");
        addDoc(playersRef, {
          name: name,
          gameScore: 0,
          roundScore: 0,
          chosenCards: [],
          connections: {},
          joinedAt: serverTimestamp()
        }).then(player => {
          setCurrentPlayerId(player.id);
          navigate(`/player/${gameCode}`);
        }).catch((error) => {
          console.error(error);
        });
      } else {
        alert(t('alerts.invalidGameId'));
      }
    });
  };

  const handleQuickJoin = (game) => {
    setSelectedGame(game);
    setModalName(playerName || '');
    setShowModal(true);
  };

  const handleModalJoin = async () => {
    if (!modalName.trim()) {
      return;
    }
    setShowModal(false);
    await joinGameWithCode(selectedGame.shortId, modalName.trim());
  };

  return (
    <div className="">
      <Nav className="max-w-screen-md" />
      <div className='max-w-screen-md mx-auto text-gray-100'>
        <div className="bg-gray-800 mx-4 p-4 mt-4 rounded-lg">
          <div className="mb-4">
            <label htmlFor="gameType" className="block text-gray-300 text-2xl font-bold mb-2">{t('selectGame')}</label>
            <select
              id="gameType"
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              className="block w-full bg-gray-700 border border-gray-600 text-gray-200 text-xl py-3 px-4 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.5rem'
              }}
            >
              <option value="Out of Words, Words">{t('gameTypes.words')}</option>
              <option value="Scattergories">{t('gameTypes.scattergories')}</option>
              <option value="Incommon">{t('gameTypes.incommon')}</option>
            </select>
          </div>

          <Button onClick={handleCreateGame} buttonType="large" className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded">
            {t('common:buttons.createGame')}
          </Button>
        </div>
        <div className='text-2xl bg-gray-800 mx-4 p-4 mt-4 rounded-lg'>
          <div className='flex'>
            <div className="mb-4 w-2/3">
              <label htmlFor="playerName" className="block text-gray-300 text-2xl font-bold mb-2">{t('yourName')}</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={e => handleSetPlayerName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-800 text-gray-300"
              />
            </div>

            <div className="ml-4 mb-4 w-1/3">
              <label htmlFor="shortId" className="block text-gray-300 text-2xl font-bold mb-2">{t('gameId')}</label>
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
            {t('common:buttons.joinGame')}
          </Button>
        </div>

        {/* Recent Games */}
        <div className='bg-gray-800 mx-4 p-4 mt-4 rounded-lg'>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xl text-gray-400">{t('recentGames')}</p>
            <div className="flex items-center gap-2">
              <select
                value={recentGamesFilter}
                onChange={(e) => setRecentGamesFilter(e.target.value)}
                className="bg-gray-700 text-gray-200 text-base px-2 py-1 rounded border border-gray-600 focus:outline-none"
              >
                <option value="Out of Words, Words">{t('gameTypes.wordsShort')}</option>
                <option value="Scattergories">{t('gameTypes.scattergories')}</option>
                <option value="Incommon">{t('gameTypes.incommon')}</option>
              </select>
              <button
                onClick={fetchRecentGames}
                className="p-1 text-gray-400 hover:text-white"
                title={t('refresh')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          {recentGames.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentGames.map((game) => {
                const createdAt = game.createdAt?.toDate?.();
                const timeStr = createdAt
                  ? createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-yellow-400 tracking-wider">
                        {game.shortId}
                      </span>
                      {timeStr && (
                        <span className="text-base text-gray-500">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleQuickJoin(game)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-lg"
                    >
                      {t('common:buttons.join')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-2">{t('noGamesWaiting')}</p>
          )}
        </div>
      </div>

      {/* Name Modal for Recent Games */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 mx-4 w-full max-w-sm">
            <p className="text-xl text-gray-300 mb-4">
              {t('joinModal.title', { shortId: selectedGame?.shortId })}
            </p>
            <input
              type="text"
              placeholder={t('joinModal.enterName')}
              value={modalName}
              onChange={(e) => setModalName(e.target.value.slice(0, 11))}
              onKeyDown={(e) => e.key === 'Enter' && handleModalJoin()}
              autoFocus
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-xl text-white mb-4 focus:outline-none focus:border-green-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg text-lg"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleModalJoin}
                disabled={!modalName.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold rounded-lg text-lg"
              >
                {t('common:buttons.join')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Game Modal for Words */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 mx-4 w-full max-w-sm">
            <p className="text-xl text-gray-300 mb-2">{t('createModal.title')}</p>
            <p className="text-3xl font-bold text-yellow-400 mb-4">{createdGame?.shortId}</p>

            <input
              type="text"
              placeholder={t('createModal.enterName')}
              value={createModalName}
              onChange={(e) => setCreateModalName(e.target.value.slice(0, 11))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateModalJoin()}
              autoFocus
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-xl text-white mb-4 focus:outline-none focus:border-green-500"
            />

            <button
              onClick={handleCreateModalJoin}
              disabled={!createModalName.trim()}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold rounded-lg text-lg mb-3"
            >
              {t('common:buttons.joinGame')}
            </button>

            <button
              onClick={handleCreateModalHost}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg text-base"
            >
              {t('common:buttons.openHostPage')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StartPage;
