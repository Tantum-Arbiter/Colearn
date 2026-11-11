#!/usr/bin/env python3
import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'reader-menu'
ICONS = ['page-preview', 'font-size', 'language', 'compare', 'tips']
ICON_SIZE = 192
ARROW_SIZE = 120
LEAF_SCALE, MUSHROOM_SCALE = 0.7, 0.62
PANEL_SOURCE_WIDTH = 3700
LEAF_CUT = (1300, 1000)
MUSHROOM_CUT = (1300, 200)
LEAF_INSIDE = (700, 700)
MUSHROOM_INSIDE = (800, 500)
SIDE_EASE = 200
SIDE_STRAIGHT = 120
RIGHT_CORNER = 400
CORNER_TAIL = (72, 18, 200, 40)
PANEL_WIDTH = 920
GRAIN_BOX = (360, 1050, 760, 1110)
FACE_TOP = (253, 238, 210)
FACE_BOTTOM = (252, 229, 192)


def scaled(path: Path, factor: float) -> Image.Image:
    image = Image.open(path).convert('RGBA')
    return image.resize((round(image.width * factor), round(image.height * factor)), Image.LANCZOS)


def solid_span(pixels: np.ndarray, index: int, axis: str):
    line = pixels[index, :, 3] if axis == 'row' else pixels[:, index, 3]
    found = np.nonzero(line > 0.5)[0]
    return int(found.min()), int(found.max())


def along(profile: np.ndarray, t: np.ndarray) -> np.ndarray:
    count = len(profile)
    position = np.clip(t, 0, 1) * (count - 1)
    low = np.floor(position).astype(int)
    high = np.minimum(low + 1, count - 1)
    share = (position - low)[..., None]
    return profile[low] * (1 - share) + profile[high] * share


def inside_of(piece: np.ndarray, seed, box) -> np.ndarray:
    solid = piece[..., 3] > 0.5
    x0, y0, x1, y1 = box
    keep = np.zeros(solid.shape, bool)
    keep[max(0, y0):y1, max(0, x0):x1] = True
    labels, _ = ndimage.label(~solid & keep)
    return (solid & keep) | (labels == labels[seed[1], seed[0]])


def paper_grain(mock: Image.Image, height: int, width: int) -> np.ndarray:
    rgb = np.array(mock.convert('RGB')).astype(float) / 255
    x0, y0, x1, y1 = GRAIN_BOX
    patch = rgb[y0:y1, x0:x1]
    soft = np.array(Image.fromarray((patch * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(float) / 255
    lifted = Image.fromarray(((patch - soft + 0.5) * 255).clip(0, 255).astype(np.uint8))
    grain = np.array(lifted.resize((patch.shape[1] * 4, patch.shape[0] * 4), Image.BICUBIC)).astype(float) / 255 - 0.5
    tile = np.concatenate([grain, grain[::-1]], axis=0)
    tile = np.concatenate([tile, tile[:, ::-1]], axis=1)
    return np.tile(tile, (height // tile.shape[0] + 1, width // tile.shape[1] + 1, 1))[:height, :width]


def compose_panel(source: Path):
    leaf = scaled(source / 'leaves.webp', LEAF_SCALE)
    mush = scaled(source / 'mushrooms.webp', MUSHROOM_SCALE)
    la = np.array(leaf).astype(float) / 255
    ma = np.array(mush).astype(float) / 255
    width = PANEL_SOURCE_WIDTH
    lcx, lcy = round(LEAF_CUT[0] * LEAF_SCALE), round(LEAF_CUT[1] * LEAF_SCALE)
    mcx, mcy = round(MUSHROOM_CUT[0] * MUSHROOM_SCALE), round(MUSHROOM_CUT[1] * MUSHROOM_SCALE)
    top, top_inner = solid_span(la, lcx, 'col')
    left, left_inner = solid_span(la, lcy, 'row')
    top_profile = la[top:top_inner + 1, lcx]
    side_profile = la[lcy, left:left_inner + 1]
    mush_left, mush_inner = solid_span(ma, mcy, 'row')
    mush_side = ma[mcy, mush_left:mush_inner + 1]
    bottom_inner, bottom_outer = solid_span(ma, mcx, 'col')
    bottom_profile = ma[bottom_inner:bottom_outer + 1, mcx][::-1]
    lean = (solid_span(ma, mcy + 8, 'row')[0] - solid_span(ma, mcy - 8, 'row')[0]) / 16.0
    offset_y = lcy + SIDE_STRAIGHT + SIDE_EASE - mcy
    drop = mush_left - left
    cube = (lean * SIDE_EASE - 2 * drop) / SIDE_EASE ** 3
    square = (drop - cube * SIDE_EASE ** 3) / SIDE_EASE ** 2
    bottom = offset_y + bottom_outer
    height = offset_y + mush.height
    right = width - left
    corner_x, corner_y = right - RIGHT_CORNER, top + RIGHT_CORNER

    def on_corner(degrees: float, reach: float):
        return (corner_x + reach * math.cos(math.radians(degrees)), corner_y - reach * math.sin(math.radians(degrees)))

    tip_x, tip_y = on_corner(45, RIGHT_CORNER + CORNER_TAIL[2])

    outline = Image.new('L', (width, height), 0)
    pen = ImageDraw.Draw(outline)
    pen.rounded_rectangle((left, top, right, bottom), radius=RIGHT_CORNER, fill=255)
    pen.polygon([on_corner(CORNER_TAIL[0], RIGHT_CORNER - CORNER_TAIL[3]), (tip_x, tip_y), on_corner(CORNER_TAIL[1], RIGHT_CORNER - CORNER_TAIL[3])], fill=255)
    shape = np.array(outline.filter(ImageFilter.GaussianBlur(14))) > 127
    depth = ndimage.distance_transform_edt(shape)
    ys, xs = np.mgrid[0:height, 0:width]
    cx, cy_top, cy_bottom = right - RIGHT_CORNER, top + RIGHT_CORNER, bottom - RIGHT_CORNER
    w_right = np.zeros((height, width))
    w_bottom = np.zeros((height, width))
    upper = (xs > cx) & (ys < cy_top)
    w_right[upper] = 1 - np.arctan2(cy_top - ys, xs - cx)[upper] / (np.pi / 2)
    w_right[(xs > cx) & (ys >= cy_top) & (ys <= cy_bottom)] = 1
    lower = (xs > cx) & (ys > cy_bottom)
    angle = np.arctan2(ys - cy_bottom, xs - cx)
    w_right[lower] = 1 - angle[lower] / (np.pi / 2)
    w_bottom[lower] = angle[lower] / (np.pi / 2)
    w_bottom[(xs <= cx) & (ys > (top + bottom) / 2)] = 1
    w_right, w_bottom = np.clip(w_right, 0, 1), np.clip(w_bottom, 0, 1)
    w_top = np.clip(1 - w_right - w_bottom, 0, 1)
    band = w_top * len(top_profile) + w_right * len(side_profile) + w_bottom * len(bottom_profile)
    t = depth / np.maximum(band, 1)
    rim = along(top_profile, t) * w_top[..., None] + along(side_profile, t) * w_right[..., None] + along(bottom_profile, t) * w_bottom[..., None]
    shade = np.clip((ys - top) / (bottom - top), 0, 1)[..., None]
    face = np.dstack([np.array(FACE_TOP) / 255 * (1 - shade[..., 0, None]) + np.array(FACE_BOTTOM) / 255 * shade[..., 0, None], np.ones((height, width))])
    face[..., :3] = np.clip(face[..., :3] + paper_grain(Image.open(source / 'menu-mock.webp'), height, width) * 0.9, 0, 1)
    out = np.where((t >= 1)[..., None], face, rim)
    out[..., 3] = np.where(shape, np.where(t >= 1, 1.0, rim[..., 3]), 0) * np.clip(depth / 2.0, 0, 1)

    side_zone = (ys >= lcy) & (ys < offset_y + mcy) & (xs < left + 300)
    run = np.clip(ys - lcy - SIDE_STRAIGHT, 0, SIDE_EASE).astype(float)
    edge = left + square * run ** 2 + cube * run ** 3
    mix = np.clip((ys - lcy - SIDE_STRAIGHT) / SIDE_EASE, 0, 1)
    across = (xs - edge).astype(float)
    thickness = len(side_profile) * (1 - mix) + len(mush_side) * mix
    side = along(side_profile, across / len(side_profile)) * (1 - mix[..., None]) + along(mush_side, across / len(mush_side)) * mix[..., None]
    in_band = side_zone & (across >= 0) & (across < thickness)
    out[in_band] = side[in_band]
    beyond = side_zone & (across >= thickness)
    out[beyond] = face[beyond]
    out[side_zone & (across < 0)] = 0

    corner_top = np.zeros((height, width), bool)
    corner_top[:lcy, :lcx] = True
    leaf_inside = np.zeros((height, width), bool)
    leaf_inside[:leaf.height, :leaf.width] = inside_of(la, [round(v * LEAF_SCALE) for v in LEAF_INSIDE], (0, 0, lcx, lcy))[:height, :width]
    out[corner_top & ~leaf_inside] = 0
    out[corner_top & leaf_inside] = face[corner_top & leaf_inside]
    corner_bottom = np.zeros((height, width), bool)
    corner_bottom[offset_y + mcy:, :mcx] = True
    mush_inside = np.zeros((height, width), bool)
    mush_inside[offset_y:offset_y + mush.height, :mush.width] = inside_of(ma, [round(v * MUSHROOM_SCALE) for v in MUSHROOM_INSIDE], (0, mcy, mcx, mush.height))
    out[corner_bottom & ~mush_inside] = 0
    out[corner_bottom & mush_inside] = face[corner_bottom & mush_inside]

    panel = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    leaf_layer = np.zeros((height, width, 4))
    leaf_layer[:leaf.height, :leaf.width] = la[:height]
    leaf_layer[~corner_top] = 0
    mush_layer = np.zeros((height, width, 4))
    mush_layer[offset_y:offset_y + mush.height, :mush.width] = ma
    mush_layer[~corner_bottom] = 0
    for layer in (leaf_layer, mush_layer):
        panel = Image.alpha_composite(panel, Image.fromarray((layer * 255).astype(np.uint8)))
    factor = PANEL_WIDTH / width
    small = panel.convert('RGBa').resize((PANEL_WIDTH, round(height * factor)), Image.LANCZOS).convert('RGBA')
    straight = (round(lcy * factor), round((lcy + SIDE_STRAIGHT) * factor))
    print('panel', small.size, 'slices', straight, 'tip', round(tip_x * factor), round(tip_y * factor), 'band', round((left + len(side_profile)) * factor), round((right - len(side_profile)) * factor), 'leaf reach', round(540 * LEAF_SCALE * factor), 'caps', round((offset_y + 220 * MUSHROOM_SCALE) * factor))
    return small, straight


def trimmed(image: Image.Image, threshold: int = 8) -> Image.Image:
    ys, xs = np.nonzero(np.array(image)[..., 3] >= threshold)
    return image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def square(image: Image.Image, size: int) -> Image.Image:
    body = trimmed(image, 200)
    side = max(body.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(body, ((side - body.width) // 2, (side - body.height) // 2))
    return canvas.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA')


def main() -> None:
    parser = argparse.ArgumentParser(description='Make the story reader menu pictures from the operator art in reader-menu/source.')
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    source = ROOT / 'source'
    for name in ICONS:
        square(Image.open(source / f'{name}.webp').convert('RGBA'), ICON_SIZE).save(args.out / f'icon-{name}.webp', quality=92, method=6)
    square(Image.open(source / 'arrow.webp').convert('RGBA'), ARROW_SIZE).save(args.out / 'arrow.webp', quality=92, method=6)
    panel, (top, bottom) = compose_panel(source)
    for name, box in (('top', (0, 0, panel.width, top)), ('middle', (0, top, panel.width, bottom)), ('bottom', (0, bottom, panel.width, panel.height))):
        panel.crop(box).save(args.out / f'panel-{name}.webp', quality=92, method=6)

if __name__ == '__main__':
    main()
