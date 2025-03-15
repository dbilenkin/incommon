import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { CurrentGameContext } from '../../contexts/CurrentGameContext';
import Spinner from '../../components/Spinner';
import ConnectionThresholdRangeInput from '../../components/ConnectionThresholdRangeInput';
import ConnectionThresholdSelector from '../../components/ConnectionThresholdSelector';
import { getOrdinal } from '../../utils';
import PlayerGraph from '../../components/PlayerGraph';

function PlayerEndPage({ gameData, gameRef, players }) {

  const [round, setRound] = useState(null);
  const [roundRef, setRoundRef] = useState(null);
  const [data, setData] = useState(null);
  const [strongestPair, setStrongestPair] = useState(null);

  const { currentPlayerName } = useContext(CurrentGameContext);
  const firstPlayer = players[0].name === currentPlayerName;

  useEffect(() => {

    async function fetchRoundData() {
      const roundsRef = collection(gameRef, 'rounds');
      const q = query(roundsRef, where('roundNumber', '==', gameData.gameLength));

      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const roundId = querySnapshot.docs[0].id;
          const _roundRef = doc(roundsRef, roundId);
          setRoundRef(_roundRef);
          const roundData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setRound(roundData[0]);
        } else {
          console.log("No matching rounds found");
        }
      } catch (error) {
        console.error("Error fetching round data: ", error);
      }
    }

    fetchRoundData();

  }, [gameData.gameLength, gameRef]);

  useEffect(() => {
    if (!round) return;
    const players = [...round.players];
    const currentPlayerIndex = players.findIndex(p => p.name === currentPlayerName);
    const currentPlayer = players[currentPlayerIndex];

    const nodes = [{
      id: currentPlayerName,
      group: currentPlayerIndex
    }];

    const links = [];
    const sortedConnections = Object.entries(currentPlayer.connections).sort((a, b) => b[1] - a[1]);

    for (const [target, value] of sortedConnections) {

      if (value) {
        nodes.push({
          id: target,
          group: currentPlayerIndex
        });

        links.push({
          source: currentPlayerName,
          target,
          value
        });
      }
    }
    
    const topScore = sortedConnections[0][1];

    setData({
      nodes,
      links,
      topScore
    })

    setStrongestPair({
      source: currentPlayerName,
      target: sortedConnections[0][0],
      value: sortedConnections[0][1]
    });

  }, [round])

  if (!gameData || !round) {
    return (
      <Spinner />
    );
  }

  const sortedPlayers = [...round.players].sort((a, b) => b.gameScore - a.gameScore);
  const player = sortedPlayers.find(p => p.name === currentPlayerName);
  const playerRank = sortedPlayers.findIndex(p => p.name === currentPlayerName) + 1;

  const connections = Object.entries(player.connections)
    .filter(([name, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  const rankMessage = () => {
    if (playerRank === 1) {
      return <span className='text-xl'>Most in common with everyone!</span>
    } else if (playerRank === round.players.length) {
      return <span className='text-xl'>Least in common with everyone!</span>
    } else {
      return <span className='text-xl'>{getOrdinal(playerRank)} most in common with everyone.</span>
    }
  }

  return (
    <div className="max-w-screen-sm mx-auto">
      <div className='text-center m-2 p-4 bg-gray-800 text-gray-200 rounded-lg'>
        <h2 className='text-2xl font-bold mb-4'>Player Summary</h2>
        <p className='text-xl text-left pb-2 border-b-2 border-gray-700'>
          {rankMessage()}
        </p>
        <p className='text-xl text-left py-2 border-b-2 border-gray-700'>
          Strongest connection with <span className='font-bold'>{connections[0][0]}</span>.
        </p>
        <p className={`flex flex-col ${firstPlayer ? 'py-2' : 'pt-2'}`}>
          <div className='text-left text-xl pb-2'>Your Connections</div>
          <div className="flex flex-wrap gap-2">
            {connections.map(([name, score]) => (
              <span key={name} className={`text-gray-100 text-sm bg-gray-700 rounded px-2`}>
                {`${name}: ${score}`}
              </span>
            ))}
          </div>
        </p>
        {firstPlayer && <div className=''>
          <div className='text-xl text-left pt-2 text-gray-200 border-t-2 border-gray-700'>Update Connection Threshold</div>
          <ConnectionThresholdSelector roundData={round} roundRef={roundRef} />
        </div>}
      </div>
      {data && <div className='mx-2 bg-gray-100 border border-2 border-gray-800 rounded-lg'>
        <PlayerGraph small={true} width={315} height={200} data={data} strongestPlayer={currentPlayerName} strongestPair={strongestPair} />
      </div>}
    </div>

  );
}

export default PlayerEndPage;
