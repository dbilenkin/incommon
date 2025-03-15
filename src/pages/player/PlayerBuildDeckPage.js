import React, { useState } from 'react';
import axios from 'axios';
import Deck from '../../components/Deck';

const PlayerBuildDeckPage = ({ gameData }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [deck, setDeck] = useState([]);

  const handleSearch = async () => {
    try {
      const response = await axios.get('https://api.bing.microsoft.com/v7.0/images/search', {
        params: { q: query, count: 10 },
        headers: { 'Ocp-Apim-Subscription-Key': 'ee8e1ecaf0634e549b8a375c791dab7a' }
      });
      setResults(response.data.value);
      const _deck = response.data.value.map(result => ({ name: '', imageUrl: result.thumbnailUrl}));
      setDeck(_deck);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleSelectCards = async (assignedBoxes) => {
    // const chosenCards = Object.values(assignedBoxes).slice(0, numCards);

    // try {
    //   const currentPlayerDocRef = doc(gameRef, 'players', currentPlayerId);
    //   await updateDoc(currentPlayerDocRef, {
    //     chosenCards: chosenCards
    //   });

    //   setCardsSubmitted(true);
    // } catch (error) {
    //   console.error("Error updating player's chosenCards: ", error);
    // }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Build Your Deck</h1>
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for images"
          style={{ width: '80%', padding: '10px', marginBottom: '10px' }}
        />
        <button onClick={handleSearch} style={{ padding: '10px' }}>Search</button>
      </div>
      <div className='max-w-screen-sm bg-gray-800'>
        <div className="deckContainer mb-4 mx-auto bg-gray-800">
          {deck.length && <Deck deck={deck} gameData={gameData} handleSelectCards={handleSelectCards} />}
        </div>
      </div>
    </div>
  );
}

export default PlayerBuildDeckPage;
