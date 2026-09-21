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

The book is also halved down its spine, so it can open. Shut, the left cover lies
mirrored over the right page, which the art's symmetry makes the same shape; the
cover then swings over the spine. The open book has no line down its spine, so the
closed one is given one: a stroke of the art's own line weight, recorded in
layout.json as `spine` and drawn by the app only while the book is shut.

Before any of that, a pen draws the shut book: the app strokes its outline and only
then inks the art in over the line. The outline is the centreline of the shut book's
own stroke (the right page plus the spine), skeletonised and traced into two pen
strokes recorded in layout.json as `outline`: `cover` starts at the left end of the
top edge (the art leaves a gap there for the stem), runs along the top, down the far
edge, under the pages and up the spine, ending just across that gap from where it
began; `page`, the inner page line, forks off the cover stroke where the far edge
turns under (`forkAt` along the cover) and runs back to the spine. Both are
simplified to a few dozen points, every one of them on the art.

Every cut is interior to solid white, so neighbouring layers are grown a few
pixels into each other across it. White over white is white; without the overlap
a scaled layer shows a hairline seam along the cut.

The faint rounded-square outline in the source is an icon-template leftover and
is dropped: a pixel survives only if it sits next to solid artwork.

Outputs, under assets/images/splash-logo/:
  <layer>.png          cropped to its own bounds
  layout.json          each layer's frame and pivot as fractions of the canvas
and assets/images/splash-icon.png, the native launch image: nothing at all, a clear
canvas, since the animation opens on an empty sky and draws the book onto it.

Usage:
    python3 scripts/prepare-splash-logo.py
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage.measure import approximate_polygon
from skimage.morphology import skeletonize

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets/images/ui-elements/earlyroots-logo.png')
OUTPUT_DIR = os.path.join(ROOT, 'assets/images/splash-logo')
NATIVE_ICON = os.path.join(ROOT, 'assets/images/splash-icon.png')

SOLID_ALPHA = 128
EDGE_REACH_PX = 4
OVERLAP_PX = 6
CROP_PADDING_PX = 2
CUT_WIDTH_PX = 3

# Source-pixel coordinates on the 1254 px canvas.
SOIL_LINE_Y = 580
NECK_CUTS = {
    'leafTop': ((612, 399), (668, 399)),
    'leafLeft': ((582, 477), (618, 447)),
    'leafRight': ((650, 430), (670, 455)),
}
EXPECTED_ISLANDS = 12
EXPECTED_LETTERS = 10
OUTLINE_TOLERANCE_PX = 0.6
SPUR_STROKES = 2
EXPECTED_OUTLINE_SEGMENTS = 4


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


def polyline_length(points):
    steps = np.diff(np.asarray(points, dtype=float), axis=0)
    return float(np.hypot(steps[:, 0], steps[:, 1]).sum()) if len(points) > 1 else 0.0


def skeleton_segments(skeleton):
    pixels = {(int(y), int(x)) for y, x in zip(*np.where(skeleton))}
    offsets = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]

    def neighbours(pixel):
        return [(pixel[0] + dy, pixel[1] + dx) for dy, dx in offsets if (pixel[0] + dy, pixel[1] + dx) in pixels]

    node_pixels = {pixel for pixel in pixels if len(neighbours(pixel)) != 2}
    node_mask = np.zeros(skeleton.shape, dtype=bool)
    for y, x in node_pixels:
        node_mask[y, x] = True
    labels, _ = ndimage.label(node_mask, structure=np.ones((3, 3)))

    segments = []
    seen = set()
    for start in sorted(node_pixels):
        for step in neighbours(start):
            if step in node_pixels or frozenset((start, step)) in seen:
                continue
            path = [start, step]
            seen.add(frozenset((start, step)))
            while path[-1] not in node_pixels:
                onward = [pixel for pixel in neighbours(path[-1]) if pixel != path[-2]]
                path.append(onward[0])
            seen.add(frozenset((path[-2], path[-1])))
            segments.append([int(labels[start]), int(labels[path[-1]]), path])
    return segments


def prune_and_splice(segments, spur_px, keep=None):
    def incident(node):
        return [segment for segment in segments if node in segment[:2]]

    changed = True
    while changed:
        changed = False
        for segment in list(segments):
            a, b, path = segment
            is_loop = a == b
            is_spur = not is_loop and (len(incident(a)) == 1 or len(incident(b)) == 1)
            if keep is not None and keep in (a, b):
                continue
            if (is_loop or is_spur) and polyline_length(path) < spur_px:
                segments.remove(segment)
                changed = True
                break
        nodes = {node for segment in segments for node in segment[:2]}
        for node in nodes:
            joined = incident(node)
            if len(joined) != 2 or joined[0] is joined[1]:
                continue
            first, second = joined
            first_path = first[2] if first[1] == node else list(reversed(first[2]))
            second_path = second[2] if second[0] == node else list(reversed(second[2]))
            first_far = first[0] if first[1] == node else first[1]
            second_far = second[1] if second[0] == node else second[0]
            segments.remove(first)
            segments.remove(second)
            segments.append([first_far, second_far, first_path + second_path])
            changed = True
            break
    return segments


def simplify(path):
    points = np.array([(x + 0.5, y + 0.5) for y, x in path], dtype=float)
    return approximate_polygon(points, tolerance=OUTLINE_TOLERANCE_PX)


def trace_roots(roots, size):
    skeleton = skeletonize(roots)
    ys, xs = np.where(skeleton)
    depth = ndimage.distance_transform_edt(roots)
    stroke = float(np.median(depth[skeleton])) * 2
    top = (int(ys.min()), int(xs[np.argmin(ys)]))
    raw = skeleton_segments(skeleton)
    trunk_node = next(a if path[0] == top else b for a, b, path in raw if top in (path[0], path[-1]))
    segments = prune_and_splice(raw, stroke * SPUR_STROKES, keep=trunk_node)

    def incident(node):
        return [segment for segment in segments if node in segment[:2]]

    strands = []
    frontier = [(trunk_node, None)]
    seen = set()
    while frontier:
        node, parent = frontier.pop(0)
        for segment in incident(node):
            if id(segment) in seen:
                continue
            seen.add(id(segment))
            a, b, path = segment
            outward = path if a == node else list(reversed(path))
            far = b if a == node else a
            strands.append({'points': simplify(outward), 'parent': parent})
            frontier.append((far, len(strands) - 1))

    for strand in strands:
        for x, y in strand['points']:
            if not roots[int(y), int(x)]:
                fail(f'root point ({x:.1f}, {y:.1f}) is off the roots')
    tips = [index for index, strand in enumerate(strands) if not any(other['parent'] == index for other in strands)]
    if len(tips) < 4:
        fail(f'expected the roots to branch into several tips, found {len(tips)}')

    return {
        'strokeWidth': round(stroke / size, 5),
        'strands': [
            {
                'parent': strand['parent'],
                'points': [[round(float(x) / size, 5), round(float(y) / size, 5)] for x, y in strand['points']],
            }
            for strand in strands
        ],
    }


def trace_outline(shut, stroke, size):
    skeleton = skeletonize(shut)
    segments = prune_and_splice(skeleton_segments(skeleton), stroke * SPUR_STROKES)
    if len(segments) != EXPECTED_OUTLINE_SEGMENTS:
        fail(f'expected the shut book to trace as {EXPECTED_OUTLINE_SEGMENTS} lines, found {len(segments)}')

    def incident(node):
        return [segment for segment in segments if node in segment[:2]]

    nodes = {node for segment in segments for node in segment[:2]}
    joins = [node for node in nodes if len(incident(node)) == 3]
    ends = [node for node in nodes if len(incident(node)) == 1]
    if len(joins) != 2 or len(ends) != 2:
        fail('expected the shut book to trace as two loose ends and two joins')

    def oriented(segment, first):
        a, b, path = segment
        return path if a == first else list(reversed(path))

    def x_at(node):
        return np.mean([oriented(segment, node)[0][1] for segment in incident(node)])

    spine_join, far_join = sorted(joins, key=x_at)
    between = [segment for segment in segments if set(segment[:2]) == {spine_join, far_join}]
    if len(between) != 2:
        fail('expected both page lines to run between the same two joins')
    page = oriented(min(between, key=lambda segment: polyline_length(segment[2])), far_join)
    under_the_pages = oriented(max(between, key=lambda segment: polyline_length(segment[2])), far_join)
    spine = oriented([segment for segment in incident(spine_join) if segment not in between][0], spine_join)
    along_the_top = oriented([segment for segment in incident(far_join) if segment not in between][0], far_join)[::-1]
    if along_the_top[0][1] <= spine[0][1] or abs(along_the_top[0][0] - spine[-1][0]) > stroke:
        fail('expected the top edge to start just across the stem gap from the top of the spine')

    out_along_the_top = simplify(along_the_top)
    back_under_and_up = simplify(under_the_pages + spine)
    cover = np.concatenate([out_along_the_top, back_under_and_up[1:]])
    page_line = simplify(page)

    for x, y in np.concatenate([cover, page_line]):
        if not shut[int(y), int(x)]:
            fail(f'outline point ({x:.1f}, {y:.1f}) is off the shut book')

    def fractions(points):
        return [[round(float(x) / size, 5), round(float(y) / size, 5)] for x, y in points]

    return {
        'strokeWidth': round(stroke / size, 5),
        'cover': fractions(cover),
        'page': fractions(page_line),
        'forkAt': round(polyline_length(out_along_the_top) / size, 5),
    }


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
    layout = {'canvas': size, 'layers': {}}
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

    page_column = book_right[:, int(spine_x + (book_columns.max() - spine_x) / 2)]
    page_rows = np.where(page_column)[0]
    stroke = int(np.argmax(np.diff(page_rows) > 1)) + 1
    right_at_spine = np.where(book_right[:, int(spine_x) + 1])[0]
    spine_top, spine_bottom = int(book_rows.min()), int(right_at_spine.max()) + 1
    layout['spine'] = {
        'x': round((spine_x - stroke / 2) / size, 5),
        'y': round(spine_top / size, 5),
        'width': round(stroke / size, 5),
        'height': round((spine_bottom - spine_top) / size, 5),
    }

    spine_image = Image.new('L', (size, size), 0)
    ImageDraw.Draw(spine_image).rounded_rectangle(
        [spine_x - stroke / 2, spine_top, spine_x + stroke / 2, spine_bottom], radius=stroke / 2, fill=255
    )
    shut = np.maximum(layer_alphas['bookRight'], np.array(spine_image)) > SOLID_ALPHA
    layout['outline'] = trace_outline(shut, stroke, size)
    layout['roots'] = trace_roots(layer_alphas['roots'] > SOLID_ALPHA, size)

    Image.fromarray(np.zeros((size, size, 4), dtype=np.uint8), 'RGBA').save(NATIVE_ICON, optimize=True)

    with open(os.path.join(OUTPUT_DIR, 'layout.json'), 'w') as handle:
        json.dump(layout, handle, indent=2)
        handle.write('\n')

    for name, entry in layout['layers'].items():
        print(f'{name:10s} {entry}')
    outline = layout['outline']
    roots = layout['roots']
    print(f"roots      {len(roots['strands'])} strands, stroke {roots['strokeWidth']}")
    print(f"outline    cover {len(outline['cover'])} points, page {len(outline['page'])} points, fork at {outline['forkAt']}")
    print(f'layers recompose to the source exactly; wrote {len(names)} layers to {OUTPUT_DIR}')


def kebab(name):
    return ''.join(f'-{c.lower()}' if c.isupper() else c for c in name)


if __name__ == '__main__':
    main()
