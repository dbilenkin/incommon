import { useState, useEffect, useRef, createRef } from 'react'
import { useSpring, useSprings, animated, to as interpolate } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

import './Deck.css';
import Button from './Button';

let maxZIndex = 900;
const reviewedX = -193;
const markedY = 263;
const boxAdjustX = -235;
const boxAdjustY = 166;
const deckSize = 32;

// const cardStates = ["deck", "ready", "toReviewed", "reviewed", "toReady", "toMarked", "marked"];
let cardSet = [...Array(deckSize)].map(() => "ready");

function Deck({ deck, handleSelectCards, gameData }) {
  const [firstPassDone, setFirstPassDone] = useState(false);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [assignedBoxes, setAssignedBoxes] = useState([]);
  const [markedSet, setMarkedSet] = useState(new Set());

  const { numCards } = gameData;

  const boxRefs = useRef([]);

  useEffect(() => {
    boxRefs.current = Array.from({ length: numCards }, () => createRef());
  }, []);

  useEffect(() => {
    cardSet = [...Array(deckSize)].map(() => "ready");
    setAssignedBoxes([]);
  }, [gameData.currentRound])

  const boxAnimation = useSpring({
    from: { y: -1000 },
    to: { y: firstPassDone ? 0 : -1000 },
    config: { tension: 200, friction: 20 }
  });

  const to = (i) => {
    const boxed = cardSet[i].startsWith("box");
    const ready = cardSet[i] === "ready";
    const marked = cardSet[i] === "marked";

    let returnValues = {
      width: 130,
      height: 190,
      scale: 1,
      rot: -3 + Math.random() * 6,
      delay: i * 10,
    }
    if (firstPassDone) {
      if (boxed) {
        return {
          ...returnValues,
          zIndex: 1000,
        }
      } else if (ready) {
        return {
          ...returnValues,
          x: 0,
          y: 0,
        }
      } else {
        return {
          ...returnValues,
          x: 0,
          y: -1000,
        }
      }
    } else {
      if (boxed) {
        return {
          ...returnValues,
          y: -1000,
        }
      } else if (marked) {
        return {
          ...returnValues,
          x: 0,
          y: markedY,
          zIndex: maxZIndex - i,
        }
      } else {
        return {
          ...returnValues,
          x: 0,
          y: 0,
          zIndex: i
        }
      }
    }
  }
  const from = (_i) => ({ x: 0, rot: 0, scale: 1, y: -1000 })
  const trans = (r, s) =>
    `rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`;

  const transBoxes = () => "scale(1)";

  const [props, api] = useSprings(cardSet.length, i => ({
    ...to(i),
    from: from(i),
  }))

  function handleCheckboxChange() {
    setFirstPassDone(!firstPassDone);
    if (!firstPassDone) {
      for (let i = 0; i < cardSet.length; i++) {
        if (cardSet[i] === "reviewed" || cardSet[i] === "ready") {
          cardSet[i] = "deck";
        } else if (cardSet[i] === "marked") {
          cardSet[i] = "ready";
          const newMarked = new Set(markedSet);
          newMarked.delete(i);
          setMarkedSet(newMarked);
        }
      }
      const updatedBoxes = [...assignedBoxes];
      updatedBoxes[numCards] = "placeholder" + Math.random();
      setAssignedBoxes(updatedBoxes);
    } else {
      for (let i = 0; i < cardSet.length; i++) {
        if (cardSet[i] === "deck") {
          cardSet[i] = "ready";
        } else if (cardSet[i] === "ready" || cardSet[i] === "reviewed") {
          cardSet[i] = "marked";
          const newMarked = new Set(markedSet);
          newMarked.add(i);
          setMarkedSet(newMarked);
        }
      }
    }
  };

  useEffect(() => {
    api.start(i => {
      let _to = { ...to(i) };
      return _to;
    });

  }, [firstPassDone, api]);

  const getBoxPosition = boxIndex => {
    if (boxIndex === numCards) {
      return {
        bx: 0,
        by: 0,
      }
    }
    const box = boxRefs.current[boxIndex].current;

    return {
      bx: box.offsetLeft + boxAdjustX,
      by: box.offsetTop + boxAdjustY,
    }
  }

  const assignedBoxesFull = () => {
    for (let i = 0; i < numCards; i++) {
      if (!Number.isInteger(assignedBoxes[i])) {
        return false;
      }
    }
    return true;
  }

  const submitCards = (assignedBoxes) => {
    if (assignedBoxesFull()) {
      handleSelectCards(assignedBoxes);
    } else {
      alert(`You must select ${numCards} cards in order`);
    }
  }

  useEffect(() => {

    api.start(i => {
      const numReady = cardSet.filter(cardState => cardState === "ready").length;
      const boxIndex = assignedBoxes.findIndex(el => el === i);
      if (boxIndex !== -1) {

        if (boxIndex === numCards) {
          const updatedBoxes = [...assignedBoxes];
          updatedBoxes[numCards] = undefined;
          setAssignedBoxes(updatedBoxes);
        }

        const { bx, by } = getBoxPosition(boxIndex);

        return {
          x: bx,
          y: by,
          scale: 1,
          rot: 0,
          zIndex: boxIndex === numCards ? numReady + maxZIndex : 1000
        };
      }
      // Return to original position or other logic for cards not in a box
      return {
        // Existing properties for cards not in a box
      };
    });
  }, [assignedBoxes, api]);

  const moveCardsDown = (cardIndex, boxIndex, updatedBoxes) => {
    if (boxIndex > 4) {
      cardSet[cardIndex] = "ready";
      updatedBoxes[boxIndex] = cardIndex;
    } else {
      const existingCardIndex = updatedBoxes[boxIndex];
      updatedBoxes[boxIndex] = cardIndex;
      cardSet[cardIndex] = "box" + boxIndex;
      if (Number.isInteger(existingCardIndex)) {
        moveCardsDown(existingCardIndex, boxIndex + 1, updatedBoxes);
      }
    }
  }


  const bind = useDrag(({ args: [index], active, xy: [x, y], movement: [mx, my], offset: [ox, oy], direction: [xDir, yDir], velocity: [vx, vy] }) => {

    let cardState = cardSet[index];
    console.log({state: cardSet[index],mx, my});
    if (cardState === "ready") {
      if (my > 80 && !firstPassDone) {
        cardSet[index] = "readyToMarked";
      } else if (mx < -80) {
        cardSet[index] = "toReviewed";
      }
    } else if (cardState === "reviewed") {
      if (my > 60 && !firstPassDone) {
        cardSet[index] = "reviewedToMarked";
      } else if (mx > 80) {
        cardSet[index] = "toReady";
      }
    } else if (cardState === "marked") {
      if (my < -80 && !firstPassDone) {
        cardSet[index] = "markedToReady";
      } 
    }

    if (active) {
      let isHovering = false;
      const cardRect = {
        width: 90,
        height: 160,
        x: x,
        y: y,
      };
      boxRefs.current.forEach((ref, boxIndex) => {
        if (ref.current) {
          const box = ref.current;
          const boxRect = box.getBoundingClientRect();
          const xOffset = -85;
          const yOffest = -150;
          if (
            cardRect.x + xOffset < boxRect.right &&
            cardRect.x + xOffset + cardRect.width > boxRect.left &&
            cardRect.y + yOffest < boxRect.bottom &&
            cardRect.y + yOffest + cardRect.height > boxRect.top
          ) {
            // Card is over boxIndex
            setHoveredBox(boxIndex);
            isHovering = true;
          }
        }
      });
      if (!isHovering) setHoveredBox(null);
    }

    if (!active) {
      if (Number.isInteger(hoveredBox) && Number.isInteger(index)) {
        console.log({ hoveredBox, index });
        const updatedBoxes = [...assignedBoxes];
        const originalBoxIndex = updatedBoxes.findIndex(box => box === index);
        if (originalBoxIndex !== -1) {
          updatedBoxes[originalBoxIndex] = null;
        }
        const existingCardInex = updatedBoxes[hoveredBox];
        if (Number.isInteger(existingCardInex)) {
          moveCardsDown(existingCardInex, hoveredBox + 1, updatedBoxes);
        }
        updatedBoxes[hoveredBox] = index;
        setAssignedBoxes(updatedBoxes);
        cardSet[index] = "box" + hoveredBox;
      }
      setHoveredBox(null);
    }

    api.start(i => {
      if (index !== i) return // We're only interested in changing spring-data for the current spring
      cardState = cardSet[i]; //recalculate cardState after possible movingDown

      let newX = mx;
      let newY = my;
      let zIndex = 2000;
      const numReady = cardSet.filter(cardState => cardState === "ready").length;
      const numReviewed = cardSet.filter(cardState => cardState === "reviewed").length;
      const numMarked = cardSet.filter(cardState => cardState === "marked").length;

      switch (cardState) {
        case "ready":
          if (!active) {
            newX = 0;
            newY = 0;
            zIndex = numReady + maxZIndex;
          }
          break;
        case "toReviewed":
          if (!active) {
            newX = reviewedX;
            newY = 0;
            zIndex = numReviewed + maxZIndex;
            cardSet[i] = "reviewed";
          }
          break;
        case "reviewed":
          if (active) {
            newX = mx + reviewedX;
          } else {
            newX = reviewedX;
            newY = 0;
            zIndex = numReviewed + maxZIndex;
          }
          break;
        case "toReady":
          if (active) {
            newX = mx + reviewedX;
          } else {
            newX = 0;
            newY = 0;
            zIndex = numReady + maxZIndex;
            cardSet[i] = "ready";
          }
          break;
        default:
          break;
      }

      if (firstPassDone) {
        if (cardState.startsWith("box")) {
          const boxIndex = parseInt(cardState.charAt(3));
          const { bx, by } = getBoxPosition(boxIndex);
          if (active) {
            newX = mx + bx;
            newY = my + by;
          } else if (!Number.isInteger(hoveredBox)) {
            console.log({ y });
            newX = 0;
            newY = 0;
            zIndex = numReady + maxZIndex;
            cardSet[i] = "ready";
            const updatedBoxes = [...assignedBoxes];
            updatedBoxes[boxIndex] = null;
            setAssignedBoxes(updatedBoxes);
          }
        }
      } else {
        switch (cardState) {
          case "readyToMarked":
            if (!active) {
              newX = 0;
              newY = markedY;
              zIndex = numMarked + maxZIndex;
              cardSet[i] = "marked";
              const newSet = new Set(markedSet);
              newSet.add(i);
              setMarkedSet(newSet);
            }
            break;
          case "reviewedToMarked":
            if (active) {
              newX = mx + reviewedX;
            } else {
              newX = 0;
              newY = markedY;
              zIndex = numMarked + maxZIndex;
              cardSet[i] = "marked";
              const newSet = new Set(markedSet);
              newSet.add(i);
              setMarkedSet(newSet);
            }
            break;
          case "markedToReady":
            if (active) {
              newY = my + markedY;
            } else {
              newX = 0;
              newY = 0;
              zIndex = numReady + maxZIndex;
              cardSet[i] = "ready";
              const newSet = new Set(markedSet);
              newSet.delete(i);
              setMarkedSet(newSet);
            }
            break;
          case "marked":
            if (active) {
              newX = mx;
              newY = my + markedY;
            } else {
              newX = 0;
              newY = markedY;
              zIndex = numMarked + maxZIndex;
            }
            break;
          default:
            break;
        }
      }

      const scale = active ? 1.3 : 1 // Active cards lift up a bit
      return {
        x: newX,
        y: newY,
        zIndex,
        vx,
        vy,
        scale,
        delay: 0,
        config: { friction: 40, tension: 400, mass: 1 },
        immediate: key => key === 'zIndex' && active,
      }
    })
  })

  const boxes = (
    <div className='absolute bg-gray-800 bg-text-300 border-t border-gray-500 mt-2'>
      <div className="flex flex-wrap justify-center items-center mt-2 max-h-screen">
        {boxRefs.current.length > 0 && boxRefs.current.map((ref, i) => (
          <animated.div
            key={i}
            ref={ref}
            className={`box ${hoveredBox === i ? 'bg-gray-300 text-gray-800 border-solid shadow-[0_0_10px_10px_rgba(255,255,255,1)]' : 'text-gray-300 border-dashed'} 
          border-2 border-gray-300 p-6 m-1 rounded-lg flex items-center justify-center 
          text-2xl font-bold w-[100px] h-[140px] ${i > 2 ? 'mt-2' : ''}`}
            style={boxAnimation}
          >
            {i + 1}
          </animated.div>
        ))}
      </div>
      <div className='flex items-center mt-2'>
        <Button
          className="w-1/2 mx-4 mb-4 mt-2 bg-gray-800 border border-gray-300 text-gray-300"
          style={{ fontSize: '1rem' }}
          buttonType='secondary'
          onClick={handleCheckboxChange}>
          Back to Deck
        </Button>
        <Button
          style={{ fontSize: '1rem' }}
          className={`w-1/2 mx-4 mb-4 mt-2 ${assignedBoxesFull() ? 'bg-green-600 text-white' : 'bg-gray-500 text-gray-100'}`}
          disabled={!assignedBoxesFull()}
          onClick={() => submitCards(assignedBoxes)}>
          Submit Cards
        </Button>
      </div>
    </div>
  );

  const reviewPlaceholder = () => {
    return (
      <div
        style={{
          width: firstPassDone ? 118 : 150,
          height: firstPassDone ? 162 : 210,
        }}
        className='text-gray-100 border-dashed border-2 border-gray-100 rounded-lg'></div>
    )
  }

  const displayName = i => {
    const name = deck[i].name;
    if (!name) return;
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ").slice(1).join(" ");

    return (
      <div className={`text-white text-center bg-gray-800 opacity-90 w-full p-1 ${firstPassDone ? 'text-xs' : 'text-sm'} flex justify-center self-end`}>
        {firstName} <br></br> {lastName}
      </div>
    )
  }

  // console.log("Current marked set:", markedSet); // Log the state

  const numMarkedAndBoxed = () => {
    const count = [...cardSet].filter(c => c === 'marked' || c.startsWith("box")).length;
    return count;
  }

  return (
    <div className=''>
      <div className='text-gray-100 bg-gray-800 border-b border-gray-500 shadow py-2'>
        <div className={`relative flex items-center justify-evenly`}
          style={{
            height: firstPassDone ? '175px' : '230px'
          }}>
          {props.map(({ x, y, width, height, zIndex, rot, scale, flip, vx, vy }, i) => {
            let correctTrans = trans;
            let right = 18;
            if (firstPassDone) {
              right = 27;
              const boxIndex = assignedBoxes.findIndex(el => el === i);
              const cardPicked = boxIndex !== -1 && boxIndex < numCards;
              correctTrans = cardPicked ? transBoxes : trans;
              if (cardPicked) {
                width = 96;
                height = 136;
              } else {
                width = 110;
                height = 154;
              }
            }

            const boxed = cardSet[i].startsWith("box");

            return (
              <animated.div className='deck' key={i} style={{ right, x, y, zIndex }}>
                <animated.div
                  {...bind(i)}
                  className='rounded-lg'
                  style={{
                    display: 'flex',
                    zIndex,
                    width,
                    height,
                    transform: interpolate([rot, scale], correctTrans),
                    backgroundImage: `url(${deck[i].imageUrl})`,
                  }}
                >{!boxed && displayName(i)}</animated.div>
              </animated.div>
            );
          }
          )}
          {reviewPlaceholder()}
          <div className=''>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H7.5a.75.75 0 0 1 0-1.5h11.69l-3.22-3.22a.75.75 0 0 1 0-1.06Zm-7.94 9a.75.75 0 0 1 0 1.06l-3.22 3.22H16.5a.75.75 0 0 1 0 1.5H4.81l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </div>
          {reviewPlaceholder()}
        </div>
        {!firstPassDone && <div className='flex justify-around'>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3.97 3.97a.75.75 0 0 1 1.06 0l13.72 13.72V8.25a.75.75 0 0 1 1.5 0V19.5a.75.75 0 0 1-.75.75H8.25a.75.75 0 0 1 0-1.5h9.44L3.97 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v16.19l6.22-6.22a.75.75 0 1 1 1.06 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 1 1 1.06-1.06l6.22 6.22V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
          </svg>
        </div>}
        {firstPassDone && boxes}
      </div>

      {!firstPassDone && <div className='flex justify-evenly markedSection pb-6'>
        <div className='p-4 w-1/2 ml-2 mr-4'>
          <div className='markedInstructions text-gray-300 flex items-center justify-center text-xl pt-6'>
            Swipe {numCards} or more cards down to order
          </div>
          <Button
            onClick={handleCheckboxChange}
            disabled={numMarkedAndBoxed() < numCards}
            className='w-full mt-8'>Ready to Order</Button>
        </div>
        <div className='w-1/2 ml-5'>
          <div className='markedCards text-gray-300 border-dashed border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl font-bold'>
            First Pass Cards
          </div>
          <div className='relative text-xl text-gray-300 font-bold pt-2'>{numMarkedAndBoxed()} cards ready</div>
        </div>
      </div>}
    </div>
  )
}

export default Deck;
