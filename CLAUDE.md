# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Incommon is a multiplayer party game built with React and Firebase. Players join a game via a short code, and the host displays the game on a shared screen. The game has two modes:
- **Incommon**: Players rank cards from image decks (celebrities, actors, animals, etc.) based on a chosen word
- **Out of Words, Words**: A word-based game variant

## Commands

```bash
npm start          # Run development server (localhost:3000)
npm test           # Run tests in watch mode
npm run build      # Production build to build/
npm run deploy     # Build and deploy to GitHub Pages
npm run scrape     # Run IMDB scraper (src/utils/imdbScraper.js)
npm run setupGame  # Seed test data (requires test/serviceAccountKey.json)
npm run electron   # Run as Electron desktop app
```

Run a single test file:
```bash
npm test -- --testPathPattern="utils.test"
```

## Architecture

### Routing Structure
The app uses HashRouter with three main routes:
- `/` - StartPage: Create or join games
- `/host/:shortId` - Host view (displayed on shared screen)
- `/player/:shortId` - Player view (on individual devices)

### Game State Machine
Games progress through states stored in Firebase: `setup` → `buildDeck` → `started` → `ended`

Both host and player pages render different sub-pages based on `gameState`:
- Host: `HostSetupPage` → `HostBuildDeckPage` → `HostRoundPage`/`HostWordsRoundPage` → `HostEndPage`
- Player: `PlayerSetupPage` → `PlayerBuildDeckPage` → `PlayerRoundPage`/`PlayerWordsRoundPage` → `PlayerEndPage`

### Data Flow
- `CurrentGameContext` provides global state: `gameRef`, `currentPlayerName`, `currentPlayerId`, `cards`
- Firebase Firestore stores games in `games` collection with players in subcollection `games/{gameId}/players`
- Rounds stored in subcollection `games/{gameId}/rounds`

### Key Files
- `src/utils/index.js` - Core game logic: deck creation, scoring algorithms, utility functions
- `src/utils/Firebase.js` - Firebase initialization
- `src/constants/index.js` - Game constants (playerColors, deckSize)
- `src/utils/data/names.json` - Celebrity/actor name data
- `src/utils/data/words.json` - Word lists by deck type

### Deck Types
Decks are loaded from `public/decks/{deckType}/`:
- `celebrities`, `actors`, `famousPeople` - Use names.json for metadata
- `original`, `animals`, `life` - Image-only decks with pattern `{deckType}-{index}.jpg`

### Scoring
Card matching scores calculated in `getCardMatchScore(cardIndex1, cardIndex2)`:
```
score = (10 - (cardIndex1 + cardIndex2)) * (10 - Math.abs(cardIndex1 - cardIndex2))
```
Higher-ranked cards (lower index) matching at same positions yield maximum points.

## Tech Stack
- React 18 with Create React App
- Firebase Firestore for realtime game state
- Tailwind CSS for styling
- D3.js for player connection graphs
- react-dnd for card drag-and-drop
- react-spring for animations
