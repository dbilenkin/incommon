import React, { useState, useEffect, useRef, createRef } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import HostCard from '../../components/HostCard';
import Nav from '../../components/Nav';
import AnimatedScore from '../../components/AnimatedScore';
import { getCardMatchScore } from '../../utils';
import AnimatedPlayerScore from '../../components/AnimatePlayerScore';
import { getCardScores, capitalize } from '../../utils';
import TopCardsModal from '../../components/TopCardsModal';

const HostRoundPage = ({ gameData, gameRef, players, deck }) => {
  const { currentRound, shortId, numCards, deckType } = gameData;
  const currentPlayerIndex = currentRound % players.length;

  const chooserName = players[currentPlayerIndex].name;

  const [roundData, setRoundData] = useState(null);
  const [roundRef, setRoundRef] = useState(null);
  const [animateScores, setAnimateScores] = useState(false);
  const [animationState, setAnimationState] = useState({
    stage: '',
    highlightedCard: null,
    cardIndex: 0,
    playerIndex: 0,
    score: 0,
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 },
  });
  const [topCards, setTopCards] = useState([]);
  const [triggerFlyAway, setTriggerFlyAway] = useState(false);

  const getCardMatch = (card) => {
    const { cardIndex, playerIndex } = animationState;
    let match = false;
    let score = 0;
    for (let i = 0; i < players.length; i++) {
      if (i === playerIndex) continue;
      const otherCards = players[i].chosenCards;
      if (card === otherCards[cardIndex]) {
        match = true;
        score += getCardMatchScore(cardIndex, cardIndex);
      } else if (otherCards.indexOf(card) !== -1) {
        match = true;
        score += getCardMatchScore(cardIndex, otherCards.indexOf(card));
      }
    }

    const roundPlayer = roundData.players[playerIndex];
    roundPlayer.roundScore += score;

    return { match, score };
  }

  useEffect(() => {
    setTopCards([]);
    setTriggerFlyAway(false);
    const roundsRef = collection(gameRef, "rounds");
    const q = query(roundsRef, where('roundNumber', '==', currentRound));

    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size === 1) {
        const roundId = querySnapshot.docs[0].id;
        const _roundRef = doc(roundsRef, roundId);
        onSnapshot(_roundRef, (doc) => {
          setRoundRef(_roundRef);
          // const _roundData = doc.data();
          // if (_roundData)
          setRoundData(doc.data());
        });
      } else {
        console.error('Invalid short ID.');
      }
    });
  }, [currentRound, gameRef]);

  useEffect(() => {
    const { stage, cardIndex, playerIndex } = animationState;
    if (stage !== 'highlight' || playerIndex >= players.length) return;

    function highlightMatches() {
      const player = players[playerIndex];
      const card = player.chosenCards[cardIndex];
      const cardMatch = getCardMatch(card);
      if (cardMatch.match) {
        setTimeout(() => {
          setAnimationState({
            ...animationState,
            highlightedCard: card,
            stage: 'adjustScore',
            score: cardMatch.score,
          });
        }, 500);
      } else {
        setAnimationState({
          ...animationState,
          highlightedCard: null,
          stage: 'nextCard',
          score: 0,
        });
      }
    };

    highlightMatches();
  }, [animationState]);

  useEffect(() => {
    const { stage, cardIndex, playerIndex, score } = animationState;
    if (stage !== 'adjustScore') return;
    function adjustScore() {

      setTimeout(() => {
        setAnimationState({ ...animationState, stage: 'animateScore' });
      }, 100);
    };

    adjustScore();
  }, [animationState]);

  useEffect(() => {
    const { stage, cardIndex, playerIndex } = animationState;
    if (stage !== 'nextCard') return;
    let newCardIndex = cardIndex + 1;
    let newPlayerIndex = playerIndex;
    let nextPlayer = false;
    if (cardIndex === 4) {
      newPlayerIndex = playerIndex + 1;
      newCardIndex = 0;
      nextPlayer = true;
    }

    const newCardState = {
      ...animationState,
      cardIndex: newCardIndex,
      playerIndex: newPlayerIndex,
      stage: 'highlight'
    }
    const delayLength = nextPlayer ? 500 : 0;
    setTimeout(() => {
      setAnimationState(newCardState);
    }, delayLength);
  }, [animationState])



  useEffect(() => {
    if (roundData && roundData.flippedCards === numCards + 1) {

      const calculateScores = async () => {
        const roundPlayers = [...players];
        let connectionScores = [];
        let topCardMap = {};

        for (let i = 0; i < roundPlayers.length; i++) {
          const player = roundPlayers[i];
          player.roundScore = 0;

          const roundPlayer = roundData.players.find(p => p.name === player.name);
          player.gameScore = roundPlayer.gameScore;
          player.connections = roundPlayer.connections;
          const cards = player.chosenCards;
          for (const [index, cardIndex] of cards.entries()) {
            const cardScore = 10 - index;
            if (topCardMap[cardIndex]) {
              topCardMap[cardIndex] += cardScore;
            } else {
              topCardMap[cardIndex] = cardScore;
            }
          }

          for (let j = 0; j < roundPlayers.length; j++) {
            if (i === j) continue;
            const otherPlayer = roundPlayers[j];
            const otherCards = otherPlayer.chosenCards;
            const roundScore = getCardScores(cards, otherCards);
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

        setTriggerFlyAway(true);
        // Wait for the animation to finish before showing the modal
        setTimeout(() => {
          setTopCards(Object.entries(topCardMap).sort((a, b) => b[1] - a[1]).map(c => c[0]).slice(0, 5));
        }, 1000);
        
        connectionScores.sort((a, b) => a - b);
        const connectionThreshold = connectionScores[Math.floor(connectionScores.length / 2)];
        try {
          await updateDoc(roundRef, {
            players: roundPlayers,
            scoresCalculated: true,
            connectionScores,
            connectionThreshold
          });
          console.log("Update successful");
        } catch (error) {
          console.error("Error updating document: ", error);
        }
      }

      if (!roundData.scoresCalculated) {
        calculateScores();
      }
      // setAnimationState({
      //   ...animationState,
      //   stage: 'highlight',
      // });
    }
  }, [roundData])

  useEffect(() => {
    const checkAllCardsSubmitted = async () => {
      let allCardsSubmitted = true;
      for (let player of players) {
        if (player.chosenCards.length < numCards) {
          allCardsSubmitted = false;
          break;
        }
      }
      if (allCardsSubmitted) {
        try {
          await updateDoc(roundRef, {
            allCardsSubmitted: true
          });
          console.log("Update successful");
        } catch (error) {
          console.error("Error updating document: ", error);
        }
      }
    }

    checkAllCardsSubmitted();

  }, [players]);

  // Function to be called when score animation ends
  const handleScoreAnimationRest = () => {
    // setTimeout(() => {
    //   setAnimationState({ ...animationState, stage: 'nextCard' });
    // }, 500);
  };

  if (!roundData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getWord = () => {
    const word = roundData.word;
    return (
      word ? <span>Word:  <span className='text-green-500 font-bold uppercase'>{word}</span></span> :
        <span>Waiting for <span className="text-green-500 font-bold">{chooserName}</span> to choose the word</span>
    )
  }

  const getGameCode = () => {
    return (
      <span>Game Code:  <span className='text-yellow-500 font-bold uppercase'>{shortId}</span></span>
    )
  }

  const getCardPosition = (playerNumber) => {
    const row = Math.floor(playerNumber / 2);
    const y = row * 5 - 30;
    return y + 'px';
  }

  const highlightPlayer = playerIndex => {
    // return playerIndex === animationState.playerIndex && roundData.flippedCards === 6;
    return false;
  }

  const getCardSize = () => {
    return { width: 100, height: 140 };
    if (players.length > 8) {
      return { width: 80, height: 112 };
    }
    if (players.length > 3) {
      return { width: 100, height: 140 };
    }
    return { width: 120, height: 168 };
  }

  const displayTopCardsModal = () => {

    const cardSize = { width: 150, height: 210 };
    return (
      topCards.length > 0 && <TopCardsModal
        topCards={topCards}
        deck={deck}
        deckType={deckType}
        cardSize={cardSize}
        word={roundData.word}
      />
    )
  }

  return (
    <div>
      <Nav className={`${players.length <= 4 ? 'max-w-screen-lg' : 'max-w-screen-xl'}`}
        gameCode={getGameCode()}
        round={currentRound}
        word={getWord()} />
      <div className={`${players.length > 8 ? 'mx-2' : 'max-w-screen-xl'} mx-auto mt-2`}>
        <div className={`grid grid-cols-${Math.ceil(players.length / 4)} gap-2`}>
          {players.map((player, playerIndex) => (
            <div key={playerIndex}
              className={`flex bg-gray-800 text-gray-200 rounded-lg shadow px-3 pt-2 ${players.length <= 4 ? 'mx-auto' : ''}`}
              style={{
                width: players.length <= 4 ? '55%' : 'auto', // Adjust width for fewer players
              }}>
              <div className="flex flex-col justify-center items-center">
                <div className="">
                  <div className="text-base font-semibold w-12 mr-2 pb-2 text-center">{player.name}</div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <div className={`flex-grow grid grid-cols-${numCards} gap-1`}>
                    {player.chosenCards.length === numCards ? player.chosenCards.map((cardIndex, i) => (
                      <div key={cardIndex} className="p-1">
                        <HostCard
                          size={getCardSize()}
                          deck={deck}
                          cardIndex={cardIndex}
                          flip={roundData.flippedCards > i}
                          position={getCardPosition(playerIndex)}
                          backToChosenCards={i + 1 < roundData.flippedCards}
                          highlight={cardIndex === animationState.highlightedCard}
                          flyAway={triggerFlyAway}
                        />
                      </div>
                    )) :
                      Array(numCards).fill().map((_, i) => (
                        <div key={i} className="p-1">
                          <HostCard size={getCardSize()} placeholder={true} />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {displayTopCardsModal()}
    </div>

  );
};

export default HostRoundPage;