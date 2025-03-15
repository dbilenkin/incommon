import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/Firebase';
import Deck from '../../components/Deck';

const TestPage = () => {

    const [gameData, setGameData] = useState(null);

    useEffect(() => {
        const gamesRef = collection(db, 'games');
        const q = query(gamesRef, where('shortId', '==', 'DA2L'));

        getDocs(q).then((querySnapshot) => {
            if (querySnapshot.size === 1) {
                const gameId = querySnapshot.docs[0].id;
                const _gameRef = doc(db, 'games', gameId);
                onSnapshot(_gameRef, (doc) => {
                    console.log(doc.data());
                    setGameData(doc.data());

                });
            } else {
                console.error('Invalid short ID.');
            }
        });


    }, []);

    if (!gameData) {
        return <p>Loading...</p>;
    }

    return (
        <div>
            <h2>Test Page</h2>
            <h2>Swipe cards left and down</h2>
            <Deck gameData={gameData} />
        </div>

    );
};

export default TestPage;