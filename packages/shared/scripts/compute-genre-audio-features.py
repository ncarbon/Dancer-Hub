#!/usr/bin/env python3
"""Reproduces the numbers in src/genreAudioFeatures.ts.

Downloads maharshipandya/spotify-tracks-dataset from Hugging Face and prints
the per-genre mean of danceability/energy/valence/tempo/acousticness, so the
hardcoded table can be regenerated or spot-checked.

Usage: python3 compute-genre-audio-features.py [genre ...]
       (with no args, prints every genre used in GENRE_AUDIO_FEATURES)
"""

import csv
import sys
import urllib.request
from collections import defaultdict

DATASET_URL = (
    "https://huggingface.co/datasets/maharshipandya/"
    "spotify-tracks-dataset/resolve/main/dataset.csv"
)
FIELDS = ["danceability", "energy", "valence", "tempo", "acousticness"]

DEFAULT_GENRES = [
    "salsa", "reggaeton", "samba", "tango", "latin", "latino", "disco",
    "funk", "house", "deep-house", "hip-hop", "pop", "r-n-b", "dancehall",
    "afrobeat", "classical", "new-age", "world-music",
]


def main() -> None:
    genres = set(sys.argv[1:]) or set(DEFAULT_GENRES)

    sums: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    counts: dict[str, int] = defaultdict(int)

    with urllib.request.urlopen(DATASET_URL) as resp:
        reader = csv.DictReader(line.decode("utf-8") for line in resp)
        for row in reader:
            genre = row["track_genre"]
            if genre not in genres:
                continue
            counts[genre] += 1
            for field in FIELDS:
                sums[genre][field] += float(row[field])

    for genre in sorted(genres):
        n = counts[genre]
        if n == 0:
            print(f"{genre}: not found in dataset")
            continue
        avgs = {field: round(sums[genre][field] / n, 3) for field in FIELDS}
        print(genre, avgs, f"n={n}")


if __name__ == "__main__":
    main()
