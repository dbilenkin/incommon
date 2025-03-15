import React, { useEffect } from 'react';
import Nav from '../../components/Nav';
import { displayFormattedDeckType, displayGameLength, displayWordSelection } from '../../utils';
import Toggle from '../../components/Toggle';
import PlayerJoinGraph from '../../components/PlayerJoinGraph';

const HostSetupPage = ({ gameData, players }) => {
  const { shortId, gameType } = gameData;

  useEffect(() => {
    if (players.length > 0) {
      const audio = new Audio('sounds/bubble.mp3'); // assuming bubble.mp3 is in the public folder
      audio.play().catch(error => console.log('Error playing the sound:', error));
    }
  }, [players]);

  const renderGameOptions = () => {
    if (gameType === 'Incommon') {
      return (
        <div className='mt-2 p-6 bg-gray-800 rounded-lg text-2xl'>
          <label htmlFor="deckType" className="block border-b pb-2 border-gray-600">
            Deck: <span className='font-bold'>{displayFormattedDeckType(gameData.deckType)}</span>
          </label>
          <label htmlFor="deckType" className="block border-b py-2 border-gray-600">
            Game Length: <span className='font-bold'>{displayGameLength(gameData.gameLength)}</span>
          </label>
          <label htmlFor="deckType" className="block pt-2">
            Word Selection: <span className='font-bold'>{displayWordSelection(gameData.wordSelection)}</span>
          </label>
        </div>
      );
    } else if (gameType === 'Out of Words, Words') {
      return (
        <div className='mt-2 p-6 bg-gray-800 rounded-lg text-2xl'>
          <label htmlFor="minWordLength" className="block">
            Minimum Word Length: <span className='font-bold'>{gameData.minWordLength}</span>
          </label>
          <label htmlFor="minWordLength" className="block">
            Game Time (Minutes): <span className='font-bold'>{gameData.gameTime}</span>
          </label>
        </div>
      );
    }
  };

  return (
    <div className="">
      <Nav className="max-w-screen-md" />
      <div className="max-w-screen-md mx-auto px-4 pt-2 text-gray-200"> {/* text color adjusted for dark background */}
        <div className='flex justify-between bg-gray-800 p-6 rounded-lg'>
          <h2 className="text-5xl font-bold text-gray-200 ">
            Game Code: <span className='text-green-500'>{shortId}</span>
          </h2>
          <Toggle className="text-2xl text-gray-200">Allow Sounds</Toggle>
        </div>

        <div className='mt-2 p-6 bg-gray-800 rounded-lg'>
          <div className="flex justify-between items-end pb-2 text-2xl">
            <div className='text-2xl'>
              Joined Players
            </div>
            {players.length > 1 && <div className='text-xl'>
              <span className='text-yellow-400 font-bold'>{players[0].name}</span> start the game once everyone joins!
            </div>}
          </div>
          <div className='md:col-span-1 bg-gray-100 border border-4 border-gray-500 rounded-lg'>
            <PlayerJoinGraph players={players.map((p, i) => ({
              id: i,
              name: p.name,
            }))} width={680} height={300} />
          </div>
        </div>
        {renderGameOptions()}
      </div>
    </div>
  );
};

export default HostSetupPage;
