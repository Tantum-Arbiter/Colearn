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
    save(frame, args.out / 'panel.webp')
    for name, icon in zip(ICON_NAMES, cut_icons(ROOT / 'source' / 'icons.png')):
        save(icon, args.out / f'icon-{name}.webp')
        print('icon', name, icon.shape[1], 'x', icon.shape[0])
    print('panel', frame.shape[1], 'x', frame.shape[0])


if __name__ == '__main__':
    main()
