#!/usr/bin/env python3
"""
Extract headwords from 2+2+3lem.txt
Headwords are lines that don't start with whitespace.
These are base forms - no plurals, no -ing, no -ed endings.
"""

import sys

def extract_headwords(input_file, output_file):
    headwords = []
    with open(input_file, 'r') as f:
        for line in f:
            # Skip empty lines
            if not line.strip():
                continue
            # Headwords don't start with whitespace
            if not line[0].isspace():
                # Extract just the first word (before any spaces, arrows, or annotations)
                # e.g., "bit -> [bite]" should extract just "bit"
                word = line.split()[0].strip()
                # Remove any trailing markers like "!"
                word = word.rstrip('!')
                if word.isalpha():
                    headwords.append(word.lower())

    # Write unique sorted headwords
    unique_headwords = sorted(set(headwords))
    with open(output_file, 'w') as f:
        for word in unique_headwords:
            f.write(word + '\n')

    print(f"Extracted {len(unique_headwords)} headwords to {output_file}")

if __name__ == '__main__':
    input_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/2+2+3lem.txt'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'public/words/base_words.txt'
    extract_headwords(input_file, output_file)
