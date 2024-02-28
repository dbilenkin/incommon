import React, { useState, useContext, useEffect } from 'react';
import { collection, deleteDoc } from 'firebase/firestore';
import { doc, updateDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Button from '../../components/Button';
import { db } from '../../utils/Firebase';
import Spinner from '../../components/Spinner';
import { getIndexDeck, displayFormattedDeckType, displayGameLength, displayWordSelection, getContrastYIQ } from '../../utils';
import { playerColors } from '../../constants';
import MessageModal from '../../components/MessageModal';

const PlayerSetupPage = ({ gameData, gameRef, players }) => {
  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const [selectedDeck, setSelectedDeck] = useState(gameData.deckType || 'life');
  const [selectedGameLength, setSelectedGameLength] = useState(gameData.gameLength || 3);
  const [selectedWordSelection, setSelectedWordSelection] = useState(gameData.wordSelection || 'wordList');
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [removePlayerName, setRemovePlayerName] = useState('');

  useEffect(() => {
    const updateGame = async () => {
      await updateDoc(gameRef, {
        gameLength: parseInt(selectedGameLength),
        deckType: selectedDeck,
        wordSelection: selectedWordSelection,
      });
    }

    updateGame();
  }, [selectedGameLength, selectedDeck, selectedWordSelection])

  const handleWordSelectionChange = (event) => {
    setSelectedWordSelection(event.target.value);
  }

  const handleDeckChange = (event) => {
    setSelectedDeck(event.target.value);
  };

  const handleGameLengthChange = (event) => {
    setSelectedGameLength(event.target.value);
  };

  if (!players.length) {
    return (
      <Spinner />
    );
  }

  const { shortId } = gameData;
  const firstPlayer = players[0].name === currentPlayerName;

  const handleStartGame = async () => {

    const indexDeck = getIndexDeck(selectedDeck);

    const roundsRef = collection(gameRef, "rounds")
    await addDoc(roundsRef, {
      roundNumber: 1,
      word: '',
      players
    });

    await updateDoc(gameRef, {
      gameLength: parseInt(selectedGameLength),
      currentRound: 1,
      deckType: selectedDeck,
      indexDeck,
      gameState: 'started',
      numCards: players.length <= 8 ? 5 : 4
    });
  };

  const removePlayer = async () => {

    const playersCollectionRef = collection(db, 'games', gameRef.id, 'players'); // Assuming players are nested within a game doc

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

    const nameMessage = removePlayerName === currentPlayerName ? "yourself" : removePlayerName;

    if (players.length === 1) {
      return (
        removePlayerName && <MessageModal
          header="Last One Standing"
          message={`You can't remove yourself, silly! You're the last one here.`}
          dismiss={closeRemovePlayerModal}
          modalAction={closeRemovePlayerModal}
        />
      )
    }
    return (
      removePlayerName && <MessageModal
        header="Remove Player"
        message={`Are you sure you want to remove ${nameMessage}?`}
        dismiss={closeRemovePlayerModal}
        modalAction={removePlayer}
      />
    )
  }

  return (
    <div className="max-w-screen-sm mx-auto p-4 text-lg text-gray-300">
      {displayRemovePlayerModal()}
      <h2 className="bg-gray-800 text-gray-300 text-xl font-bold mb-4 p-4 text-gray-300 rounded-lg">Game Code: {shortId}</h2>
      <div className='mt-4 p-4 bg-gray-800 rounded-lg'>
        <div className="pb-2 border-b-2 border-gray-700 text-left text-lg">
          Joined Players
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
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
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
        {firstPlayer ? <div className="flex items-center pb-4 border-b-2 border-gray-700">
          <label htmlFor="deckType" className="block font-bold w-5/12">
            Deck
          </label>
          <select
            id="deckType"
            value={selectedDeck}
            onChange={handleDeckChange}
            className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
          >
            <option value="life">Life</option>
            <option value="celebrities">Celebrities</option>
            <option value="actors">Actors</option>
            <option value="famousPeople">Famous People</option>
            <option value="animals">Animals</option>
          </select>
        </div> :
          <div className=''>
            <label htmlFor="deckType" className="block pb-2 font-normal border-b-2 border-gray-700">
              Deck: <span className='font-bold'>{displayFormattedDeckType(gameData.deckType)}</span>
            </label>
          </div>}
        {firstPlayer ? <div className="flex items-center py-4 border-b-2 border-gray-700">
          <label htmlFor="deckType" className="block font-bold w-5/12">
            Game Length
          </label>
          <select
            id="deckType"
            value={selectedGameLength}
            onChange={handleGameLengthChange}
            className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
          >
            <option key="3" value="3">Short</option>
            <option key="5" value="5">Medium</option>
            <option key="10" value="10">Long</option>
          </select>
        </div> :
          <div className=''>
            <label htmlFor="deckType" className="block py-2 font-normal border-b-2 border-gray-700">
              Game Length: <span className='font-bold'>{displayGameLength(gameData.gameLength)}</span>
            </label>
          </div>}
        {firstPlayer ? <div className="flex items-center pt-4">
          <label htmlFor="deckType" className="block font-bold w-5/12">
            Word Choice
          </label>
          <select
            id="deckType"
            value={selectedWordSelection}
            onChange={handleWordSelectionChange}
            className="block appearance-none w-7/12 bg-gray-700 border border-gray-500 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-600 focus:border-gray-500"
          >
            <option value="wordList">Word List</option>
            <option value="custom">Custom</option>
          </select>
        </div> :
          <div className=''>
            <label htmlFor="deckType" className="block pt-2 font-normal">
              Word Choice: <span className='font-bold'>{displayWordSelection(gameData.wordSelection)}</span>
            </label>
          </div>}
      </div>
      {firstPlayer && <Button
        onClick={handleStartGame}
        className={`mt-4 w-full text-xl p-4 ${players.length >= 3 ? 'bg-green-600 text-white' : 'bg-gray-500 text-gray-100'}`}
        disabled={players.length < 3}>
        Start Game
      </Button>}
    </div>
  );
};

export default PlayerSetupPage;
