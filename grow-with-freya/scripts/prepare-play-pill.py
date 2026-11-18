#!/usr/bin/env python3
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'play-pill'
WIDTH = 1000


def main() -> None:
    parser = argparse.ArgumentParser(description='Make the story reader Play button picture from the operator art in play-pill/source.')
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    pill = Image.open(ROOT / 'source' / 'play-pill.webp').convert('RGBA')
    height = round(pill.height * WIDTH / pill.width)
    pill.convert('RGBa').resize((WIDTH, height), Image.LANCZOS).convert('RGBA').save(args.out / 'play-pill.webp', quality=92, method=6)


if __name__ == '__main__':
    main()
