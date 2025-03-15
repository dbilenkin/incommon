import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Deck from '../../components/Deck';
import Button from '../../components/Button';
import { getOrdinal, getWordsOutOfWordsWords } from '../../utils';
import OutOfWordsWords from '../../components/OutOfWordsWords';

const PlayerWordsRoundPage = ({ gameData, gameRef, players }) => {
  const { currentRound, minWordLength, gameTime } = gameData;
  const currentPlayerIndex = currentRound % players.length;

  const { currentPlayerName, currentPlayerId } = useContext(CurrentGameContext);
  const firstPlayer = players[0].name === currentPlayerName;

  const [word, setWord] = useState('');
  const [roundData, setRoundData] = useState('');
  const [roundRef, setRoundRef] = useState(null);
  const [wordList, setWordList] = useState([]);
  const [timesUp, setTimesUp] = useState(false);
  const [foundWords, setFoundWords] = useState([]);
  const [wordsRevealed, setWordsRevealed] = useState(false);

  const duration = gameTime * 60;

  let timer;

  useEffect(() => {
    console.log({ currentPlayerId })
  }, [currentPlayerId])

  useEffect(() => {
    if (timesUp) {
      async function updateFoundWords() {
        try {
          const currentPlayerDocRef = doc(gameRef, 'players', currentPlayerId);
          await updateDoc(currentPlayerDocRef, {
            foundWords: foundWords
          });
    
        } catch (error) {
          console.error("Error updating player's chosenCards: ", error);
        }
      }

      updateFoundWords()
    }
  }, [timesUp])

  useEffect(() => {
    setTimesUp(false);
    setFoundWords([]);
    setWordsRevealed(false);

    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (doc) => {
          setRoundRef(_roundRef);
          setRoundData(doc.data());
          if (doc.data().word && !timer) {
            timer = setTimeout(() => setTimesUp(true), duration * 1000);
          }
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [currentRound, gameRef]);

  useEffect(() => {
    const currPlayer = players.find(player => player.name === currentPlayerName);
  }, [players, currentPlayerName]);

  const handleWordSelection = async (wordOption) => {
    setWord(wordOption);
    await updateDoc(roundRef, {
      word: wordOption
    });
  }

  const handleRevealWords = async () => {
    setWordsRevealed(true);
    await updateDoc(roundRef, {
      wordsRevealed: true
    });
  }

  const startNextRound = async () => {
    setWordList([]);
    const updatedPlayers = [...players];
    for (let i = 0; i < roundData.players.length; i++) {
      updatedPlayers[i].gameScore = roundData.players[i].gameScore;
    }

    try {
      if (currentRound === roundData.players.length) {
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

    return (
      <div className='m-4'>
        {!wordsRevealed ? (
          <Button className="w-full" onClick={handleRevealWords}>
            Reveal Words
          </Button>
        ) : (
          <Button className="w-full" onClick={startNextRound}>
            Start Next Round
          </Button>
        )}
      </div>
    );
  };

  const showWaitingForNextRound = () => {
    return (
      <p className="mx-4 text-lg font-semibold text-gray-300 bg-gray-800 px-4 py-2 rounded-lg shadow mt-4">
        Times up! <br></br>Now <span className="text-green-500 font-bold">{players[0].name}</span> can reveal everyone's words.
      </p >
    )
  }

  const showMakeWords = () => {
    return (
      <div className='max-w-screen-sm bg-gray-800'>
        <div className="deckContainer mb-4 mx-auto bg-gray-800">
          <p className="flex justify-between items-center font-semibold text-gray-300 bg-gray-800 border-b border-gray-500 px-2 py-1">
            <span className='text-md'>Round {currentRound}</span>
            <span className='text-lg font-bold uppercase text-green-500'>{roundData.word}</span>
          </p>
          <div>
            <OutOfWordsWords 
              word={roundData.word} 
              minWordLength={minWordLength} 
              foundWords={foundWords} 
              setFoundWords={setFoundWords}
              duration={duration} />
          </div>
        </div>
      </div>
    )
  }

  const showChooseWord = () => {

    if (!wordList || wordList.length === 0) {
      const _wordList = getWordsOutOfWordsWords();
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
      if (timesUp) {
        if (firstPlayer) {
          return showFirstPlayerChoices();
        }
        return showWaitingForNextRound();
      }
      return showMakeWords();
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

export default PlayerWordsRoundPage;