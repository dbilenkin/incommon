#!/usr/bin/env python3
"""
Build word game wordlist that keeps irregular forms but filters regular inflections.
"""

import re

def parse_lemma_file(input_file):
    """Extract all words (lemmas + inflections) from 2+2+3lem.txt"""
    all_words = set()

    with open(input_file, 'r') as f:
        for line in f:
            if not line.strip():
                continue

            if not line[0].isspace():
                # Headword line - extract first word
                word = line.split()[0].strip().rstrip('!')
                if word.isalpha():
                    all_words.add(word.lower())
            else:
                # Inflection line - parse comma-separated words
                # Remove annotations like "-> [word]"
                clean_line = re.sub(r'->\s*\[[^\]]+\]', '', line)
                parts = clean_line.split(',')
                for part in parts:
                    word = part.strip().split()[0] if part.strip() else ''
                    word = word.rstrip('!')
                    if word and word.isalpha():
                        all_words.add(word.lower())

    return all_words

def is_regular_inflection(word, all_words):
    """Check if word is a regular inflection of another word in the set.

    Uses minimum base length requirements to avoid false positives like:
    - "ring" being filtered as inflection of "re" (ring -> r + ing + e)
    - "need" being filtered as inflection of "nee" (need -> nee + d)
    - "wing" being filtered as inflection of "we" (wing -> w + ing + e)
    """

    # -s plural / 3rd person (cats -> cat)
    # Min base length 2 to avoid issues with very short words
    base = word[:-1]
    if word.endswith('s') and len(base) >= 2 and base in all_words:
        return True

    # -es plural / 3rd person (boxes -> box)
    base = word[:-2]
    if word.endswith('es') and len(base) >= 2 and base in all_words:
        return True

    # -ies (carries -> carry)
    base = word[:-3] + 'y'
    if word.endswith('ies') and len(base) >= 3 and base in all_words:
        return True

    # -ed past tense (walked -> walk)
    # Min base length 3 to avoid "wed" -> "w" type issues
    base = word[:-2]
    if word.endswith('ed') and len(base) >= 3 and base in all_words:
        return True

    # -ed past tense where base ends in 'e' (timed -> time)
    # Min base length 4 to avoid "need" -> "nee", "feed" -> "fee", "reed" -> "ree"
    base = word[:-1]
    if word.endswith('ed') and len(base) >= 4 and base in all_words:
        return True

    # -ied (carried -> carry)
    base = word[:-3] + 'y'
    if word.endswith('ied') and len(base) >= 3 and base in all_words:
        return True

    # -ing (walking -> walk)
    # Min base length 3 to avoid short word issues
    base = word[:-3]
    if word.endswith('ing') and len(base) >= 3 and base in all_words:
        return True

    # -ing where base ends in 'e' (biting -> bite)
    # Min base length 4 to avoid "ring" -> "re", "sing" -> "se", "wing" -> "we"
    base = word[:-3] + 'e'
    if word.endswith('ing') and len(base) >= 4 and base in all_words:
        return True

    # -er comparative (faster -> fast)
    # Min base length 3 to avoid short word issues
    base = word[:-2]
    if word.endswith('er') and len(base) >= 3 and base in all_words:
        return True

    # -est superlative (fastest -> fast)
    # Min base length 3
    base = word[:-3]
    if word.endswith('est') and len(base) >= 3 and base in all_words:
        return True

    return False

def build_wordlist(input_file, output_file):
    all_words = parse_lemma_file(input_file)
    print(f"Total words parsed: {len(all_words)}")

    # Filter out regular inflections
    valid_words = {w for w in all_words if not is_regular_inflection(w, all_words)}
    print(f"After filtering regular inflections: {len(valid_words)}")

    # Write sorted output
    with open(output_file, 'w') as f:
        for word in sorted(valid_words):
            f.write(word + '\n')

    print(f"Saved to {output_file}")

if __name__ == '__main__':
    build_wordlist('/tmp/2+2+3lem.txt', 'public/words/valid_words.txt')
