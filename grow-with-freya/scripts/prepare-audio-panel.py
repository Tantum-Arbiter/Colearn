#!/usr/bin/env python3
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'reader-audio'
GROUND = 100
EDGE = (55, 115)
ICON_FACE = (250, 232, 204)
ICON_GROW = 3
ICON_NAMES = ('master', 'music', 'voice')
CARDS = {'left': 50, 'right': 1225, 'height': 178, 'tops': (230, 433, 632), 'radius': 56, 'margin': 8, 'feather': 5}
TITLE_FOOT = 184
DONE_TOP = 852


def save(pixels: np.ndarray, path: Path) -> None:
    Image.fromarray(pixels.clip(0, 255).astype(np.uint8)).save(path, quality=94, method=6, exact=True)


def cut_frame(source: Path) -> np.ndarray:
    rgb = np.array(Image.open(source).convert('RGB')).astype(float)
    bright = rgb.max(axis=2)
    lit = bright > GROUND
    labels, _ = ndimage.label(lit)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    body = ndimage.binary_fill_holes(labels == sizes.argmax())
    inner = ndimage.binary_erosion(body, iterations=2)
    rim = ndimage.binary_dilation(body, iterations=1) & ~inner
    alpha = np.where(inner, 1.0, 0.0)
    alpha[rim] = ((bright[rim] - EDGE[0]) / (EDGE[1] - EDGE[0])).clip(0, 1)
    _, nearest = ndimage.distance_transform_edt(~inner, return_indices=True)
    rgb[rim] = rgb[nearest[0], nearest[1]][rim]
    frame = np.dstack([rgb, alpha * 255])
    ys, xs = np.nonzero(alpha > 0)
    return frame[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def rounded(width: int, height: int, radius: float, feather: float) -> np.ndarray:
    ys, xs = np.mgrid[0:height, 0:width].astype(float)
    dx = np.maximum(np.maximum(radius - xs, xs - (width - 1 - radius)), 0)
    dy = np.maximum(np.maximum(radius - ys, ys - (height - 1 - radius)), 0)
    outside = np.hypot(dx, dy) - radius
    return (0.5 - outside / feather).clip(0, 1)


def face_around(art: np.ndarray, box: tuple[int, int, int, int], reach: int = 10) -> np.ndarray:
    left, top, right, bottom = box
    ring = np.concatenate([
        art[top - reach:top - 2, left + 80:right - 80, :3].reshape(-1, 3),
        art[bottom + 2:bottom + reach, left + 80:right - 80, :3].reshape(-1, 3),
    ])
    return np.median(ring, axis=0)


def lift_cards(old: np.ndarray, new: np.ndarray, scale: float) -> tuple[np.ndarray, list[int], int, int]:
    margin = CARDS['margin']
    width = round((CARDS['right'] - CARDS['left'] + 2 * margin) * scale)
    width += (new.shape[1] - width) % 2
    height = round((CARDS['height'] + 2 * margin) * scale)
    gap_room = DONE_TOP - TITLE_FOOT - 3 * height
    step = round(height + gap_room / 3)
    left = (new.shape[1] - width) // 2
    first = round(TITLE_FOOT + gap_room / 6)
    tops = [first + index * step for index in range(3)]
    mask = rounded(width, height, (CARDS['radius'] + margin) * scale, CARDS['feather'] * scale)
    out = new.copy()
    for top_old, top_new in zip(CARDS['tops'], tops):
        box = (CARDS['left'] - margin, top_old - margin, CARDS['right'] + margin, top_old + CARDS['height'] + margin)
        piece = old[box[1]:box[3], box[0]:box[2]]
        tint = face_around(new, (left, top_new, left + width, top_new + height)) / face_around(old, box)
        grown = np.array(Image.fromarray(piece.clip(0, 255).astype(np.uint8), 'RGBA').resize((width, height), Image.LANCZOS)).astype(float)
        grown[..., :3] *= tint
        under = out[top_new:top_new + height, left:left + width]
        mix = mask[..., None]
        under[..., :3] = grown[..., :3] * mix + under[..., :3] * (1 - mix)
    return out, tops, left, width


def cut_icons(source: Path) -> list[np.ndarray]:
    rgb = np.array(Image.open(source).convert('RGB')).astype(float)
    face = np.array(ICON_FACE, dtype=float)
    purple = (rgb[..., 2] > rgb[..., 1] + 8) & (rgb[..., 0] < 215)
    ink = rgb[purple].mean(axis=0)
    depth = (((face - rgb) @ (face - ink)) / ((face - ink) @ (face - ink))).clip(0, 1)
    near = ndimage.binary_dilation(purple, iterations=2)
    alpha = np.where(near, depth, 0.0)
    third = rgb.shape[0] / len(ICON_NAMES)
    icons = []
    for index in range(len(ICON_NAMES)):
        band = slice(round(index * third), round((index + 1) * third))
        ys, xs = np.nonzero(alpha[band] > 0.05)
        box = (slice(band.start + ys.min(), band.start + ys.max() + 1), slice(xs.min(), xs.max() + 1))
        a = alpha[box]
        colour = np.where(a[..., None] > 0.05, (rgb[box] - (1 - a[..., None]) * face) / np.maximum(a[..., None], 0.05), ink)
        glyph = np.dstack([colour.clip(0, 255), a * 255])
        side = max(glyph.shape[:2]) + 4
        square = np.zeros((side, side, 4))
        top, left = (side - glyph.shape[0]) // 2, (side - glyph.shape[1]) // 2
        square[top:top + glyph.shape[0], left:left + glyph.shape[1]] = glyph
        grown = Image.fromarray(square.astype(np.uint8), 'RGBA').resize((side * ICON_GROW, side * ICON_GROW), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        icons.append(np.array(grown).astype(float))
    return icons


def main() -> None:
    parser = argparse.ArgumentParser(description="Make the reader's audio panel from the operator's frame and icons in reader-audio/source.")
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    frame = cut_frame(ROOT / 'source' / 'frame.webp')
    old = cut_frame(ROOT / 'source' / 'cards.webp')
    scale = frame.shape[1] / old.shape[1]
    panel, tops, left, width = lift_cards(old, frame, scale)
    save(panel, args.out / 'panel.webp')
    margin = CARDS['margin'] * scale
    print('cards', [round(top + margin, 1) for top in tops], 'height', round(CARDS['height'] * scale, 1), 'left', round(left + margin, 1), 'right', round(left + width - margin, 1), 'scale', round(scale, 4))
    for name, icon in zip(ICON_NAMES, cut_icons(ROOT / 'source' / 'icons.png')):
        save(icon, args.out / f'icon-{name}.webp')
        print('icon', name, icon.shape[1], 'x', icon.shape[0])
    print('panel', frame.shape[1], 'x', frame.shape[0])


if __name__ == '__main__':
    main()
