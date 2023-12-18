import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/Firebase';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import PlayerRoundPage from './PlayerRoundPage';
import PlayerSetupPage from './PlayerSetupPage';

const PlayerGamePage = () => {

    const { shortId } = useParams();
    const [gameData, setGameData] = useState(null);
    const [gameRef, setGameRef] = useState(null);

    useEffect(() => {
        const gamesRef = collection(db, 'games');
        const q = query(gamesRef, where('shortId', '==', shortId));

        getDocs(q).then((querySnapshot) => {
            if (querySnapshot.size === 1) {
                const gameId = querySnapshot.docs[0].id;
                const _gameRef = doc(db, 'games', gameId);
                setGameRef(_gameRef)
                onSnapshot(_gameRef, (doc) => {
                    console.log(doc.data());
                    setGameData(doc.data());

                });
            } else {
                console.error('Invalid short ID.');
            }
        });


    }, [shortId]);

    if (!gameData) {
        return <p>Loading...</p>;
    }

    const { players, teams, gameState, round } = gameData;

    return (
        <div>
            {gameState === 'started' ? 
            <PlayerRoundPage gameData={gameData} gameRef={gameRef} /> :
            <PlayerSetupPage gameData={gameData} gameRef={gameRef} />}
        </div>
    );
};

export default PlayerGamePage;
