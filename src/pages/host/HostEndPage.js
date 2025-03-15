import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import Spinner from '../../components/Spinner';
import Nav from '../../components/Nav';
import PlayerGraph from '../../components/PlayerGraph';
import PlayerConnectionsTable from '../../components/PlayerConnectionsTable';
import { getCardScores } from '../../utils';

function HostEndPage({ gameData, gameRef }) {

  const [round, setRound] = useState(null);
  const [data, setData] = useState({ nodes: [], links: [] });
  const [strongestPlayer, setStrongestPlayer] = useState(null);
  const [strongestConnectionCount, setStrongestConnectionCount] = useState(null);

  ////////////// TESTING

  const TESTING = false;
  // const numPlayers = 8;
  const numPlayers = Math.floor(Math.random() * 10) + 3

  const generateChosenCards = () => {
    round.players = round.players.slice(0, numPlayers);
    for (let i = 0; i < round.players.length; i++) {
      const chosenCards = [];
      for (let j = 0; j < 5; j++) {
        let randomIndexFound = false;
        while (!randomIndexFound) {
          const randomTry = Math.floor(Math.random() * 26)
          if (!chosenCards.includes(randomTry)) {
            chosenCards.push(randomTry);
            randomIndexFound = true;
          }
        }
        round.players[i].chosenCards = chosenCards;
      }
    }
  }

  const calculateScores = async () => {
    const roundPlayers = round.players;
    let connectionScores = [];

    for (let i = 0; i < roundPlayers.length; i++) {
      const player = roundPlayers[i];
      player.roundScore = 0;
      player.gameScore = 0;
      player.connections = [];

      const roundPlayer = round.players.find(p => p.name === player.name);
      player.gameScore = roundPlayer.gameScore;
      player.connections = roundPlayer.connections;

      for (let j = 0; j < roundPlayers.length; j++) {
        if (i === j) continue;
        const otherPlayer = roundPlayers[j];
        const cards1 = player.chosenCards;
        const cards2 = otherPlayer.chosenCards;
        const roundScore = getCardScores(cards1, cards2);
        player.roundScore += roundScore;

        if (!player.connections || !player.connections[otherPlayer.name]) {
          player.connections[otherPlayer.name] = roundScore;
        } else {
          player.connections[otherPlayer.name] += roundScore;
        }

        connectionScores.push(player.connections[otherPlayer.name]);
      }
      player.gameScore += player.roundScore;
    }
    connectionScores.sort((a, b) => a - b);
    // round.connectionThreshold = connectionScores[Math.floor(connectionScores.length * 1/2)];
  }

  ///////////////// END TESTING ///////////

  useEffect(() => {
    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', gameData.gameLength));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (doc) => {
          setRound(doc.data());
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [gameData.gameLength, gameRef]);

  useEffect(() => {

    if (!round || !Number.isInteger(round.connectionThreshold)) return;

    if (TESTING) {
      generateChosenCards();
      calculateScores();
    }

    const _data = { nodes: [], links: [] };
    let groups = {};

    const addToGroups = (neighborGroupNumber, player) => {
      if (!Object.hasOwn(groups, player.name)) {
        groups[player.name] = neighborGroupNumber;
        for (let [name, score] of Object.entries(player.connections)) {
          const otherPlayer = round.players.find(p => p.name === name);
          if (score > round.connectionThreshold) {
            addToGroups(neighborGroupNumber, otherPlayer)
          }
        }
      }
    }

    const createGroups = () => {
      let groupNumber = 0;
      addToGroups(groupNumber, round.players[0]);
      for (let i = 1; i < round.players.length; i++) {
        const player = round.players[i];
        if (!Object.hasOwn(groups, player.name)) {
          groupNumber++;
          addToGroups(groupNumber, player);
        }
      }
      for (let [key, value] of Object.entries(groups)) {
        _data.nodes.push({
          id: key,
          group: value
        })
      }
    }

    createGroups();

    const createDataFromPlayerScores = () => {
      for (let i = 0; i < round.players.length; i++) {
        const player = round.players[i];
        for (let j = i + 1; j < round.players.length; j++) {
          const score = player.connections[round.players[j].name];
          if (score > round.connectionThreshold) {
            _data.links.push({
              source: player.name,
              target: round.players[j].name,
              value: score,
            });
          }
        }
      }

    }

    createDataFromPlayerScores();

    const topScore = round.connectionScores[round.connectionScores.length - 1];
    _data.topScore = topScore;

    setData(_data);

    const _strongestPlayer = [...round.players].sort((a, b) => b.gameScore - a.gameScore)[0];
    setStrongestPlayer(_strongestPlayer);
    setStrongestConnectionCount(Object.values(_strongestPlayer.connections).filter(score => score > round.connectionThreshold).length);

  }, [round])

  if (!gameData || !round || !strongestPlayer) {
    return (
      <Spinner />
    );
  }



  const sortedPlayers = [...round.players].sort((a, b) => b.roundScore - a.roundScore);
  // const data = {
  //   nodes: [
  //     { id: "Player 1", group: 1 },
  //     { id: "Player 2", group: 1 },
  //     { id: "Player 3", group: 1 },
  //     // Add more players as needed
  //   ],
  //   links: [
  //     { source: "Player 1", target: "Player 2", value: 10 },
  //     { source: "Player 1", target: "Player 3", value: 5 },
  //     { source: "Player 2", target: "Player 3", value: 1 },
  //     // Add more links as needed, where 'value' represents the connection strength
  //   ]
  // };


  let maxScore = 0;
  let totalScore = 0;
  let strongestPair = {};

  const getMaxScore = () => {
    for (let i = 0; i < round.players.length; i++) {
      const player = round.players[i];
      for (let [name, score] of Object.entries(player.connections)) {
        totalScore += score;
        if (score > maxScore) {
          maxScore = score;
          strongestPair = {
            source: player.name,
            target: name,
            value: score
          }
        }
      }
    }
  }

  getMaxScore();

  // const getAverageScore = () => {
  //   connectionThreshold = totalScore / (round.players.length * (round.players.length - 1))
  // }

  // getAverageScore();

  const height = round.players.length * 20 + 320;

  return (
    <div>
      {strongestPlayer && Number.isInteger(strongestConnectionCount) && <div>
        <Nav className="max-w-screen-md" />
        <div className='max-w-screen-md mx-auto mt-3'>
          {/* Summary Section */}
          <div className='text-center mb-4 p-4 bg-gray-800 text-gray-200 rounded-lg'>
            <h2 className='text-3xl font-bold mb-4'>Game Summary</h2>
            <p className='text-2xl'>
              <span className='font-bold text-yellow-400'>{strongestPlayer.name}</span> had the most in common with everyone!
            </p>
            <p className='text-2xl'>
              <span className='font-bold text-green-500'>{strongestPair.source}</span> & <span className='font-bold text-green-500'>{strongestPair.target}</span> had the most in common with each other!
            </p>
          </div>

          <div className='flex justify-around'>
            {/* Player Connections Table */}
            {false && <div className='rounded-lg'>
              <PlayerConnectionsTable
                playersData={round.players}
                averageScore={round.connectionThreshold}
                strongestPlayer={strongestPlayer.name}
                strongestPair={strongestPair} />
            </div>}
            {/* Player Graph */}
            <div className='bg-gray-100 border border-4 border-gray-800 rounded-lg'>
              <PlayerGraph width={724} height={height} data={data} strongestPlayer={strongestPlayer.name} strongestPair={strongestPair} />
            </div>
          </div>
        </div>
      </div>}
    </div>
  );

}

export default HostEndPage;
