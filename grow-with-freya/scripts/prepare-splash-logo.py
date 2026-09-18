#!/usr/bin/env python3
"""Cut the flat Earlyroots logo into the layers the splash animates.

The logo ships as one white-on-transparent PNG: a sprout growing out of an open
book, with its roots inside the book and the wordmark underneath. To grow the
sprout on the splash screen the mark has to come apart, and it has to come apart
without being redrawn -- every output pixel is an input pixel, so the layers
stacked at rest are the logo exactly.

The art separates on its own most of the way. The plant never touches the book
(the book's top edge is broken where the stem passes through), and each letter of
the wordmark is its own island. Only the plant needs cutting:

  roots   everything below the book's top edge
  stem    the trunk and both side branches
  leaves  cut across the neck where each leaf meets its branch

The book is also halved down its spine, so it can open: each half folds about the
spine, from BOOK_CLOSED_SCALE of its width out to the whole of it.

Every cut is interior to solid white, so neighbouring layers are grown a few
pixels into each other across it. White over white is white; without the overlap
a scaled layer shows a hairline seam along the cut.

The faint rounded-square outline in the source is an icon-template leftover and
is dropped: a pixel survives only if it sits next to solid artwork.

Outputs, under assets/images/splash-logo/:
  <layer>.png          cropped to its own bounds
  layout.json          each layer's frame and pivot as fractions of the canvas
and assets/images/splash-icon.png, the native launch image: the closed book alone on
the full canvas, so the first animated frame lands exactly on top of it.

Usage:
    python3 scripts/prepare-splash-logo.py
"""

import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets/images/ui-elements/earlyroots-logo.png')
OUTPUT_DIR = os.path.join(ROOT, 'assets/images/splash-logo')
NATIVE_ICON = os.path.join(ROOT, 'assets/images/splash-icon.png')

SOLID_ALPHA = 128
EDGE_REACH_PX = 4
OVERLAP_PX = 6
CROP_PADDING_PX = 2
CUT_WIDTH_PX = 3
BOOK_CLOSED_SCALE = 0.14

# Source-pixel coordinates on the 1254 px canvas.
SOIL_LINE_Y = 580
NECK_CUTS = {
    'leafTop': ((612, 399), (668, 399)),
    'leafLeft': ((582, 477), (618, 447)),
    'leafRight': ((650, 430), (670, 455)),
}
EXPECTED_ISLANDS = 12
EXPECTED_LETTERS = 10


def fail(message):
    print(f'prepare-splash-logo: {message}', file=sys.stderr)
    sys.exit(1)


def cut_band(shape, start, end):
    band = np.zeros(shape, dtype=bool)
    (x0, y0), (x1, y1) = start, end
    steps = int(max(abs(x1 - x0), abs(y1 - y0))) * 2 + 1
    for t in np.linspace(0.0, 1.0, steps):
        band[int(round(y0 + (y1 - y0) * t)), int(round(x0 + (x1 - x0) * t))] = True
    return ndimage.binary_dilation(band, iterations=CUT_WIDTH_PX // 2 + 1)


def grow_into(mask, allowed, pixels):
    return mask | (ndimage.binary_dilation(mask, iterations=pixels) & allowed)


def split_plant(plant):
    rows = np.arange(plant.shape[0])[:, None]
    above = plant & (rows < SOIL_LINE_Y)
    roots = plant & (rows >= SOIL_LINE_Y)

    bands = np.zeros_like(plant)
    pivots = {}
    for name, (start, end) in NECK_CUTS.items():
        neck = cut_band(plant.shape, start, end) & above
        bands |= neck
        pivot_y, pivot_x = ndimage.center_of_mass(neck)
        pivots[name] = (float(pivot_x), float(pivot_y))

    pieces, count = ndimage.label(above & ~bands)
    if count != 4:
        fail(f'expected the cuts to leave a stem and three leaves, found {count} pieces')

    centres = ndimage.center_of_mass(above, pieces, range(1, count + 1))
    by_x = sorted(range(count), key=lambda i: centres[i][1])
    leaf_left, leaf_right = by_x[0], by_x[-1]
    middle = [i for i in by_x[1:-1]]
    leaf_top = min(middle, key=lambda i: centres[i][0])
    stem_index = max(middle, key=lambda i: centres[i][0])

    stem = (pieces == stem_index + 1) | bands
    solid = {
        'stem': grow_into(stem, plant, OVERLAP_PX),
        'roots': grow_into(roots, plant, OVERLAP_PX),
        'leafLeft': grow_into(pieces == leaf_left + 1, above, OVERLAP_PX),
        'leafRight': grow_into(pieces == leaf_right + 1, above, OVERLAP_PX),
        'leafTop': grow_into(pieces == leaf_top + 1, above, OVERLAP_PX),
    }
    owners = {
        'stem': stem,
        'roots': roots,
        'leafLeft': pieces == leaf_left + 1,
        'leafRight': pieces == leaf_right + 1,
        'leafTop': pieces == leaf_top + 1,
    }
    return solid, owners, pivots


def main():
    source = Image.open(SOURCE).convert('RGBA')
    size = source.size[0]
    if source.size[0] != source.size[1]:
        fail(f'expected a square logo, got {source.size}')

    alpha = np.array(source)[..., 3]
    solid = alpha > SOLID_ALPHA
    islands, count = ndimage.label(solid)
    if count != EXPECTED_ISLANDS:
        fail(f'expected {EXPECTED_ISLANDS} islands of artwork, found {count}; the logo art has changed')

    boxes = ndimage.find_objects(islands)
    order = sorted(range(count), key=lambda i: boxes[i][0].start)
    plant_id, book_id = order[0] + 1, order[1] + 1
    letter_ids = [i + 1 for i in order[2:]]
    if len(letter_ids) != EXPECTED_LETTERS:
        fail(f'expected {EXPECTED_LETTERS} wordmark letters, found {len(letter_ids)}')

    plant_solid, plant_owners, pivots = split_plant(islands == plant_id)

    book = islands == book_id
    book_columns = np.where(book.any(axis=0))[0]
    spine_x = (int(book_columns.min()) + int(book_columns.max()) + 1) / 2
    columns = np.arange(size)[None, :]
    book_left = book & (columns < spine_x)
    book_right = book & (columns >= spine_x)
    book_rows = np.where(book.any(axis=1))[0]
    pivots['bookLeft'] = pivots['bookRight'] = (spine_x, (int(book_rows.min()) + int(book_rows.max()) + 1) / 2)

    owners = dict(plant_owners)
    owners['bookLeft'] = book_left
    owners['bookRight'] = book_right
    owners['wordmark'] = np.isin(islands, letter_ids)
    overlapping = dict(plant_solid)
    overlapping['bookLeft'] = grow_into(book_left, book, OVERLAP_PX)
    overlapping['bookRight'] = grow_into(book_right, book, OVERLAP_PX)

    owner_index = np.zeros(alpha.shape, dtype=np.int32)
    names = list(owners)
    for index, name in enumerate(names, start=1):
        owner_index[owners[name]] = index

    distance, nearest = ndimage.distance_transform_edt(owner_index == 0, return_indices=True)
    nearest_owner = owner_index[nearest[0], nearest[1]]
    near_artwork = distance <= EDGE_REACH_PX

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    layout = {'canvas': size, 'bookClosedScale': BOOK_CLOSED_SCALE, 'layers': {}}
    layer_alphas = {}
    recomposed = np.zeros(alpha.shape, dtype=np.uint8)

    for index, name in enumerate(names, start=1):
        mask = (nearest_owner == index) & near_artwork
        if name in overlapping:
            mask |= overlapping[name]
        layer_alpha = np.where(mask, alpha, 0).astype(np.uint8)
        recomposed = np.maximum(recomposed, layer_alpha)
        layer_alphas[name] = layer_alpha

        ys, xs = np.where(layer_alpha > 0)
        left = max(int(xs.min()) - CROP_PADDING_PX, 0)
        top = max(int(ys.min()) - CROP_PADDING_PX, 0)
        right = min(int(xs.max()) + 1 + CROP_PADDING_PX, size)
        bottom = min(int(ys.max()) + 1 + CROP_PADDING_PX, size)

        pixels = np.zeros((bottom - top, right - left, 4), dtype=np.uint8)
        pixels[..., :3] = 255
        pixels[..., 3] = layer_alpha[top:bottom, left:right]
        Image.fromarray(pixels, 'RGBA').save(os.path.join(OUTPUT_DIR, f'{kebab(name)}.png'), optimize=True)

        entry = {
            'x': round(left / size, 5),
            'y': round(top / size, 5),
            'width': round((right - left) / size, 5),
            'height': round((bottom - top) / size, 5),
        }
        if name in pivots:
            pivot_x, pivot_y = pivots[name]
            entry['pivot'] = {'x': round(pivot_x / size, 5), 'y': round(pivot_y / size, 5)}
        layout['layers'][name] = entry

    kept = np.where(near_artwork | (owner_index > 0), alpha, 0).astype(np.uint8)
    drift = int(np.abs(recomposed.astype(int) - kept.astype(int)).max())
    if drift != 0:
        fail(f'the layers do not recompose to the logo (max alpha drift {drift})')

    halves = [layout['layers']['bookLeft'], layout['layers']['bookRight']]
    book_x = min(half['x'] for half in halves)
    book_y = min(half['y'] for half in halves)
    layout['layers']['book'] = {
        'x': book_x,
        'y': book_y,
        'width': round(max(half['x'] + half['width'] for half in halves) - book_x, 5),
        'height': round(max(half['y'] + half['height'] for half in halves) - book_y, 5),
    }

    with open(os.path.join(OUTPUT_DIR, 'layout.json'), 'w') as handle:
        json.dump(layout, handle, indent=2)
        handle.write('\n')

    closed = np.zeros((size, size), dtype=np.uint8)
    for half in ('bookLeft', 'bookRight'):
        ys, xs = np.where(layer_alphas[half] > 0)
        left, right, top, bottom = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        folded_left = int(round(spine_x - (spine_x - left) * BOOK_CLOSED_SCALE))
        folded_right = max(int(round(spine_x + (right - spine_x) * BOOK_CLOSED_SCALE)), folded_left + 1)
        piece = Image.fromarray(layer_alphas[half][top:bottom, left:right], 'L')
        folded = np.array(piece.resize((folded_right - folded_left, bottom - top), Image.LANCZOS))
        closed[top:bottom, folded_left:folded_right] = np.maximum(closed[top:bottom, folded_left:folded_right], folded)

    icon = np.zeros((size, size, 4), dtype=np.uint8)
    icon[..., :3] = 255
    icon[..., 3] = closed
    Image.fromarray(icon, 'RGBA').save(NATIVE_ICON, optimize=True)

    for name, entry in layout['layers'].items():
        print(f'{name:10s} {entry}')
    print(f'layers recompose to the source exactly; wrote {len(names)} layers to {OUTPUT_DIR}')


def kebab(name):
    return ''.join(f'-{c.lower()}' if c.isupper() else c for c in name)


if __name__ == '__main__':
    main()
