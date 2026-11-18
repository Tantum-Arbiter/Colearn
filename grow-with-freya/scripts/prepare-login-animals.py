#!/usr/bin/env python3
"""Cut the login hero painting into layers the app can sway.

The hero (assets/images/login/hero-animals.webp) is one painting: a bear, a
bunny and a fox behind an open book, under a dome of stars, with mist at their
feet. The app sways each animal on its own, which needs each animal on its own
layer, the dome whole behind them and the book in front. This script seeds a
random walk over the painting's colours to tell the six regions apart, cuts
each animal two pixels outside its outline (so it carries its whole painted
contour), gives the bunny its glow as well (a halo ring that fades out over
32 px and travels with it, the stars in the ring left behind in the sky, since
its long ears lean far over that glow and the glow's edge, left behind, read as
a doubled ear), fills the dome where the animals were from the colours beyond
that contour (a pyramid fill blurred well inside the hole, so at rest the stack
is the painting and a lean shows only the glow going on), gives the book
everything below its top edge (the glowing spine included), and records where
everything sat.

Outputs, under assets/images/login/:
  hero-backdrop.webp            the dome, stars, book and mist with no animals
  hero-foreground.webp          the book and the mist, to draw over the animals
  hero-<animal>.webp            each animal on its own
  hero-animals.json             the canvas and each layer's frame, as fractions
and constants/login-hero-art.ts, the module the app requires the layers from.

Usage:
    python3 scripts/prepare-login-animals.py [--debug <dir>]

With --debug, the label map, the layers on green and the re-stacked scene are
written to <dir> for checking.
"""

import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.color import rgb2lab
from skimage.segmentation import random_walker

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(ROOT, 'assets/images/login')
ART_MODULE = os.path.join(ROOT, 'constants/login-hero-art.ts')
SOURCE = 'hero-animals.webp'
CANVAS = (900, 596)

DOME, BEAR, BUNNY, FOX, BOOK, MIST = 1, 2, 3, 4, 5, 6
ANIMALS = {BEAR: 'bear', BUNNY: 'bunny', FOX: 'fox'}
SEEDS = {
    DOME: [(150, 70), (450, 30), (700, 60), (340, 150), (585, 230), (80, 300), (840, 320), (330, 300), (575, 330)],
    BEAR: [(200, 300), (120, 250), (150, 430), (230, 200), (300, 260), (140, 180), (150, 480)],
    BUNNY: [(450, 380), (450, 230), (395, 120), (505, 120), (400, 320), (510, 330), (450, 420), (380, 100), (372, 135), (412, 70), (520, 95), (530, 135), (495, 65)],
    FOX: [(720, 400), (710, 250), (630, 160), (790, 170), (770, 300), (680, 300), (770, 460)],
    BOOK: [(300, 470), (600, 470), (450, 520), (250, 440), (650, 440), (450, 540), (450, 495)],
    MIST: [(450, 575), (100, 565), (800, 565), (60, 530), (850, 520), (450, 590)],
}
SEED_RADIUS = 4
WALK_BETA = 60

SOLID_ALPHA = 200
LAYER_MARGIN_PX = 8
FEATHER_PX = 1.0
EDGE_PX = 2
CONTOUR_PX = 4
HALO_PX = {'bear': 0, 'bunny': 32, 'fox': 0}
HALO_SOLID_PX = 6
STAR_LUMINANCE = 150
STAR_MAX_PX = 400
STAR_MARGIN_PX = 3
STAR_CLEAR_PX = 8
INPAINT_BAND_PX = 16
INPAINT_SOFTEN_PX = 30
BOOK_GAP_PX = 30


def fail(message):
    print(f'prepare-login-animals: {message}', file=sys.stderr)
    sys.exit(1)


def walk_labels(pixels):
    height, width = pixels.shape[:2]
    markers = np.zeros((height, width), dtype=np.int32)
    for label, points in SEEDS.items():
        for x, y in points:
            markers[max(0, y - SEED_RADIUS):y + SEED_RADIUS + 1, max(0, x - SEED_RADIUS):x + SEED_RADIUS + 1] = label
    lab = rgb2lab(pixels[..., :3] / 255.0)
    return random_walker(lab, markers, beta=WALK_BETA, mode='cg_j', channel_axis=-1, tol=1e-3)


def largest_component(mask):
    labels, count = ndimage.label(mask)
    if count == 0:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    return labels == int(np.argmax(sizes)) + 1


def book_top_line(labels):
    height, width = labels.shape
    book = labels == BOOK
    columns = np.where(book.any(axis=0))[0]
    left, right = int(columns.min()), int(columns.max())
    top = np.full(width, height, dtype=float)
    for x in range(left, right + 1):
        rows = np.where(book[:, x])[0]
        top[x] = rows.min() if rows.size else height
    inner = top[left:right + 1]
    envelope = ndimage.grey_opening(inner, size=BOOK_GAP_PX * 2 + 1)
    gap = inner > envelope + BOOK_GAP_PX
    if gap.any():
        xs = np.arange(inner.size)
        inner[gap] = np.interp(xs[gap], xs[~gap], inner[~gap])
    top[left:right + 1] = inner
    return top


def split_regions(labels, alpha):
    height, width = labels.shape
    solid = alpha > SOLID_ALPHA
    ys = np.arange(height)[:, None]
    below_book = ys >= book_top_line(labels)[None, :]
    foreground = ((labels == BOOK) | (labels == MIST) | below_book) & solid
    animals = {}
    for label, name in ANIMALS.items():
        mask = ndimage.binary_fill_holes(largest_component((labels == label) & solid & ~foreground))
        animals[name] = mask
    foreground = ndimage.binary_fill_holes(foreground)
    return animals, foreground


def halve(colour, weight):
    height, width = weight.shape
    height -= height % 2
    width -= width % 2
    small_weight = weight[:height, :width].reshape(height // 2, 2, width // 2, 2).sum(axis=(1, 3))
    small_colour = (colour[:height, :width] * weight[:height, :width, None]).reshape(height // 2, 2, width // 2, 2, 3).sum(axis=(1, 3))
    return small_colour / np.maximum(small_weight, 1e-9)[..., None], small_weight


def inpaint(pixels, hole, keep):
    colour = pixels[..., :3].astype(float)
    sampled = ~ndimage.binary_dilation(hole | keep, iterations=CONTOUR_PX)
    weight = (sampled & (pixels[..., 3] > SOLID_ALPHA)).astype(float)
    levels = [(colour, weight)]
    while (weight == 0).any() and min(weight.shape) > 2:
        colour, weight = halve(colour, weight)
        levels.append((colour, weight))
    filled = levels[-1][0]
    filled[levels[-1][1] == 0] = filled[levels[-1][1] > 0].mean(axis=0)
    for colour, weight in reversed(levels[:-1]):
        grown = ndimage.zoom(filled, (colour.shape[0] / filled.shape[0], colour.shape[1] / filled.shape[1], 1), order=1)
        filled = np.where(weight[..., None] > 0, colour, grown)
    inside = ndimage.distance_transform_edt(ndimage.binary_dilation(hole | keep, iterations=CONTOUR_PX))
    blend = np.clip((inside - CONTOUR_PX - 1) / INPAINT_BAND_PX, 0, 1)[..., None]
    blurred = np.stack([ndimage.gaussian_filter(filled[..., c], INPAINT_SOFTEN_PX) for c in range(3)], axis=-1)
    filled = filled * (1 - blend) + blurred * blend
    out = pixels.copy()
    out[hole, :3] = filled[hole].round().clip(0, 255).astype(np.uint8)
    return out


def frame_of(mask, margin):
    ys, xs = np.where(mask)
    height, width = mask.shape
    left = max(int(xs.min()) - margin, 0)
    top = max(int(ys.min()) - margin, 0)
    right = min(int(xs.max()) + margin + 1, width)
    bottom = min(int(ys.max()) + margin + 1, height)
    return left, top, right, bottom


def stars_in(pixels, ring):
    luminance = pixels[..., 0] * 0.3 + pixels[..., 1] * 0.59 + pixels[..., 2] * 0.11
    bright = (luminance > STAR_LUMINANCE) & ring
    labels, count = ndimage.label(bright)
    if count == 0:
        return bright
    sizes = ndimage.sum(bright, labels, range(1, count + 1))
    small = np.isin(labels, [index + 1 for index, size in enumerate(sizes) if size <= STAR_MAX_PX])
    return ndimage.binary_dilation(small, iterations=STAR_MARGIN_PX)


def halo_of(pixels, mask, halo):
    if halo == 0:
        return np.zeros(mask.shape, dtype=bool), np.zeros(mask.shape, dtype=float)
    edge = ndimage.binary_dilation(mask, iterations=EDGE_PX)
    ring = ndimage.binary_dilation(mask, iterations=halo) & ~edge
    stars = stars_in(pixels, ring & ~ndimage.binary_dilation(mask, iterations=STAR_CLEAR_PX))
    distance = ndimage.distance_transform_edt(~edge)
    fade = np.clip((distance - HALO_SOLID_PX) / (halo - HALO_SOLID_PX), 0, 1)
    alpha = np.where(ring, (1 - fade * fade * (3 - 2 * fade)), 0.0)
    alpha[stars] = 0.0
    return ring & ~stars, ndimage.gaussian_filter(alpha, FEATHER_PX)


def cut_layer(pixels, mask, margin, halo=0):
    left, top, right, bottom = frame_of(mask, margin + halo)
    body = ndimage.gaussian_filter(ndimage.binary_dilation(mask, iterations=EDGE_PX).astype(float), FEATHER_PX)
    _, glow = halo_of(pixels, mask, halo)
    soft = np.clip(body + glow, 0, 1)
    layer = pixels[top:bottom, left:right].copy()
    layer[..., 3] = (layer[..., 3] * soft[top:bottom, left:right]).round().clip(0, 255).astype(np.uint8)
    return layer, (left, top, right, bottom)


def fraction(value, whole):
    return round(float(value) / whole, 5)


def frame_json(frame):
    left, top, right, bottom = frame
    return {
        'x': fraction(left, CANVAS[0]),
        'y': fraction(top, CANVAS[1]),
        'width': fraction(right - left, CANVAS[0]),
        'height': fraction(bottom - top, CANVAS[1]),
    }


def save(layer, name):
    Image.fromarray(layer, 'RGBA').save(os.path.join(ART_DIR, name), quality=92, method=6)


def on_green(layer):
    image = Image.new('RGBA', (layer.shape[1], layer.shape[0]), (0, 200, 0, 255))
    image.alpha_composite(Image.fromarray(layer, 'RGBA'))
    return image.convert('RGB')


def load_painting(name):
    source = Image.open(os.path.join(ART_DIR, name)).convert('RGBA')
    pixels = np.array(source)
    if pixels.shape[1::-1] != CANVAS:
        fail(f'expected a {CANVAS[0]}x{CANVAS[1]} painting in {name}, got {pixels.shape[1]}x{pixels.shape[0]}')
    return pixels


def write_art_module(names):
    lines = [
        "import type { HeroAnimal } from './login-hero';",
        '',
        "export const HERO_BACKDROP_ART = require('@/assets/images/login/hero-backdrop.webp');",
        "export const HERO_FOREGROUND_ART = require('@/assets/images/login/hero-foreground.webp');",
        '',
        'export const HERO_ANIMAL_ART: Record<HeroAnimal, number> = {',
    ]
    for name in names:
        lines.append(f"  {name}: require('@/assets/images/login/hero-{name}.webp'),")
    lines.append('};')
    with open(ART_MODULE, 'w') as handle:
        handle.write('\n'.join(lines) + '\n')


def main():
    debug_dir = None
    if len(sys.argv) == 3 and sys.argv[1] == '--debug':
        debug_dir = sys.argv[2]
        os.makedirs(debug_dir, exist_ok=True)
    elif len(sys.argv) != 1:
        fail(__doc__)

    pixels = load_painting(SOURCE)

    labels = walk_labels(pixels)
    animals, foreground = split_regions(labels, pixels[..., 3])

    hole = np.zeros(labels.shape, dtype=bool)
    keep = np.zeros(labels.shape, dtype=bool)
    for mask in animals.values():
        hole |= ndimage.binary_dilation(mask, iterations=EDGE_PX)
    backdrop = inpaint(pixels, hole & ~foreground, keep)
    save(backdrop, 'hero-backdrop.webp')

    front, front_frame = cut_layer(pixels, foreground, LAYER_MARGIN_PX)
    save(front, 'hero-foreground.webp')

    record = {
        'canvas': {'width': CANVAS[0], 'height': CANVAS[1]},
        'foreground': frame_json(front_frame),
        'animals': {},
    }
    for name, mask in animals.items():
        layer, frame = cut_layer(pixels, mask, LAYER_MARGIN_PX, HALO_PX[name])
        save(layer, f'hero-{name}.webp')
        record['animals'][name] = {'frame': frame_json(frame)}
        print(f"{name:5s} frame {record['animals'][name]['frame']}")
        if debug_dir:
            on_green(layer).save(os.path.join(debug_dir, f'layer-{name}.png'))

    with open(os.path.join(ART_DIR, 'hero-animals.json'), 'w') as handle:
        json.dump(record, handle, indent=2)
        handle.write('\n')
    write_art_module(list(animals.keys()))

    if debug_dir:
        palette = np.array([[0, 0, 0], [40, 20, 80], [200, 120, 40], [190, 160, 230], [240, 110, 30], [240, 230, 140], [120, 120, 160]])
        Image.fromarray(palette[labels].astype(np.uint8)).save(os.path.join(debug_dir, 'labels.png'))
        on_green(backdrop).save(os.path.join(debug_dir, 'layer-backdrop.png'))
        on_green(front).save(os.path.join(debug_dir, 'layer-foreground.png'))
        stacked = Image.fromarray(backdrop, 'RGBA')
        for name in animals:
            frame = record['animals'][name]['frame']
            art = Image.open(os.path.join(ART_DIR, f'hero-{name}.webp')).convert('RGBA')
            stacked.alpha_composite(art, (round(frame['x'] * CANVAS[0]), round(frame['y'] * CANVAS[1])))
        stacked.alpha_composite(Image.open(os.path.join(ART_DIR, 'hero-foreground.webp')).convert('RGBA'), (front_frame[0], front_frame[1]))
        on_green(np.array(stacked)).save(os.path.join(debug_dir, 'stacked.png'))


if __name__ == '__main__':
    main()
