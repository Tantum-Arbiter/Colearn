#!/usr/bin/env python3
"""Normalise the instrument medallions and export them as app assets.

Each source is a finished medallion: the night-sky disc with its gold rim and the
instrument already painted on it. Two things need fixing before they ship.

1. The glowing disc sits at a slightly different scale in every frame (measured
   0.952-0.978 of frame width). At a fixed render size that makes the carousel
   breathe as it rotates, so each disc is rescaled about its own centre until the
   opaque rim occupies DISC_FRACTION of the output frame.

2. A source may arrive flattened onto black with no alpha. Its transparency is
   rebuilt from brightness and then clipped by a reference medallion's alpha, so
   the outer glow fades the same way as the others rather than ending in a hard
   black fringe.

Usage:
    python3 scripts/prepare-instrument-medallions.py --src <dir>

--src must contain one file per mapping entry below.
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image

OUTPUT_SIZE = 512
DISC_FRACTION = 0.90
OPAQUE_THRESHOLD = 230

# Rebuilding alpha for a source flattened onto black.
BLACK_FLOOR = 4
BLACK_RAMP = 30

# source filename -> instrument id in services/music-asset-registry.ts
MEDALLION_MAPPING = {
    'n_01.webp': 'trumpet',
    'n_02.webp': 'recorder',
    'n_03.webp': 'clarinet',
    'n_04.webp': 'saxophone',
    'n_05.webp': 'ocarina',
    'n_06.webp': 'flute',
}

# Supplies the glow falloff for any source that arrives without alpha.
ALPHA_REFERENCE = 'n_06.webp'


def has_alpha(image):
    return image.mode == 'RGBA' and image.split()[-1].getextrema()[0] < 255


def rebuild_alpha(image, reference):
    """Recover transparency for artwork flattened onto a black background."""
    rgb = np.asarray(image.convert('RGB')).astype(np.float32)
    brightness = np.clip((rgb.max(axis=-1) - BLACK_FLOOR) / BLACK_RAMP, 0, 1)

    reference_alpha = np.asarray(
        reference.split()[-1].resize(image.size, Image.LANCZOS)
    ).astype(np.float32) / 255.0

    alpha = np.minimum(brightness, reference_alpha)
    return Image.fromarray(
        np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')


def disc_bounds(image):
    alpha = image.split()[-1]
    mask = alpha.point(lambda v: 255 if v > OPAQUE_THRESHOLD else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError('no opaque disc found')
    left, top, right, bottom = box
    return (left + right) / 2, (top + bottom) / 2, max(right - left, bottom - top)


def normalise(image):
    centre_x, centre_y, diameter = disc_bounds(image)
    scale = (OUTPUT_SIZE * DISC_FRACTION) / diameter
    scaled = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.LANCZOS,
    )
    canvas = Image.new('RGBA', (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    canvas.paste(
        scaled,
        (
            round(OUTPUT_SIZE / 2 - centre_x * scale),
            round(OUTPUT_SIZE / 2 - centre_y * scale),
        ),
    )
    return canvas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--src', required=True)
    parser.add_argument('--out', default='assets/music/instruments/medallions')
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    reference_path = os.path.join(args.src, ALPHA_REFERENCE)
    if not os.path.exists(reference_path):
        sys.exit(f'missing alpha reference: {reference_path}')
    reference = Image.open(reference_path).convert('RGBA')

    for filename, instrument_id in MEDALLION_MAPPING.items():
        source_path = os.path.join(args.src, filename)
        if not os.path.exists(source_path):
            sys.exit(f'missing source: {source_path}')

        source = Image.open(source_path)
        rebuilt = not has_alpha(source)
        source = rebuild_alpha(source, reference) if rebuilt else source.convert('RGBA')

        before = disc_bounds(source)[2] / source.width
        result = normalise(source)
        after = disc_bounds(result)[2] / OUTPUT_SIZE

        target_path = os.path.join(args.out, f'{instrument_id}.webp')
        result.save(target_path, 'WEBP', quality=92, method=6, lossless=False)
        print(
            f'{filename} -> {target_path}  '
            f'disc {before:.3f} -> {after:.3f}  '
            f'{"alpha rebuilt  " if rebuilt else ""}'
            f'{os.path.getsize(target_path) // 1024} KB'
        )


if __name__ == '__main__':
    main()
