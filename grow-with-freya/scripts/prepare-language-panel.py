#!/usr/bin/env python3
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'reader-languages'
PANEL = {'width': 1248, 'top': 258, 'bottom': 188}
LIST = (63, 1192)
PEEK = 26
LIST_PAD = 11
HAZE = 8
SOLID = 245


def tidy(frame: np.ndarray) -> np.ndarray:
    out = frame.copy()
    alpha = out[..., 3]
    alpha[alpha <= HAZE] = 0
    alpha[alpha >= SOLID] = 255
    _, nearest = ndimage.distance_transform_edt(alpha < 128, return_indices=True)
    clear = alpha == 0
    out[clear, :3] = out[nearest[0], nearest[1], :3][clear]
    return out


def save(pixels: np.ndarray, path: Path) -> None:
    Image.fromarray(pixels.clip(0, 255).astype(np.uint8)).save(path, quality=94, method=6, exact=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Make the reader's language panel from the operator's frame in reader-languages/source.")
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    frame = tidy(np.array(Image.open(ROOT / 'source' / 'frame.webp').convert('RGBA')).astype(float))
    ys, xs = np.nonzero(frame[..., 3] > 0)
    panel = frame[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    height, width = panel.shape[:2]
    per_unit = width / PANEL['width']
    top, low = round(PANEL['top'] * per_unit), height - round(PANEL['bottom'] * per_unit)
    for name, rows in (('top', (0, top)), ('middle', (top, low)), ('bottom', (low, height))):
        save(panel[rows[0]:rows[1]], args.out / f'panel-{name}.webp')
    left, right = round(LIST[0] * per_unit), round(LIST[1] * per_unit)
    for name, rows, ramp in (('fade-top', (top, top + round(LIST_PAD * per_unit)), (1, 0)), ('fade', (low - round(PEEK * per_unit), low), (0, 1))):
        strip = panel[rows[0]:rows[1], left:right].copy()
        strip[..., 3] *= np.linspace(*ramp, strip.shape[0])[:, None] ** 0.8
        save(strip, args.out / f'panel-{name}.webp')
    print('panel', (width, height), 'slices', top, low, 'pixels per unit', round(per_unit, 4), 'middle units', round((low - top) / per_unit, 1))


if __name__ == '__main__':
    main()
