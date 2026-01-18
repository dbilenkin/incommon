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
    """Check if word is a regular inflection of another word in the set."""
    # -s plural / 3rd person
    if word.endswith('s') and word[:-1] in all_words:
        return True
    # -es plural / 3rd person
    if word.endswith('es') and word[:-2] in all_words:
        return True
    # -ies (e.g., "carries" from "carry")
    if word.endswith('ies') and word[:-3] + 'y' in all_words:
        return True
    # -ed past tense (walked)
    if word.endswith('ed') and word[:-2] in all_words:
        return True
    # -ed past tense (timed -> time)
    if word.endswith('ed') and word[:-1] in all_words:
        return True
    # -ied (e.g., "carried" from "carry")
    if word.endswith('ied') and word[:-3] + 'y' in all_words:
        return True
    # -ing (walking)
    if word.endswith('ing') and word[:-3] in all_words:
        return True
    # -ing (biting -> bite)
    if word.endswith('ing') and word[:-3] + 'e' in all_words:
        return True
    # -er comparative (faster)
    if word.endswith('er') and word[:-2] in all_words:
        return True
    # -est superlative (fastest)
    if word.endswith('est') and word[:-3] in all_words:
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
