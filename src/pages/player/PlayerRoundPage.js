import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Deck from '../../components/Deck';
import Button from '../../components/Button';

const PlayerRoundPage = ({ deck, gameData, gameRef }) => {
    const { players, teams, gameState, currentRound, gameLength } = gameData;
    const currentPlayerIndex = currentRound % players.length;

    const { currentPlayerName } = useContext(CurrentGameContext); // Access context
    const firstPlayer = players[0].name === currentPlayerName;

    const [phrase, setPhrase] = useState(''); // State for the chosen phrase
    const [roundData, setRoundData] = useState('');
    const [roundRef, setRoundRef] = useState(null);
    const [cardsSubmitted, setCardsSubmitted] = useState(false);

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
    }, [currentRound]);

    useEffect(() => {
        if (roundData) {
            const currPlayer = roundData.players.find(player => player.name === currentPlayerName);
            setCardsSubmitted(currPlayer.chosenCards && currPlayer.chosenCards.length > 0);
        }
    }, [roundData]);

    const handleChoosePhrase = async (event) => {
        event.preventDefault();

        // Update chosen phrase in Firestore based on current player
        await updateDoc(roundRef, {
            phrase
        });
    };

    const handleSelectCards = async (assignedBoxes) => {
        const chosenCards = Object.values(assignedBoxes).slice(0, 5); // Adjust this according to your logic
        const roundPlayers = [...roundData.players];
        const player = roundPlayers.find(p => p.name === currentPlayerName);
        player.chosenCards = chosenCards;

        try {
            await updateDoc(roundRef, {
                players: roundPlayers
            });
            setCardsSubmitted(true);
        } catch (error) {
            console.error("Error updating document: ", error);
        }
    };

    const startNextRound = async () => {
        //clear out chosen Cards
        const roundPlayers = [...players];
        for (const roundPlayer of roundPlayers) {
            roundPlayer.chosenCards = [];
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
                    phrase: '',
                    players: roundPlayers
                });

                await updateDoc(gameRef, {
                    currentRound: currentRound + 1
                });
            }

        } catch (error) {
            console.error("Error updating document: ", error);
        }
    }

    const showContinueToNextRound = () => {
        return (
            firstPlayer ?
                <div className='mt-4'>
                    <Button onClick={startNextRound}>
                        Start Next Round
                    </Button>
                </div>
                :
                <p className="text-lg font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg shadow mt-4">
                    Waiting for other players...
                </p>
        )
    }

    const showDeck = () => {
        return (
            cardsSubmitted ?
                showContinueToNextRound()
                : <div className="deckContainer mb-4 mx-auto">
                    <div className='mt-4 flex justify-around items-center'>
                        <p className="text-lg font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg shadow">
                            Round: {currentRound}
                        </p>
                        <p className="text-lg font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg shadow">
                            Phrase: {roundData.phrase}
                        </p>
                    </div>
                    <Deck deck={deck} gameData={gameData} handleSelectCards={handleSelectCards} />
                </div>
        )
    }

    const showChooser = () => {
        const chooserName = players[currentPlayerIndex].name;
        const chooser = chooserName === currentPlayerName;

        return (
            chooser ? <div>
                <form onSubmit={handleChoosePhrase} className="flex flex-col items-center justify-center space-y-4 mt-4">
                    <p className="text-lg font-semibold">Choose the phrase</p>
                    <input
                        type="text"
                        placeholder="Enter your phrase..."
                        value={phrase}
                        onChange={(event) => setPhrase(event.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button type="submit">Choose Phrase</Button>
                </form>

            </div> :
                <div className='mt-4 flex justify-center items-center'>
                    <p className="text-lg font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg shadow">
                        Waiting for <span className="text-blue-500">{players[currentPlayerIndex].name}</span> to choose the phrase
                    </p>
                </div>

        )
    }

    return (
        <div className=''>
            <div className="container mx-auto text-center">
                {roundData.phrase ? showDeck() : showChooser()}
            </div>
        </div>
    );
};

export default PlayerRoundPage;