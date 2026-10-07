#!/usr/bin/env python3
"""Cut the island illustration for the home screen's Your Learning Journey card.

The card was redrawn to the operator's mock (2026-10-03), stored untouched as
assets/images/home-journey/journey-card-mock.webp: a screenshot of the whole
home screen, with the card's island illustration on its right half. There is
no separate file of that illustration, so it is cut from the mock here:

  journey-island.webp   the card's right-hand part, from a little way into the
                        island's forest to the card's inner edge, with the
                        mock's own words painted out of it and its left edge
                        faded softly to nothing, so it lies over the card's
                        fill without a seam. It was cut wider at first; the
                        operator's third mock (2026-10-04) runs the step
                        tokens up to the island's edge, so it now starts
                        further right and fades over a wider band

The mock is small (the card is 608 pixels wide in it), so the cut is enlarged
twice over and sharpened a little; it is still softer than a drawing made at
size would be. If the operator supplies the illustration itself, put it in
place of the cut and drop this script.

How the words are painted out: inside the two boxes where the mock's text
runs over the cut (the end of the eyebrow and the end of the line under the
title), anything much paler than the blue round it is replaced by a blur of
that blue. The island does not reach into either box.

Usage:
    python3 scripts/prepare-journey-art.py [--debug <dir>]
"""

import argparse
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(APP_ROOT, 'assets', 'images', 'home-journey')
MOCK = os.path.join(ART_DIR, 'journey-card-mock.webp')
CUT = os.path.join(ART_DIR, 'journey-island.webp')

CARD = (68, 110, 676, 352)
INSIDE = 3
CUT_LEFT = 362
FADE = (362, 420)
WORDS = [(296, 130, 384, 156), (296, 196, 341, 228)]
WORD_PALER_BY = 70
ENLARGE = 2
WEBP_QUALITY = 92


def painted_out(pixels):
    cleaned = pixels.copy()
    for left, top, right, bottom in WORDS:
        patch = cleaned[top:bottom, left:right]
        ground = np.median(patch.reshape(-1, 3), axis=0)
        pale = (patch - ground).sum(axis=2) > WORD_PALER_BY
        pale = ndimage.binary_dilation(pale, iterations=2)
        known = (~pale).astype(np.float32)
        weight = np.zeros(pale.shape, dtype=np.float32)
        total = np.zeros_like(patch)
        for sigma in (2, 4, 8, 16):
            favour = sigma ** -2.0
            weight += favour * ndimage.gaussian_filter(known, sigma)
            for channel in range(3):
                total[..., channel] += favour * ndimage.gaussian_filter(patch[..., channel] * known, sigma)
        blurred = total / np.maximum(weight, 1e-6)[..., None]
        cleaned[top:bottom, left:right] = np.where(pale[..., None], blurred, patch)
    return cleaned


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug')
    arguments = parser.parse_args()

    pixels = painted_out(np.asarray(Image.open(MOCK).convert('RGB')).astype(np.float32))
    left, top, right, bottom = CUT_LEFT, CARD[1] + INSIDE, CARD[2] - INSIDE, CARD[3] - INSIDE
    columns = np.arange(left, right, dtype=np.float32)
    along = np.clip((columns - FADE[0]) / (FADE[1] - FADE[0]), 0, 1)
    alpha = along * along * (3 - 2 * along)

    cut = np.dstack([pixels[top:bottom, left:right], np.broadcast_to(alpha * 255, (bottom - top, right - left))])
    image = Image.fromarray(np.clip(cut, 0, 255).astype(np.uint8), 'RGBA')
    image = image.resize((image.width * ENLARGE, image.height * ENLARGE), Image.LANCZOS)
    red, green, blue, see_through = image.split()
    sharp = Image.merge('RGB', (red, green, blue)).filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    image = Image.merge('RGBA', (*sharp.split(), see_through))
    image.save(CUT, 'WEBP', quality=WEBP_QUALITY, method=6)
    print(f'journey-island.webp {image.width}x{image.height}, aspect {image.width / image.height:.4f}')
    print(f'in the mock the cut is {(right - left) / (CARD[2] - CARD[0]):.4f} of the card wide')

    if arguments.debug:
        os.makedirs(arguments.debug, exist_ok=True)
        ground = Image.new('RGBA', image.size, (1, 36, 122, 255))
        Image.alpha_composite(ground, image).convert('RGB').save(os.path.join(arguments.debug, 'journey-island-on-fill.png'))


if __name__ == '__main__':
    main()
