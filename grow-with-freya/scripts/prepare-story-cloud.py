#!/usr/bin/env python3
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'story-cloud'
CLOUDS = {
    'stories': [0, 430, 880, 1120, 1570, 2000],
    'music': [0, 430, 880, 1120, 1550, 2000],
}
NAMES = ['left', 'stretch-left', 'crown', 'stretch-right', 'right']


def main() -> None:
    parser = argparse.ArgumentParser(description='Cut each story text cloud into its five pieces from the operator art in story-cloud/source.')
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    for theme, cuts in CLOUDS.items():
        cloud = Image.open(ROOT / 'source' / f'{theme}.webp').convert('RGBA')
        for name, start, end in zip(NAMES, cuts, cuts[1:]):
            cloud.crop((start, 0, end, cloud.height)).save(args.out / f'{theme}-{name}.webp', quality=92, method=6)


if __name__ == '__main__':
    main()
