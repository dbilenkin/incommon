import { generateShortId, getDeck, getCardMatchScore } from './utils';
import actorData from './data.json';

describe('Utility Functions', () => {
  describe('generateShortId', () => {
    it('should generate a short ID from a given ID', () => {
      const id = 'abcdef123456';
      const shortId = generateShortId(id);
      expect(shortId).toBe('ABCD');
    });
  });

  describe('getDeck', () => {
    it('should return an actors deck when deckType is "actors"', () => {
      const deck = getDeck('actors');
      expect(deck).toEqual(actorData.filter((_, i) => i < 52).map(element => element.imageUrl));
    });

    it('should return a default deck for other deckTypes', () => {
      const deckType = 'standard';
      const deck = getDeck(deckType);
      for (let i = 0; i < 52; i++) {
        expect(deck[i]).toBe(`decks/${deckType}/${deckType}-${51 - i}.jpg`);
      }
    });
  });

  describe('getCardMatchScore', () => {
    it('should calculate the correct match score', () => {
      for (let i = 0; i < 5; i++) {
        for (let j = i; j < 5; j++) {
          const score = getCardMatchScore(i, j);
          // console.log(`${i}, ${j}: ${score}`)
        }
      }
      const score = getCardMatchScore(0, 1);
      expect(score).toBe((10 - (0 + 1)) * (10 - Math.abs(0 - 1)));
    });
  });
});
