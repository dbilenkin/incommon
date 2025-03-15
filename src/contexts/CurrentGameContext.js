import React, { createContext, useState } from 'react';

const CurrentGameContext = createContext({
    gameRef: null,
    currentPlayerName: '',
    currentPlayerId: null,
    cards: [],
    setGameRef: () => { },
    setCurrentPlayerName: () => { },
    setCurrentPlayerId: () => { },
    setCards: () => { },
});

const CurrentGameProvider = ({ children }) => {
    const [currentPlayerName, setCurrentPlayerName] = useState(() => {
        const storedName = localStorage.getItem('currentPlayerName');
        return storedName || '';
    });

    const [currentPlayerId, setCurrentPlayerId] = useState(null);

    const [gameRef, setGameRef] = useState(null);

    const [cards, setCards] = useState([]);

    const setPlayerNameLocalStorage = (playerName) => {
        localStorage.setItem('currentPlayerName', playerName);
    };

    const handleNameChange = (playerName) => {
        setCurrentPlayerName(playerName);
        setPlayerNameLocalStorage(playerName);
    };

    const value = {
        gameRef,
        currentPlayerName,
        currentPlayerId,
        cards,
        setGameRef,
        setCurrentPlayerName: handleNameChange,
        setCurrentPlayerId,
        setCards,
    };

    return (
        <CurrentGameContext.Provider value={value}>{children}</CurrentGameContext.Provider>
    );
};

export { CurrentGameContext, CurrentGameProvider };
