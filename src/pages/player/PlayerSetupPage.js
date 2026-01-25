import React, { useState, useContext, useEffect } from 'react';
import { collection, deleteDoc, doc, updateDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Button from '../../components/Button';
import { db } from '../../utils/Firebase';
import Spinner from '../../components/Spinner';
import { getIndexDeck, displayFormattedDeckType, displayGameLength, displayWordSelection, getContrastYIQ, getRandomScattergoriesLetter, getRandomScattergoriesCategories, resetScattergoriesState } from '../../utils';
import { playerColors } from '../../constants';
import MessageModal from '../../components/MessageModal';

const PlayerSetupPage = ({ gameData, gameRef, players }) => {
  const { t, i18n } = useTranslation(['setup', 'common']);
  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const [selectedDeck, setSelectedDeck] = useState(gameData.deckType || 'life');
  const [selectedGameLength, setSelectedGameLength] = useState(gameData.gameLength || 3);
  const [selectedWordSelection, setSelectedWordSelection] = useState(gameData.wordSelection || 'wordList');
  const [minWordLength, setMinWordLength] = useState(gameData.minWordLength || 4);
  const [gameTime, setGameTime] = useState(gameData.gameTime || 2);
  const [numRounds, setNumRounds] = useState(gameData.numRounds || players.length);
  const [untimed, setUntimed] = useState(gameData.untimed || false);
  const [roundTime, setRoundTime] = useState(gameData.roundTime || 90);
  const [scattergoriesNumRounds, setScattergoriesNumRounds] = useState(gameData.scattergoriesNumRounds || 3);
  const [language, setLanguage] = useState(gameData.language || i18n.language?.substring(0, 2) || 'en');
  const [columnLayout, setColumnLayout] = useState(gameData.columnLayout || false);
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [removePlayerName, setRemovePlayerName] = useState('');

  // Auto-update numRounds as players join, unless user set it higher
  useEffect(() => {
    if (numRounds < players.length) {
      setNumRounds(players.length);
    }
  }, [players.length]);

  useEffect(() => {
    const updateGame = async () => {
      if (gameData.gameType === 'Incommon') {
        await updateDoc(gameRef, {
          gameLength: parseInt(selectedGameLength),
          deckType: selectedDeck,
          wordSelection: selectedWordSelection,
        });
      } else if (gameData.gameType === 'Out of Words, Words') {
        await updateDoc(gameRef, {
          minWordLength: parseInt(minWordLength),
          gameTime: parseInt(gameTime),
          numRounds: parseInt(numRounds),
          untimed: untimed,
          language: language,
          columnLayout: columnLayout
        });
      } else if (gameData.gameType === 'Scattergories') {
        await updateDoc(gameRef, {
          roundTime: parseInt(roundTime),
          numRounds: parseInt(scattergoriesNumRounds)
        });
      }
    }

    updateGame();
  }, [selectedGameLength, selectedDeck, selectedWordSelection, minWordLength, gameTime, numRounds, untimed, language, columnLayout, roundTime, scattergoriesNumRounds]);

  const handleWordSelectionChange = (event) => {
    setSelectedWordSelection(event.target.value);
  }

  const handleDeckChange = (event) => {
    setSelectedDeck(event.target.value);
  };

  const handleGameLengthChange = (event) => {
    setSelectedGameLength(event.target.value);
  };

  const handleMinWordLengthChange = (event) => {
    setMinWordLength(event.target.value);
  };

  const handleGameTimeChange = (event) => {
    setGameTime(event.target.value);
  }

  const handleNumRoundsChange = (event) => {
    setNumRounds(event.target.value);
  }

  if (!players.length) {
    return <Spinner />;
  }

  const { shortId } = gameData;
  const firstPlayer = players[0].name === currentPlayerName;

  const handleStartGame = async () => {

    let gameStateObject = {};
    let roundData = {
      roundNumber: 1,
      word: '',
      players
    };

    if (gameData.gameType === 'Incommon') {

      let indexDeck = getIndexDeck(selectedDeck);
      if (indexDeck === undefined) indexDeck = [];

      const gameState = selectedDeck === "custom" ? 'buildDeck' : 'started';

      gameStateObject = {
        gameLength: parseInt(selectedGameLength),
        currentRound: 1,
        deckType: selectedDeck,
        indexDeck,
        gameState,
        numCards: players.length <= 8 ? 5 : 4
      }
    } else if (gameData.gameType === 'Out of Words, Words') {
      gameStateObject = {
        currentRound: 1,
        gameState: 'started'
      }
    } else if (gameData.gameType === 'Scattergories') {
      resetScattergoriesState();
      const letter = getRandomScattergoriesLetter();
      const categories = getRandomScattergoriesCategories(6);

      // Store categories at game level (same for all rounds)
      gameStateObject = {
        currentRound: 1,
        gameState: 'started',
        categories  // Store categories in game doc for reuse across rounds
      };

      roundData = {
        roundNumber: 1,
        letter,
        categories,  // Also store in round for easy access
        players,
        answersRevealed: false,
        revealState: { currentCategoryIndex: 0 },
        revealedCategories: {},
        playerScores: {},
        revealComplete: false
      };
    }

    const roundsRef = collection(gameRef, "rounds");
    await addDoc(roundsRef, roundData);

    await updateDoc(gameRef, gameStateObject);
  };

  const removePlayer = async () => {
    const playersCollectionRef = collection(db, 'games', gameRef.id, 'players');
    const playerQuery = query(playersCollectionRef, where("name", "==", removePlayerName));

    try {
      const querySnapshot = await getDocs(playerQuery);
      if (querySnapshot.empty) {
        console.log("Player not found.");
        return;
      }

      const playerDocRef = doc(db, 'games', gameRef.id, 'players', querySnapshot.docs[0].id);
      await deleteDoc(playerDocRef);
      console.log("Player deleted successfully.");
      setRemovePlayerName("");
    } catch (error) {
      console.error("Error deleting player:", error);
    }
  }

  const closeRemovePlayerModal = () => {
    setRemovePlayerName("");
  }

  const displayRemovePlayerModal = () => {
    const nameMessage = removePlayerName === currentPlayerName ? t('common:modal.removeYourself') : removePlayerName;

    if (players.length === 1) {
      return (
        removePlayerName && <MessageModal
          header={t('common:modal.lastOneStanding')}
          message={t('common:modal.lastOneStandingMessage')}
          dismiss={closeRemovePlayerModal}
          modalAction={closeRemovePlayerModal}
        />
      )
    }
    return (
      removePlayerName && <MessageModal
        header={t('common:modal.removePlayer')}
        message={t('common:modal.removePlayerConfirm', { name: nameMessage })}
        dismiss={closeRemovePlayerModal}
        modalAction={removePlayer}
      />
    )
  }

  const renderGameOptions = () => {
    if (gameData.gameType === 'Incommon') {
      return (
        <>
          {firstPlayer ? (
            <div className="flex items-center pb-4 border-b-2 border-gray-700">
              <label htmlFor="deckType" className="block font-bold w-5/12">
                {t('settings.deck')}
              </label>
              <select
                id="deckType"
                value={selectedDeck}
                onChange={handleDeckChange}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option value="life">{t('deckTypes.life')}</option>
                <option value="celebrities">{t('deckTypes.celebrities')}</option>
                <option value="actors">{t('deckTypes.actors')}</option>
                <option value="famousPeople">{t('deckTypes.famousPeople')}</option>
                <option value="animals">{t('deckTypes.animals')}</option>
                <option value="custom">{t('deckTypes.custom')}</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label htmlFor="deckType" className="block pb-2 font-normal border-b-2 border-gray-700">
                {t('settings.deck')}: <span className='font-bold'>{displayFormattedDeckType(gameData.deckType)}</span>
              </label>
            </div>
          )}
          {firstPlayer ? (
            <div className="flex items-center py-4 border-b-2 border-gray-700">
              <label htmlFor="deckType" className="block font-bold w-5/12">
                {t('settings.gameLength')}
              </label>
              <select
                id="deckType"
                value={selectedGameLength}
                onChange={handleGameLengthChange}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option key="3" value="3">{t('gameLengths.short')}</option>
                <option key="5" value="5">{t('gameLengths.medium')}</option>
                <option key="10" value="10">{t('gameLengths.long')}</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label htmlFor="deckType" className="block py-2 font-normal border-b-2 border-gray-700">
                {t('settings.gameLength')}: <span className='font-bold'>{displayGameLength(gameData.gameLength)}</span>
              </label>
            </div>
          )}
          {firstPlayer ? (
            <div className="flex items-center pt-4">
              <label htmlFor="deckType" className="block font-bold w-5/12">
                {t('settings.wordChoice')}
              </label>
              <select
                id="deckType"
                value={selectedWordSelection}
                onChange={handleWordSelectionChange}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option value="wordList">{t('wordSelections.wordList')}</option>
                <option value="custom">{t('wordSelections.custom')}</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label htmlFor="deckType" className="block pt-2 font-normal">
                {t('settings.wordChoice')}: <span className='font-bold'>{displayWordSelection(gameData.wordSelection)}</span>
              </label>
            </div>
          )}
        </>
      );
    } else if (gameData.gameType === 'Out of Words, Words') {
      return (
        <>
          {/* Language selection */}
          {firstPlayer ? (
            <div className="flex items-center pb-4 border-b-2 border-gray-700">
              <label htmlFor="language" className="block font-bold w-5/12">
                {t('settings.language')}
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label className="block pb-2 font-normal border-b-2 border-gray-700">
                {t('settings.language')}: <span className='font-bold'>{gameData.language === 'ru' ? 'Русский' : 'English'}</span>
              </label>
            </div>
          )}
          {/* Column Layout checkbox */}
          {firstPlayer ? (
            <div className="flex items-center justify-between py-4 border-b-2 border-gray-700">
              <label htmlFor="columnLayout" className="block font-bold">
                {t('settings.columnLayout')}
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="columnLayout"
                  checked={columnLayout}
                  onChange={(e) => setColumnLayout(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          ) : (
            <div className=''>
              <label className="block py-2 font-normal border-b-2 border-gray-700">
                {t('settings.columnLayout')}: <span className='font-bold'>{gameData.columnLayout ? t('common:yes') : t('common:no')}</span>
              </label>
            </div>
          )}
          {/* Untimed checkbox */}
          {firstPlayer ? (
            <div className="flex items-center justify-between py-4 border-b-2 border-gray-700">
              <label htmlFor="untimed" className="block font-bold">
                {t('settings.untimedMode')}
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="untimed"
                  checked={untimed}
                  onChange={(e) => setUntimed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          ) : (
            <div className=''>
              <label className="block py-2 font-normal border-b-2 border-gray-700">
                {t('settings.untimedMode')}: <span className='font-bold'>{gameData.untimed ? t('common:yes') : t('common:no')}</span>
              </label>
            </div>
          )}
          {/* Game Time - only show if not untimed */}
          {!untimed && (firstPlayer ? (
            <div className="flex items-center py-4 border-b-2 border-gray-700">
              <label htmlFor="gameTime" className="block font-bold w-5/12">
                {t('settings.gameTime')}
              </label>
              <select
                id="gameTime"
                value={gameTime}
                onChange={handleGameTimeChange}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option key="1" value="1">1</option>
                <option key="2" value="2">2</option>
                <option key="3" value="3">3</option>
                <option key="5" value="5">5</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label htmlFor="gameTime" className="block py-2 font-normal border-b-2 border-gray-700">
                {t('settings.gameTime')}: <span className='font-bold'>{gameData.gameTime}</span>
              </label>
            </div>
          ))}
          {firstPlayer ? (
            <div className="flex items-center py-4 border-b-2 border-gray-700">
              <label htmlFor="minWordLength" className="block font-bold w-5/12">
                {t('settings.minWordLength')}
              </label>
              <select
                id="minWordLength"
                value={minWordLength}
                onChange={handleMinWordLengthChange}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option key="3" value="3">3</option>
                <option key="4" value="4">4</option>
                <option key="5" value="5">5</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label htmlFor="minWordLength" className="block py-2 font-normal border-b-2 border-gray-700">
                {t('settings.minWordLength')}: <span className='font-bold'>{gameData.minWordLength}</span>
              </label>
            </div>
          )}
          {firstPlayer ? (
            <div className="flex items-center pt-4">
              <label htmlFor="numRounds" className="block font-bold w-5/12">
                {t('settings.numRounds')}
              </label>
              <select
                id="numRounds"
                value={numRounds}
                onChange={handleNumRoundsChange}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className=''>
              <label htmlFor="numRounds" className="block pt-2 font-normal">
                {t('settings.numRounds')}: <span className='font-bold'>{gameData.numRounds || players.length}</span>
              </label>
            </div>
          )}
        </>
      );
    } else if (gameData.gameType === 'Scattergories') {
      return (
        <>
          {firstPlayer ? (
            <div className="flex items-center pb-4 border-b-2 border-gray-700">
              <label htmlFor="roundTime" className="block font-bold w-5/12">
                {t('settings.roundTime')}
              </label>
              <select
                id="roundTime"
                value={roundTime}
                onChange={(e) => setRoundTime(e.target.value)}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                <option value="60">60</option>
                <option value="90">90</option>
                <option value="120">120</option>
              </select>
            </div>
          ) : (
            <div className=''>
              <label className="block pb-2 font-normal border-b-2 border-gray-700">
                {t('settings.roundTime')}: <span className='font-bold'>{gameData.roundTime || 90}</span>
              </label>
            </div>
          )}
          {firstPlayer ? (
            <div className="flex items-center pt-4">
              <label htmlFor="scattergoriesNumRounds" className="block font-bold w-5/12">
                {t('settings.numRounds')}
              </label>
              <select
                id="scattergoriesNumRounds"
                value={scattergoriesNumRounds}
                onChange={(e) => setScattergoriesNumRounds(e.target.value)}
                className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className=''>
              <label className="block pt-2 font-normal">
                {t('settings.numRounds')}: <span className='font-bold'>{gameData.numRounds || 3}</span>
              </label>
            </div>
          )}
        </>
      );
    }
  };

  return (
    <div className="max-w-screen-sm mx-auto p-4 text-lg text-gray-300">
      {displayRemovePlayerModal()}
      <h2 className="bg-gray-800 text-gray-300 text-xl font-bold mb-4 p-4 text-gray-300 rounded-lg">{t('gameCode')}: {shortId}</h2>
      <div className='mt-4 p-4 bg-gray-800 rounded-lg'>
        <div className="pb-2 border-b-2 border-gray-700 text-left text-lg">
          {t('joinedPlayers')}
        </div>
        <div className="flex flex-wrap pt-2">
          {players.map((p, i) => (
            <div key={p.name}
              style={{
                backgroundColor: playerColors[i],
                color: getContrastYIQ(playerColors[i])
              }}
              className={`text-gray-100 text-md rounded py-1 px-2 m-1`}>
              {firstPlayer ? <div onClick={() => setRemovePlayerName(p.name)} className='flex items-center cursor-pointer'>{p.name}
                <div className="flex items-center pl-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </div>
              </div> :
                <div>
                  {p.name}
                </div>}
            </div>
          ))}
        </div>
      </div>

      <div className='text-gray-300 mt-4 p-4 bg-gray-800 rounded-lg'>
        {renderGameOptions()}
      </div>
      {firstPlayer && <Button
        onClick={handleStartGame}
        className={`mt-4 w-full text-xl p-4 ${players.length >= 3 ? 'bg-green-600 text-white' : 'bg-gray-500 text-gray-100'}`}
        disabled={players.length < 1}>
        {t('common:buttons.startGame')}
      </Button>}
    </div>
  );
};

export default PlayerSetupPage;
