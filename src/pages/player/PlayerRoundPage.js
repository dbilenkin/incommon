import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Deck from '../../components/Deck';
import Button from '../../components/Button';
import { getOrdinal, getRandomWords } from '../../utils';

const PlayerRoundPage = ({ gameData, gameRef, players, deck }) => {
  const { currentRound, gameLength, wordSelection, deckType, numCards } = gameData;
  const currentPlayerIndex = currentRound % players.length;

  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const firstPlayer = players[0].name === currentPlayerName;

  const [word, setWord] = useState('');
  const [roundData, setRoundData] = useState('');
  const [roundRef, setRoundRef] = useState(null);
  const [cardsSubmitted, setCardsSubmitted] = useState(false);
  const [flippedCards, setFlippedCards] = useState(0);
  const [wordList, setWordList] = useState([]);

  useEffect(() => {
    console.log({ currentPlayerId })
  }, [currentPlayerId])

  useEffect(() => {
    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (doc) => {
          setRoundRef(_roundRef);
          setRoundData(doc.data());
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [currentRound, gameRef]);

  useEffect(() => {
    const currPlayer = players.find(player => player.name === currentPlayerName);
    setCardsSubmitted(currPlayer.chosenCards && currPlayer.chosenCards.length > 0);
  }, [players, currentPlayerName]);

  const handleChooseWord = async (event) => {
    event.preventDefault()
    await updateDoc(roundRef, {
      word
    });
    setWord('');
  };

  const handleWordSelection = async (wordOption) => {
    setWord(wordOption);
    await updateDoc(roundRef, {
      word: wordOption
    });
  }

  const handleSelectCards = async (assignedBoxes) => {
    const chosenCards = Object.values(assignedBoxes).slice(0, numCards);

    try {
      const currentPlayerDocRef = doc(gameRef, 'players', currentPlayerId);
      await updateDoc(currentPlayerDocRef, {
        chosenCards: chosenCards
      });

      setCardsSubmitted(true);
    } catch (error) {
      console.error("Error updating player's chosenCards: ", error);
    }
  };

  const clearChosenCards = async () => {

    const playersRef = collection(gameRef, 'players');
    const q = query(playersRef);

    try {
      const querySnapshot = await getDocs(q);
      const playerDocs = querySnapshot.docs;

      for (const playerDoc of playerDocs) {
        const playerDocRef = playerDoc.ref;
        await updateDoc(playerDocRef, {
          chosenCards: []
        });
      }
    } catch (error) {
      console.error("Error clearing chosen cards: ", error);
    }
  };

  const handleFlipCard = async () => {
    if (flippedCards <= numCards) {
      const newFlippedCards = flippedCards + 1;
      setFlippedCards(newFlippedCards);
      await updateDoc(roundRef, { flippedCards: newFlippedCards });
    }
  };

  const startNextRound = async () => {
    clearChosenCards();
    setFlippedCards(0);
    setWord("");
    setWordList([]);
    const updatedPlayers = [...players];
    for (let i = 0; i < roundData.players.length; i++) {
      updatedPlayers[i].gameScore = roundData.players[i].gameScore;
      updatedPlayers[i].connections = roundData.players[i].connections;
    }

    try {
      if (currentRound === gameLength) {
        await updateDoc(gameRef, {
          gameState: "ended"
        });
      } else {
        const roundsRef = collection(gameRef, "rounds")
        await addDoc(roundsRef, {
          roundNumber: currentRound + 1,
          word: '',
          players: updatedPlayers,
        });

        await updateDoc(gameRef, {
          currentRound: currentRound + 1,
        });
      }

    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }

  const showFirstPlayerChoices = () => {
    let message = "Start Next Round";
    if (!roundData.allCardsSubmitted) {
      return (
        <p className="mx-4 text-xl font-semibold text-gray-300 bg-gray-800 px-4 py-2 rounded-lg shadow mt-4">
          Sit tight. <br></br> Some people are slow.
        </p >
      )
    }
    if (flippedCards < numCards) {
      message = `Flip ${getOrdinal(flippedCards + 1)} Card`;
    } else if (flippedCards === numCards) {
      message = 'Show Top Cards';
    } else if (currentRound === gameLength) {
      message = "Show End Screen";
    }

    return (
      <div className='m-4'>
        {flippedCards <= numCards ? (
          <Button className="w-full" onClick={handleFlipCard}>
            {message}
          </Button>
        ) : (
          <Button className="w-full" onClick={startNextRound}>
            {message}
          </Button>
        )}
      </div>
    );
  };

  const showWaitingForNextRound = () => {
    if (roundData.allCardsSubmitted) {
      return (
        <p className="mx-4 text-lg font-semibold text-gray-300 bg-gray-800 px-4 py-2 rounded-lg shadow mt-4">
          All cards are in! <br></br>Now <span className="text-green-500 font-bold">{players[0].name}</span> can flip the cards.
        </p >
      )
    }
    return (
      <p className="mx-4 text-lg font-semibold text-gray-300 bg-gray-800 px-4 py-2 rounded-lg shadow mt-4">
        Sit tight. Not everyone is as fast as you.
      </p >
    )
  }

  const showDeck = () => {
    return (
      <div className='max-w-screen-sm bg-gray-800'>
        <div className="deckContainer mb-4 mx-auto bg-gray-800">
          <p className="flex justify-between items-center font-semibold text-gray-300 bg-gray-800 border-b border-gray-500 px-2 py-1">
            <span className='text-md'>Round {currentRound}</span>
            <span className='text-lg font-bold uppercase text-green-500'>{roundData.word}</span>
          </p>
          <Deck deck={deck} gameData={gameData} handleSelectCards={handleSelectCards} />
        </div>
      </div>
    )
  }

  const showChooseWord = () => {

    if (wordSelection === "wordList") {
      if (!wordList || wordList.length === 0) {
        const _wordList = getRandomWords(deckType);
        setWordList(_wordList);
      }

      return (
        <div className='bg-gray-800 mx-4 text-gray-300 text-lg p-6 mt-4 rounded-lg'>
          <p className="text-2xl font-semibold mb-4">Choose the word for <br></br>round {currentRound}</p>
          <div className="">
            {wordList.map((wordOption, index) => (
              <Button 
                key={index} 
                onClick={() => handleWordSelection(wordOption)} 
                buttonType='large'
                className="w-full mb-6">
                {wordOption}
              </Button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className='bg-gray-800 mx-4 text-gray-300 text-lg p-4 mt-4 rounded-lg'>
        <form onSubmit={handleChooseWord} className="space-y-4">
          <p className="text-lg font-semibold">Choose the word for round {currentRound}</p>
          <input
            type="text"
            placeholder="Enter your word..."
            value={word}
            onChange={(event) => setWord(event.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button className="w-full" type="submit">Choose Word</Button>
        </form>
      </div>
    )
  };


  const showWaitingForWord = () => {
    return (
      <div className='m-4 text-gray-300 bg-gray-800 rounded-lg shadow'>
        <p className="text-2xl font-semibold  px-4 py-2">
          Waiting for <span className="text-green-500 font-bold">{players[currentPlayerIndex].name}</span> <br></br>to choose the word
        </p>
      </div>
    )
  }

  const displayRoundPage = () => {
    const chooserName = players[currentPlayerIndex].name;
    const chooser = chooserName === currentPlayerName;

    if (roundData.word) {
      if (cardsSubmitted) {
        if (firstPlayer) {
          return showFirstPlayerChoices();
        }
        return showWaitingForNextRound();
      }
      return showDeck();
    }

    if (chooser) {
      return showChooseWord();
    }
    return showWaitingForWord();
  }

  return (
    <div className="max-w-screen-sm mx-auto text-center">
      {displayRoundPage()}
    </div>
  );
};

export default PlayerRoundPage;