import names from './data/names.json';
import words from './data/words.json';
import * as Constants from '../constants';

const numWords = 5;
let deck = [];
let createdDeckType = "";
let allChosenWords = [];

export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1); 
}

export function generateShortId(id) {
  const shortIdLength = 4;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let shortId = '';
  for (let i = 0; i < shortIdLength; i++) {
    const letterIndex = Math.floor(Math.random() * letters.length);
    const randomLetter = letters[letterIndex];
    shortId += randomLetter;
  }

  return shortId;
}

export function createIndexDeck(deckLength) {
  const indexDeck = [];
  for (let i = 0; i < Constants.deckSize; i++) {
    let randomIndexFound = false;
    while (!randomIndexFound) {
      const randomTry = Math.floor(Math.random() * deckLength)
      if (!indexDeck.includes(randomTry)) {
        indexDeck.push(randomTry);
        randomIndexFound = true;
      }
    }
  }

  return indexDeck;
}

export function getIndexDeck(deckType) {

  let indexDeck;

  switch (deckType) {
    case "celebrities":
    case "actors":
    case "famousPeople":
      indexDeck = createIndexDeck(names[deckType].length);
      break;
    case "original":
      indexDeck = createIndexDeck(52);
      break;
    case "life":
      indexDeck = createIndexDeck(65);
      break;
    case "animals":
      indexDeck = createIndexDeck(62);
      break;
    default:
      break;
  }

  return indexDeck;
}

export function getDeck(_indexDeck, deckType) {

  // if (deckType === createdDeckType && deck.length > 0) return deck;
  createdDeckType = deckType;
  deck = [];
  switch (deckType) {
    case "celebrities":
    case "actors":
    case "famousPeople":
      for (let i = 0; i < Constants.deckSize; i++) {
        const randomI = _indexDeck[i];
        const name = names[deckType][randomI].name;
        const imageUrl = `decks/${deckType}/${names[deckType][randomI].imageUrl}`;
        deck.push({
          name,
          imageUrl
        });
      }
      break;
    case "original": // decks without names
    case "animals":
    case "life":
      for (let i = 0; i < Constants.deckSize; i++) {
        const randomI = _indexDeck[i];
        const imageName = `${deckType}-${randomI}.jpg`; // Construct the image name
        const imageUrl = `decks/${deckType}/${imageName}`; // Construct the image path
        deck.push({
          name: '',
          imageUrl
        });
      }
      break;
    default:
      break;
  }

  return deck;
}

export function getCardMatchScore(cardIndex1, cardIndex2) {
  return (10 - (cardIndex1 + cardIndex2)) * (10 - Math.abs(cardIndex1 - cardIndex2));
}

export function getCardScores(cards1, cards2) {
  let score = 0;
  for (let i = 0; i < cards1.length; i++) {
    const card = cards1[i];
    if (card === cards2[i]) {
      score += getCardMatchScore(i, i);
    } else if (cards2.indexOf(card) !== -1) {
      score += getCardMatchScore(i, cards2.indexOf(card));
    }
  }
  return score;
}

export function getOrdinal(i) {
  let j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) {
    return i + "st";
  }
  if (j === 2 && k !== 12) {
    return i + "nd";
  }
  if (j === 3 && k !== 13) {
    return i + "rd";
  }
  return i + "th";
}


export function displayGameLength(numRounds = 3) {
  const gameLengths = { 3: "Short", 5: "Medium", 10: "Long" };
  return gameLengths[numRounds];
}

export function displayFormattedDeckType(deckType = "life") {
  const deckTypes = { life: "Life", original: "Original", actors: "Actors", celebrities: "Celebrities", famousPeople: "Famous People", animals: "Animals", custom: "Custom" };
  return deckTypes[deckType];
}

export function displayWordSelection(wordSelection = "custom") {
  const wordSelectionOptions = { custom: "Custom", wordList: "Word List" };
  return wordSelectionOptions[wordSelection];
}

export function getRandomWords(deckType) {
  const randomWords = [];
  const allWords = words[deckType];
  for (let i = 0; i < numWords; i++) {
    let randomIndexFound = false;
    while (!randomIndexFound) {
      const randomTry = Math.floor(Math.random() * allWords.length)
      const randomWord = allWords[randomTry]
      if (!allChosenWords.includes(randomWord)) {
        randomWords.push(randomWord);
        allChosenWords.push(randomWord);
        randomIndexFound = true;
      }
    }
  }
  return randomWords;
}

export function getWordsOutOfWordsWords() {
  const randomWords = [];
  const allWords = words['life'];
  for (let i = 0; i < numWords; i++) {
    let randomIndexFound = false;
    while (!randomIndexFound) {
      const randomTry = Math.floor(Math.random() * allWords.length)
      const randomWord = allWords[randomTry]
      if (!allChosenWords.includes(randomWord)) {
        randomWords.push(randomWord);
        allChosenWords.push(randomWord);
        randomIndexFound = true;
      }
    }
  }
  return randomWords;
}

export function getContrastYIQ(hexcolor){
  hexcolor = hexcolor.replace("#", "");
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'rgb(31,41,55)' : 'rgb(243, 244, 246)';
}

// export const Constants.playerColors = ["#6f1926", "#de324c", "#f4895f", "#f8e16f", "#95cf92", "#369acc", "#9656a2", "#cbabd1"];

