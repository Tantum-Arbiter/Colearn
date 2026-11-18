#!/usr/bin/env python3
"""Take the painted mouth off the sleeping sun and moon, so the app can draw it.

The sleeping faces (home-sun-sleeping.webp, home-moon-sleeping.webp) carry a
painted smile. The app now draws the mouth itself, as it draws the eyes, so it
can flatten while the face peeks at whoever tapped it and smile again after.
This script finds the smile (the one dark stroke in the lower middle of the
face), records where it sits and how it is drawn, and paints it out with the
face colour around it.

Outputs, under assets/images/ui-elements/:
  home-<body>-sleeping-mouthless.webp   the face with no mouth
  sleeping-faces.json                   per body: the mouth's ends, width, depth,
                                        stroke and ink, as fractions of the canvas

Usage:
    python3 scripts/prepare-sleeping-faces.py
"""

import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(ROOT, 'assets/images/ui-elements')
BODIES = ('sun', 'moon')

INK_LUMINANCE = 110
SOLID_ALPHA = 200
MOUTH_REGION = {'top': 0.55, 'bottom': 0.8, 'left': 0.35, 'right': 0.65}
CLEAR_MARGIN_PX = 6
FILL_REACH_PX = 14


def fail(message):
    print(f'prepare-sleeping-faces: {message}', file=sys.stderr)
    sys.exit(1)


def find_mouth(pixels):
    height, width = pixels.shape[:2]
    luminance = pixels[..., 0] * 0.3 + pixels[..., 1] * 0.59 + pixels[..., 2] * 0.11
    ys, xs = np.mgrid[0:height, 0:width]
    region = (
        (ys > height * MOUTH_REGION['top'])
        & (ys < height * MOUTH_REGION['bottom'])
        & (xs > width * MOUTH_REGION['left'])
        & (xs < width * MOUTH_REGION['right'])
    )
    ink = (luminance < INK_LUMINANCE) & (pixels[..., 3] > SOLID_ALPHA) & region
    labels, count = ndimage.label(ink)
    if count == 0:
        fail('no mouth found')
    sizes = ndimage.sum(ink, labels, range(1, count + 1))
    return labels == int(np.argmax(sizes)) + 1


def measure(mouth):
    ys, xs = np.where(mouth)
    left, right = int(xs.min()), int(xs.max())
    columns = [ys[xs == x] for x in range(left, right + 1)]
    stroke = float(np.median([column.max() - column.min() + 1 for column in columns if column.size]))
    ends_y = float(np.mean([columns[2].mean(), columns[-3].mean()]))
    centre = (left + right) / 2
    centre_y = float(ys[np.abs(xs - centre) < 3].mean())
    return {'left': left, 'right': right, 'endsY': ends_y, 'centreY': centre_y, 'stroke': stroke}


def paint_out(pixels, mouth):
    mask = ndimage.binary_dilation(mouth, iterations=CLEAR_MARGIN_PX)
    valid = (~mask) & (pixels[..., 3] > SOLID_ALPHA)
    kernel = np.ones((2 * FILL_REACH_PX + 1, 2 * FILL_REACH_PX + 1))
    weight = ndimage.convolve(valid.astype(float), kernel, mode='nearest')
    filled = pixels.astype(float).copy()
    for channel in range(3):
        total = ndimage.convolve(np.where(valid, pixels[..., channel], 0).astype(float), kernel, mode='nearest')
        filled[..., channel] = np.where(mask, total / np.maximum(weight, 1), pixels[..., channel])
    return filled.round().clip(0, 255).astype(np.uint8)


def main():
    faces = {}
    for body in BODIES:
        source = Image.open(os.path.join(ART_DIR, f'home-{body}-sleeping.webp')).convert('RGBA')
        pixels = np.array(source)
        size = pixels.shape[0]
        if pixels.shape[0] != pixels.shape[1]:
            fail(f'expected a square {body}, got {pixels.shape[1]}x{pixels.shape[0]}')
        mouth = find_mouth(pixels)
        found = measure(mouth)
        ink = pixels[mouth][:, :3].mean(axis=0).round().astype(int)
        cleared = paint_out(pixels, mouth)
        if find_mouth_or_none(cleared) is not None:
            fail(f'the {body} still has a mouth after painting it out')
        Image.fromarray(cleared, 'RGBA').save(os.path.join(ART_DIR, f'home-{body}-sleeping-mouthless.webp'), quality=92, method=6)
        faces[body] = {
            'mouth': {
                'x': round((found['left'] + found['right'] + 1) / 2 / size, 5),
                'y': round(found['endsY'] / size, 5),
                'width': round((found['right'] - found['left'] + 1) / size, 5),
                'depth': round((found['centreY'] - found['endsY']) / size, 5),
                'stroke': round(found['stroke'] / size, 5),
            },
            'ink': '#%02X%02X%02X' % tuple(ink),
        }
        print(f"{body:5s} mouth {faces[body]['mouth']} ink {faces[body]['ink']}")

    with open(os.path.join(ART_DIR, 'sleeping-faces.json'), 'w') as handle:
        json.dump(faces, handle, indent=2)
        handle.write('\n')


def find_mouth_or_none(pixels):
    height, width = pixels.shape[:2]
    luminance = pixels[..., 0] * 0.3 + pixels[..., 1] * 0.59 + pixels[..., 2] * 0.11
    ys, xs = np.mgrid[0:height, 0:width]
    region = (
        (ys > height * MOUTH_REGION['top'])
        & (ys < height * MOUTH_REGION['bottom'])
        & (xs > width * MOUTH_REGION['left'])
        & (xs < width * MOUTH_REGION['right'])
    )
    ink = (luminance < INK_LUMINANCE) & (pixels[..., 3] > SOLID_ALPHA) & region
    return True if ink.sum() > 20 else None


if __name__ == '__main__':
    main()
