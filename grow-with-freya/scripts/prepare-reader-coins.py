#!/usr/bin/env python3
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'reader-coins'
SOURCES = {'menu': 'menu.webp', 'sound': 'sound.png', 'next': 'next.webp', 'back': 'back.webp'}
CANVAS = 1.25
OUT = 300
SOLID = 250
HALO = 16
GRAIN_PATCH = (380, 560, 510, 700)
TICK = [[(-0.30, 0.02), (-0.08, 0.24), (0.32, -0.20)]]
ARROW = [[(0.40, 0.0), (-0.34, 0.0)], [(0.02, -0.34), (-0.36, 0.0), (0.02, 0.34)]]
TICK_WIDTH = 0.092
ARROW_WIDTH = 0.072
PURPLE = ((135, 63, 160), (74, 30, 104), (196, 140, 228))
BROWN = ((115, 40, 1), (66, 20, 0), (170, 88, 36))


def disc(rgba: np.ndarray) -> tuple[float, float, float]:
    ys, xs = np.where(rgba[..., 3] >= SOLID)
    cx = (xs.min() + xs.max()) / 2
    cy = (ys.min() + ys.max()) / 2
    return float(cx), float(cy), float(max(xs.max() - xs.min(), ys.max() - ys.min()) / 2)


def cut(image: Image.Image) -> Image.Image:
    cx, cy, radius = disc(np.array(image))
    half = radius * CANVAS
    box = (round(cx - half), round(cy - half), round(cx + half), round(cy + half))
    square = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
    square.paste(image, (-box[0], -box[1]))
    return square.convert('RGBa').resize((OUT, OUT), Image.LANCZOS).convert('RGBA')


def purple(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i] / 255 for i in range(3))
    top = np.maximum(np.maximum(r, g), b)
    low = np.minimum(np.minimum(r, g), b)
    return (b > g + 0.12) & (r > g) & ((top - low) / (top + 1e-6) > 0.2)


def grow(mask: np.ndarray, by: int) -> np.ndarray:
    image = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(by * 2 + 1))
    return np.array(image) > 0


def smooth_fill(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    filled = rgb.copy()
    known = ~hole
    filled[hole] = rgb[known].mean(axis=0)
    for scale in (32, 16, 8, 4, 2, 1):
        for _ in range(120):
            neighbours = (
                np.roll(filled, scale, 0) + np.roll(filled, -scale, 0) + np.roll(filled, scale, 1) + np.roll(filled, -scale, 1)
            ) / 4
            filled[hole] = neighbours[hole]
    return filled


def blank_face(image: Image.Image) -> Image.Image:
    rgba = np.array(image).astype(np.float64)
    rgb = rgba[..., :3]
    hole = grow(purple(rgb), HALO)
    filled = smooth_fill(rgb, hole)
    soft = np.array(Image.fromarray(rgb.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float64)
    left, top, right, bottom = GRAIN_PATCH
    patch = (rgb - soft)[top:bottom, left:right]
    mirrored = np.concatenate([patch, patch[::-1]], axis=0)
    mirrored = np.concatenate([mirrored, mirrored[:, ::-1]], axis=1)
    grain = np.tile(mirrored, (rgb.shape[0] // mirrored.shape[0] + 1, rgb.shape[1] // mirrored.shape[1] + 1, 1))[: rgb.shape[0], : rgb.shape[1]]
    feather = np.array(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(np.float64) / 255
    blended = rgb * (1 - feather[..., None]) + (filled + grain) * feather[..., None]
    rgba[..., :3] = np.clip(blended, 0, 255)
    return Image.fromarray(rgba.astype(np.uint8))


def stroke(size: tuple[int, int], lines: list[list[tuple[float, float]]], width: float, colour: tuple[int, int, int], offset: tuple[float, float] = (0, 0)) -> Image.Image:
    layer = Image.new('RGBA', size, colour + (0,))
    pen = ImageDraw.Draw(layer)
    for points in lines:
        moved = [(x + offset[0], y + offset[1]) for x, y in points]
        pen.line(moved, fill=colour + (255,), width=round(width), joint='curve')
        for x, y in moved:
            pen.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=colour + (255,))
    return layer


def with_mark(face: Image.Image, mark: list[list[tuple[float, float]]], share: float, palette: tuple[tuple[int, int, int], ...]) -> Image.Image:
    body_colour, shade_colour, light_colour = palette
    cx, cy, radius = disc(np.array(face))
    points = [[(cx + x * radius, cy + y * radius) for x, y in line] for line in mark]
    width = share * radius * 2
    shadow = stroke(face.size, points, width, shade_colour, (width * 0.06, width * 0.16)).filter(ImageFilter.GaussianBlur(width * 0.12))
    shadow.putalpha(shadow.getchannel('A').point(lambda a: round(a * 0.55)))
    body = stroke(face.size, points, width, body_colour)
    shade = stroke(face.size, points, width * 0.82, shade_colour, (width * 0.07, width * 0.1)).filter(ImageFilter.GaussianBlur(width * 0.12))
    light = stroke(face.size, points, width * 0.36, light_colour, (-width * 0.12, -width * 0.16)).filter(ImageFilter.GaussianBlur(width * 0.08))
    inside = body.getchannel('A')
    for layer, strength in ((shade, 0.45), (light, 0.75)):
        alpha = np.minimum(np.array(layer.getchannel('A')), np.array(inside)) * strength
        layer.putalpha(Image.fromarray(alpha.astype(np.uint8)))
        body = Image.alpha_composite(body, layer)
    body.putalpha(inside)
    return Image.alpha_composite(Image.alpha_composite(face, shadow), body)


def main() -> None:
    parser = argparse.ArgumentParser(description='Cut the story reader coins from the operator art in reader-coins/source.')
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    images = {name: Image.open(ROOT / 'source' / file).convert('RGBA') for name, file in SOURCES.items()}
    for name, image in images.items():
        cut(image).save(args.out / f'coin-{name}.webp', lossless=True)
    face = blank_face(images['next'])
    cut(with_mark(face, TICK, TICK_WIDTH, PURPLE)).save(args.out / 'coin-done.webp', lossless=True)
    cut(with_mark(face, ARROW, ARROW_WIDTH, BROWN)).save(args.out / 'coin-exit.webp', lossless=True)


if __name__ == '__main__':
    main()
