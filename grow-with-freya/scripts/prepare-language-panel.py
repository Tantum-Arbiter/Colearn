#!/usr/bin/env python3
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'reader-languages'
HEADROOM = 14
SCALE = 1.5
WIPED = ((360, 70, 1240, 184), (104, 184, 770, 234), (80, 246, 1240, 560), (296, 588, 1014, 712))
GRAIN_BOX = (790, 186, 1210, 240)
CREST = {'centre': (655.0, 9.3), 'reach': (27.0, 20.3), 'tip': (659.5, -0.4), 'tip_reach': (4.5, 1.5)}
CREST_FACE = (240, 205, 160)
CREST_TIP = (255, 226, 106)
SLICE_TOP = 244
SLICE_BOTTOM = 560
RIM = 30
LIST = (63, 1192)
PEEK = 26
LIST_PAD = 11
EDGE_TRIM = 1.2
EDGE_CLEAN = 2.5


def panel_shape(rgb: np.ndarray) -> np.ndarray:
    brightest = rgb.max(axis=2)
    spread = brightest - rgb.min(axis=2)
    lit = ((brightest > 150) & ((spread > 22) | (brightest > 215))) | ((spread > 45) & (brightest > 75))
    labels, count = ndimage.label(lit)
    sizes = ndimage.sum(lit, labels, range(1, count + 1))
    whole = ndimage.binary_fill_holes(labels == 1 + int(np.argmax(sizes)))
    return ndimage.binary_opening(whole, iterations=3)


def with_headroom(rgb: np.ndarray, shape: np.ndarray):
    height, width = shape.shape
    tall_rgb = np.zeros((height + HEADROOM, width, 3))
    tall_rgb[HEADROOM:] = rgb
    tall_shape = np.zeros((height + HEADROOM, width), bool)
    tall_shape[HEADROOM:] = shape
    ys, xs = np.mgrid[-HEADROOM:0, 0:width]
    (cx, cy), (rx, ry) = CREST['centre'], CREST['reach']
    cap = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2 <= 1
    (tx, ty), (trx, try_) = CREST['tip'], CREST['tip_reach']
    tip = ((xs - tx) / trx) ** 2 + ((ys - ty) / try_) ** 2 <= 1
    head = tall_rgb[:HEADROOM]
    head[cap] = CREST_FACE
    head[tip] = CREST_TIP
    tall_shape[:HEADROOM] = cap
    return tall_rgb, tall_shape


def wiped_mask(shape, offset: int) -> np.ndarray:
    mask = np.zeros(shape, bool)
    for x0, y0, x1, y1 in WIPED:
        mask[y0 + offset:y1 + offset, x0:x1] = True
    return mask


def refill(rgb: np.ndarray, gone: np.ndarray, paper: np.ndarray) -> np.ndarray:
    known = paper & ~gone
    weight = known.astype(float)
    filled = rgb * weight[..., None]
    reach = 6.0
    guess = np.zeros_like(rgb)
    missing = np.ones(gone.shape, bool)
    while missing.any() and reach < 2000:
        spread = ndimage.gaussian_filter(weight, reach)
        colour = np.dstack([ndimage.gaussian_filter(filled[..., c], reach) for c in range(3)])
        ready = missing & (spread > 0.02)
        guess[ready] = colour[ready] / spread[ready][:, None]
        missing &= ~ready
        reach *= 2
    out = rgb.copy()
    out[gone] = guess[gone]
    blend = (gone | known).astype(float)
    for _ in range(40):
        spread = ndimage.gaussian_filter(blend, 4)
        colour = np.dstack([ndimage.gaussian_filter(out[..., c] * blend, 4) for c in range(3)])
        out[gone] = colour[gone] / np.maximum(spread[gone], 1e-6)[:, None]
    return out


def grain(rgb: np.ndarray, offset: int, height: int, width: int) -> np.ndarray:
    x0, y0, x1, y1 = GRAIN_BOX
    patch = rgb[y0 + offset:y1 + offset, x0:x1]
    rough = patch - np.dstack([ndimage.gaussian_filter(patch[..., c], 5) for c in range(3)])
    tile = np.concatenate([rough, rough[::-1]], axis=0)
    tile = np.concatenate([tile, tile[:, ::-1]], axis=1)
    return np.tile(tile, (height // tile.shape[0] + 1, width // tile.shape[1] + 1, 1))[:height, :width]


def cut_out(rgb: np.ndarray, shape: np.ndarray) -> Image.Image:
    height, width = shape.shape
    size = (round(width * SCALE), round(height * SCALE))
    inside = ndimage.distance_transform_edt(shape) - ndimage.distance_transform_edt(~shape)
    depth = np.array(Image.fromarray(inside.astype(np.float32), mode='F').resize(size, Image.BICUBIC))
    big = np.array(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(float)
    clean = depth > EDGE_CLEAN
    _, nearest = ndimage.distance_transform_edt(~clean, return_indices=True)
    big = big[nearest[0], nearest[1]]
    alpha = np.clip((depth - EDGE_TRIM) * SCALE + 0.5, 0, 1)
    return Image.fromarray(np.dstack([big, alpha * 255]).clip(0, 255).astype(np.uint8))


def main() -> None:
    parser = argparse.ArgumentParser(description="Make the reader's language panel from the operator's mock-up in reader-languages/source.")
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    mock = np.array(Image.open(ROOT / 'source' / 'compare-mock.webp').convert('RGB')).astype(float)
    rgb, shape = with_headroom(mock, panel_shape(mock))
    gone = wiped_mask(shape.shape, HEADROOM) & (ndimage.distance_transform_edt(shape) > RIM)
    paper = (rgb[..., 0] > 232) & (rgb[..., 1] > 212) & (rgb[..., 2] > 175) & (rgb[..., 0] - rgb[..., 2] < 80) & shape
    face = refill(rgb, gone, paper)
    face[gone] += grain(rgb, HEADROOM, *shape.shape)[gone]
    ys, xs = np.nonzero(shape)
    left, right, bottom = xs.min(), xs.max() + 1, ys.max() + 1
    panel = cut_out(face[:bottom, left:right], shape[:bottom, left:right])
    top, low = round((SLICE_TOP + HEADROOM) * SCALE), round((SLICE_BOTTOM + HEADROOM) * SCALE)
    for name, box in (('top', (0, 0, panel.width, top)), ('middle', (0, top, panel.width, low)), ('bottom', (0, low, panel.width, panel.height))):
        panel.crop(box).save(args.out / f'panel-{name}.webp', quality=92, method=6)
    for name, box, ramp in (('fade-top', (top, top + round(LIST_PAD * SCALE)), (1, 0)), ('fade', (low - round(PEEK * SCALE), low), (0, 1))):
        strip = np.array(panel.crop((round(LIST[0] * SCALE), box[0], round(LIST[1] * SCALE), box[1]))).astype(float)
        strip[..., 3] *= np.linspace(*ramp, strip.shape[0])[:, None] ** 0.8
        Image.fromarray(strip.astype(np.uint8)).save(args.out / f'panel-{name}.webp', quality=92, method=6)
    print('panel', panel.size, 'slices', top, low, 'origin', (int(left), -HEADROOM), 'scale', SCALE)


if __name__ == '__main__':
    main()
