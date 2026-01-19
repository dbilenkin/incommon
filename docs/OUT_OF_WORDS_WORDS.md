# Out of Words, Words - Complete Game Documentation

## Overview

**Out of Words, Words** is a multiplayer word-finding party game where players compete to find as many words as possible from the letters of a given word. It's one of two game modes in the Incommon app (the other being the card-ranking "Incommon" mode).

The game is designed to be played with a shared screen (host view) and individual player devices.

---

## How to Play

### Game Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Setup     │ -> │   Round     │ -> │   Reveal    │ -> │  End Game   │
│  (Lobby)    │    │  (Playing)  │    │  (Scoring)  │    │  (Awards)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          ↑                  │
                          └──────────────────┘
                            (Next Round)
```

### 1. Setup Phase

1. One player creates a game and receives a 4-letter **Game Code**
2. Other players join using the code
3. The **first player to join** becomes the game leader and can:
   - Configure game settings
   - Start the game
   - Control round flow

### 2. Round Phase

Each round:
1. The **round chooser** (rotates each round) selects a main word from 5 options:
   - One 7-letter word
   - One 8-letter word
   - One 9-letter word
   - Two random length words
   - Or type a custom word (minimum 6 letters)

2. All players then have the set time (or unlimited in untimed mode) to find words:
   - Words must be at least the **minimum word length** (configurable: 3, 4, or 5)
   - Words must use only letters from the main word
   - Each letter can only be used once per word (based on availability in main word)
   - The original word itself cannot be submitted
   - Words must be valid English words (validated against a 44,000-word dictionary)

3. In **timed mode**: Round ends when timer expires
4. In **untimed mode**: First player can end the round manually

### 3. Reveal Phase

After time's up:
1. First player controls the reveal by tapping "Next"
2. Players are sorted by word count (most words first)
3. Each word is revealed one at a time
4. Words are scored and points awarded to all players who found that word
5. Duplicate words (found by everyone) score 0 points
6. After all words revealed, shows:
   - **Leaderboard** for the round
   - **Missed Words** - valid words nobody found (5+ letters)

### 4. End Game

After final round:
- **Winner announcement** with trophy
- **Final standings** with medals (gold, silver, bronze)
- **Awards** - special achievements (see Awards section)
- **Personal stats** - your words, rank, unique finds
- **Game stats** - rounds played, total words, longest words

---

## Game Settings

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Mode** | Timed / Untimed | Timed | Whether rounds have a time limit |
| **Game Time** | 1, 2, 3, 5 minutes | 2 min | Round duration (timed mode only) |
| **Minimum Word Length** | 3, 4, 5 letters | 4 | Shortest valid word length |
| **Number of Rounds** | 1-10 | # of players | How many rounds to play |

---

## Scoring System

### Formula

```
Points = (Word Length - Minimum Word Length + 1) × Players Without Word
```

### How It Works

- Longer words are worth more points
- Words that fewer people found are worth more
- If everyone found a word, it scores **0 points** (crossed out)

### Example

With 4 players and minimum word length = 3:

| Word | Length | Players Who Found | Points Per Player |
|------|--------|-------------------|-------------------|
| CAT | 3 | All 4 | (3-3+1) × 0 = **0** |
| RATE | 4 | 3 players | (4-3+1) × 1 = **2** |
| STEAM | 5 | 2 players | (5-3+1) × 2 = **6** |
| MASTER | 6 | 1 player | (6-3+1) × 3 = **12** |
| HAMSTER | 7 | 1 player | (7-3+1) × 3 = **15** |

---

## Awards

At the end of the game, awards are dynamically selected to ensure every player wins at least one (when possible). The system picks 4-6 awards from this pool:

### Performance Awards

| Award | Emoji | Criteria |
|-------|-------|----------|
| **Word Wizard** | 📚 | Most total words found across all rounds |
| **Big Word Energy** | 🧠 | Found the longest word in the game |
| **Hot Streak** | 🔥 | Most words found in a single round |
| **Unique Mind** | 💎 | Most words that only you found |
| **Basic** | 🎯 | Most words that everyone found (obvious choices) |

### Word-Based Awards

| Award | Emoji | Criteria |
|-------|-------|----------|
| **Vowel Movement** | 🅰️ | Found the word with highest vowel percentage |
| **Consonant Queen** | 🦴 | Found the word with most consecutive consonants |
| **Alphabet Soup** | 🔤 | Used the most unique letters across all words |

### Social Awards

| Award | Emoji | Criteria |
|-------|-------|----------|
| **Photo Finish** | 📸 | Closest final score to another player |
| **Hive Mind** | 🐝 | Most word overlap with one specific other player |
| **Lone Wolf** | 🐺 | Least average overlap with other players |

### Progression Awards

| Award | Emoji | Criteria |
|-------|-------|----------|
| **Steady Eddie** | 📊 | Most consistent scores across rounds (lowest variance) |
| **Comeback Kid** | 🐢 | Biggest improvement from worst to best round |
| **Sleeper Hit** | 😴 | Started with lowest round 1 score, improved most |

### Award Selection Algorithm

1. All eligible awards are calculated
2. Awards are shuffled randomly
3. First pass: ensure each player gets at least one award
4. Second pass: fill remaining slots (up to 6 total) with random awards
5. Awards are displayed in a consistent order

---

## User Interface

### Player View (Mobile)

#### During Round
- **Header**: Round number and main word
- **Timer bar**: Visual countdown (timed mode)
- **Letter grid**: Tap letters to build words (split into 2 rows)
- **Current word display**: Shows word being built
- **Delete/Enter buttons**: Remove letters or submit word
- **Scramble button**: Randomize letter positions
- **Found words grid**: Shows all words you've found

#### During Reveal
- **Current word panel**: Shows word being revealed with points
- **Players who found it**: Badges showing who had this word
- **Your words list**: Your words with scores as revealed
- **Leaderboard**: Final scores after reveal complete

### Host View (Shared Screen)

- **Game code** displayed prominently
- **Current word** being played
- **Player cards** in a grid showing:
  - Player name
  - Word count and score
  - All found words (blurred until revealed)
  - Highlighted during their reveal turn

---

## Technical Details

### Data Structure

```javascript
// Game document (Firestore: games/{gameId})
{
  shortId: "ABCD",           // 4-letter join code
  gameType: "Out of Words, Words",
  gameState: "setup" | "started" | "ended",
  currentRound: 1,
  minWordLength: 4,
  gameTime: 2,               // minutes
  numRounds: 4,
  untimed: false
}

// Round document (Firestore: games/{gameId}/rounds/{roundId})
{
  roundNumber: 1,
  word: "HAMSTER",           // main word for this round
  wordsRevealed: false,
  roundEnded: false,
  revealComplete: false,
  globallyRevealedWords: {
    "STEAM": { points: 6, revealedBy: "Alice" },
    "RATE": { points: 2, revealedBy: "Bob" }
  },
  playerScores: {
    "playerId1": 45,
    "playerId2": 32
  },
  revealState: {
    currentPlayerIndex: 0,
    currentWordIndex: 3,
    currentWord: "MASTER"
  },
  players: [...]             // snapshot of players for this round
}

// Player document (Firestore: games/{gameId}/players/{playerId})
{
  name: "Alice",
  gameScore: 145,            // cumulative across rounds
  foundWords: ["STEAM", "RATE", "MASTER"]
}
```

### Word Validation

- Valid words loaded from `public/words/valid_words.txt`
- Contains ~44,000 English words
- Validation checks:
  1. Word meets minimum length
  2. Word is not the original word
  3. Word not already found by this player
  4. Word exists in dictionary
  5. Word can be formed from available letters

### Main Word Selection

Words for round selection come from `src/utils/data/words.json` under the `outofwords` key:
- Pool of 7, 8, and 9 letter words
- Each round offers one of each length plus 2 random
- Previously used words are tracked to avoid repeats
- Custom words must be at least 6 letters

---

## Celebrations & Animations

Special animations trigger for longer words during reveal:

| Word Length | Animation | Celebration |
|-------------|-----------|-------------|
| 7+ letters | Scale 1.8x + shake | 🔥 "INCREDIBLE!!!" |
| 6 letters | Scale 1.6x + wobble | ⭐ "Amazing!" |
| 5 letters | Scale 1.4x + pop | ✨ "nice" |
| 4 or less | Scale 1.2x | (none) |

Words worth 0 points (everyone had them) show with strikethrough in red.

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/pages/player/PlayerWordsRoundPage.js` | Main player gameplay & reveal logic |
| `src/pages/player/PlayerWordsEndPage.js` | End game screen & awards |
| `src/pages/host/HostWordsRoundPage.js` | Host display during rounds |
| `src/components/OutOfWordsWords.js` | Word input UI component |
| `src/components/WordAndScore.js` | Animated word display |
| `src/components/TimerBar.js` | Countdown timer visualization |
| `src/utils/index.js` | `getWordsOutOfWordsWords()` for word selection |
| `public/words/valid_words.txt` | Dictionary for word validation |
| `src/utils/data/words.json` | Main word pool (under `outofwords` key) |

---

## Tips for Players

1. **Start with longer words** - They're worth more points
2. **Think unique** - Common words everyone finds score 0
3. **Use the scramble button** - Fresh letter arrangements spark new ideas
4. **Don't ignore short words** - If they're unique, they still score
5. **Check letter counts** - Double letters in the main word = you can use them twice
