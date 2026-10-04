#!/usr/bin/env python3
"""Cut the three stat orbs for the home screen out of the operator's mock.

The operator sent one picture (2026-10-04), stored untouched as
assets/images/home-stats/stat-orbs-mock.webp: three glass orbs on a blue sky --
a flame (the streak), an open book (minutes read this week) and a trophy
(badges unlocked) -- each with its number and words drawn into it, sparkles
and stars round it and clouds at its foot. There are no separate files of the
orbs, so they are cut from the mock here:

  orb-streak.webp, orb-continue.webp, orb-badges.webp
      one orb each, centred in a square canvas ORB_CANVAS times as wide as the
      orb itself, on a clear ground, with the mock's own number and words
      painted out so the app can write the live ones over it. The middle orb
      held an open book and the week's minutes; it is now where Continue
      reading lives (operator, 2026-10-04), so its book is painted out too and
      the app draws a bookmark in its place.

How the sky is taken away: the mock's sky is a smooth blue, read from the open
sky clear of every orb and spread inwards. What differs from it is kept, more
opaque the more it differs, so a glow becomes a see-through glow of its own
colour rather than a patch of the mock's blue -- but only two kinds of thing
are kept at all: the glow within a few pixels of an orb's rim, and things with
red in them (clouds, stars, sparkles), which the blue sky and its haze have
none of. Inside an orb everything is kept as it is.

How the book is painted out: everything inside a rounded box round it (a
superellipse, so its corners reach the book's gold corners) is replaced by the
glass round it, smoothed inwards, and feathered into what is left over a few
pixels. Its blue cover is too close to the glass for a colour mask, so the
whole box goes; the sparkles round the book lie outside it.

How the words are painted out: inside the boxes where the mock's text is,
anything near white is replaced by the colours round it, smoothed inwards.
The text is the only white there; the sparkles are yellow and the clouds
stop short of the boxes.

Whose is what: every pixel belongs to the orb whose rim it is nearest, and a
loose sparkle goes whole to the orb its middle is nearest, so none is cut in
two. Anything touching the picture's edge (a strip down the left, the glow
of a button along the foot, half a star at the top) is dropped.

The mock is small (an orb is about 240 pixels across), so the cuts are
enlarged by half; they are still softer than drawings made at size would be.
If the operator supplies the orbs themselves, put them in place of the cuts
and drop this script.

  orb-continue-front.webp
      the middle orb's rim, glow, outer sparkles and the clouds and stars at
      its foot, with the glass inside the rim cleared. Opened into a pill, the
      orb holds the story's cover filling its glass (operator, 2026-10-04: "the
      cover should fit the entire orb"); this is drawn over the cover so the
      rim and the clouds still sit in front of it. It is taken from
      orb-continue.webp as cut, so `--front-only` makes it without cutting the
      orbs again. The glass is cleared out to FRONT_GLASS of the orb's radius
      (the rim's own glow starts there, so the cover's edge tucks under it);
      inside that, anything bright in the lower part (FRONT_FOOT) -- the
      clouds and their stars, which overlap the glass -- is kept.

Usage:
    python3 scripts/prepare-stat-orbs.py [--debug <dir>] [--front-only]
"""

import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(APP_ROOT, 'assets', 'images', 'home-stats')
MOCK = os.path.join(ART_DIR, 'stat-orbs-mock.webp')

ORBS = {
    'streak': {'centre': (165.3, 154.6), 'radius': 120.0, 'words': [(141, 167, 186, 221), (111, 219, 226, 247)]},
    'continue': {
        'centre': (436.6, 152.9),
        'radius': 123.3,
        'words': [(386, 164, 491, 217), (364, 219, 511, 243)],
        'picture': {'centre': (437.5, 112), 'radii': (67, 46)},
    },
    'badges': {'centre': (713.9, 154.5), 'radius': 121.1, 'words': [(694, 159, 738, 211), (667, 212, 771, 236), (676, 234, 762, 259)]},
}
ORB_CANVAS = 1.3
ENLARGE = 1.5
EDGE = (12, 4, 4, 14)
SKY_CLEAR_OF_RIM = 20
SKY_REACH = 28
MATTE = (9, 42)
THING_RED = (85, 135)
GLOW = (3, 13)
WORD_WHITE = 105
WORD_SPREAD = 2
SMOOTHING_PASSES = 600
PICTURE_PASSES = 2500
PICTURE_FEATHER = 3
PICTURE_SQUARENESS = 4
LOOSE_BIT = 1800
CANVAS_FADE = 6
WEBP_QUALITY = 92
DEBUG_SKY = (16, 44, 150)
FRONT_GLASS = (0.88, 0.93)
FRONT_FOOT = 0.3
FRONT_BRIGHT = (125, 160)
FRONT_SOFTEN = 1.0


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def painted_out(pixels):
    cleaned = pixels.copy()
    for orb in ORBS.values():
        for left, top, right, bottom in orb['words']:
            patch = cleaned[top:bottom, left:right]
            white = patch.min(axis=2) > WORD_WHITE
            white = ndimage.binary_dilation(white, iterations=WORD_SPREAD)
            white[0, :] = white[-1, :] = False
            white[:, 0] = white[:, -1] = False
            ground = np.median(patch[~white], axis=0)
            patch[white] = ground
            for _ in range(SMOOTHING_PASSES):
                around = (
                    np.roll(patch, 1, axis=0) + np.roll(patch, -1, axis=0) + np.roll(patch, 1, axis=1) + np.roll(patch, -1, axis=1)
                ) / 4
                patch[white] = around[white]
    return cleaned


def picture_painted_out(pixels):
    cleaned = pixels.copy()
    height, width, _ = pixels.shape
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    for orb in ORBS.values():
        picture = orb.get('picture')
        if picture is None:
            continue
        (cx, cy), (rx, ry) = picture['centre'], picture['radii']
        inside = np.abs((xs - cx) / rx) ** PICTURE_SQUARENESS + np.abs((ys - cy) / ry) ** PICTURE_SQUARENESS <= 1
        top, bottom = int(cy - ry) - 2, int(cy + ry) + 3
        left, right = int(cx - rx) - 2, int(cx + rx) + 3
        patch = cleaned[top:bottom, left:right]
        hole = inside[top:bottom, left:right]
        patch[hole] = np.median(patch[~hole], axis=0)
        for _ in range(PICTURE_PASSES):
            around = (
                np.roll(patch, 1, axis=0) + np.roll(patch, -1, axis=0) + np.roll(patch, 1, axis=1) + np.roll(patch, -1, axis=1)
            ) / 4
            patch[hole] = around[hole]
        edge = ndimage.distance_transform_edt(hole) / PICTURE_FEATHER
        blend = np.clip(edge, 0, 1)[..., None]
        original = pixels[top:bottom, left:right]
        cleaned[top:bottom, left:right] = np.where(hole[..., None], patch * blend + original * (1 - blend), original)
    return cleaned


def rim_distance(height, width):
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    return np.stack([np.hypot(xs - orb['centre'][0], ys - orb['centre'][1]) - orb['radius'] for orb in ORBS.values()])


def open_sky(pixels, from_rim, inside_picture):
    plain = (from_rim.min(axis=0) > SKY_CLEAR_OF_RIM) & inside_picture & (pixels[..., 0] < THING_RED[0])
    plain = ndimage.binary_erosion(plain, iterations=2)
    weight = ndimage.gaussian_filter(plain.astype(np.float32), SKY_REACH)
    sky = np.stack(
        [ndimage.gaussian_filter(pixels[..., channel] * plain, SKY_REACH) for channel in range(3)], axis=-1
    )
    return sky / np.maximum(weight, 1e-4)[..., None]


def cut_from_sky(pixels, sky, from_rim, inside_picture):
    nearest = from_rim.min(axis=0)
    differs = np.abs(pixels - sky).max(axis=2)
    matte = smoothstep((differs - MATTE[0]) / (MATTE[1] - MATTE[0]))
    thing = smoothstep((pixels[..., 0] - THING_RED[0]) / (THING_RED[1] - THING_RED[0]))
    glow = 1 - smoothstep((nearest - GLOW[0]) / (GLOW[1] - GLOW[0]))
    inside_orb = np.clip(0.5 - nearest, 0, 1)
    alpha = np.maximum(matte * np.maximum(thing, glow), inside_orb) * inside_picture
    safe = np.maximum(alpha, 0.02)[..., None]
    colour = np.where(inside_orb[..., None] >= 1, pixels, (pixels - (1 - safe) * sky) / safe)
    return np.clip(colour, 0, 255), alpha


def owners(alpha, from_rim, height, width):
    owner = from_rim.argmin(axis=0)
    labelled, _ = ndimage.label(alpha > 0.12)
    for index, piece in enumerate(ndimage.find_objects(labelled), start=1):
        here = labelled[piece] == index
        if here.sum() > LOOSE_BIT:
            continue
        at_edge = (
            piece[0].start <= EDGE[1]
            or piece[1].start <= EDGE[0]
            or piece[0].stop >= height - EDGE[3]
            or piece[1].stop >= width - EDGE[2]
        )
        if at_edge:
            owner[piece][here] = -1
            continue
        cy, cx = ndimage.center_of_mass(here)
        owner[piece][here] = from_rim[:, int(piece[0].start + cy), int(piece[1].start + cx)].argmin()
    return owner


def canvas_of(colour, alpha, owner, index, orb):
    half = int(round(orb['radius'] * ORB_CANVAS))
    side = half * 2
    cx, cy = int(round(orb['centre'][0])), int(round(orb['centre'][1]))
    out = np.zeros((side, side, 4), dtype=np.float32)
    height, width = alpha.shape
    top, left = cy - half, cx - half
    y0, y1 = max(top, 0), min(top + side, height)
    x0, x1 = max(left, 0), min(left + side, width)
    mine = alpha[y0:y1, x0:x1] * (owner[y0:y1, x0:x1] == index)
    out[y0 - top:y1 - top, x0 - left:x1 - left, :3] = colour[y0:y1, x0:x1]
    out[y0 - top:y1 - top, x0 - left:x1 - left, 3] = mine * 255
    ramp = np.minimum(np.arange(side), np.arange(side)[::-1]) / CANVAS_FADE
    out[..., 3] *= np.clip(np.minimum.outer(ramp, ramp), 0, 1)
    return out


def enlarged(canvas):
    premultiplied = canvas.copy()
    premultiplied[..., :3] *= canvas[..., 3:4] / 255
    side = int(round(canvas.shape[0] * ENLARGE))
    bands = [
        np.asarray(Image.fromarray(premultiplied[..., band]).resize((side, side), Image.LANCZOS))
        for band in range(4)
    ]
    big = np.stack(bands, axis=-1)
    alpha = np.clip(big[..., 3:4], 0, 255)
    big[..., :3] = np.where(alpha > 0.5, big[..., :3] / np.maximum(alpha, 0.5) * 255, 0)
    big[..., 3:4] = alpha
    return Image.fromarray(np.clip(big, 0, 255).astype(np.uint8), 'RGBA')


def front_of(orb):
    rgba = np.asarray(orb.convert('RGBA')).astype(np.float32)
    side = rgba.shape[0]
    radius = side / 2 / ORB_CANVAS
    ys, xs = np.mgrid[0:side, 0:side].astype(np.float32) + 0.5
    reach = np.hypot(xs - side / 2, ys - side / 2) / radius
    ring = smoothstep((reach - FRONT_GLASS[0]) / (FRONT_GLASS[1] - FRONT_GLASS[0]))
    luminance = rgba[..., :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    bright = smoothstep((luminance - FRONT_BRIGHT[0]) / (FRONT_BRIGHT[1] - FRONT_BRIGHT[0]))
    foot = (ys - side / 2) / radius > FRONT_FOOT
    keep = np.maximum(ring, ndimage.gaussian_filter(bright * foot, FRONT_SOFTEN))
    out = rgba.copy()
    out[..., 3] = rgba[..., 3] * np.clip(keep, 0, 1)
    return Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8), 'RGBA')


def save_front(debug):
    orb = Image.open(os.path.join(ART_DIR, 'orb-continue.webp'))
    front = front_of(orb)
    path = os.path.join(ART_DIR, 'orb-continue-front.webp')
    front.save(path, 'WEBP', quality=WEBP_QUALITY, method=6)
    print(f'{os.path.basename(path)}: {front.size[0]}x{front.size[1]}, {os.path.getsize(path) // 1024} KB')
    if debug:
        os.makedirs(debug, exist_ok=True)
        ground = Image.new('RGBA', front.size, (240, 120, 60, 255))
        ground.alpha_composite(front)
        ground.convert('RGB').save(os.path.join(debug, 'orb-continue-front-on-orange.png'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug')
    parser.add_argument('--front-only', action='store_true')
    args = parser.parse_args()

    if args.front_only:
        save_front(args.debug)
        return

    pixels = np.asarray(Image.open(MOCK).convert('RGB')).astype(np.float32)
    height, width, _ = pixels.shape
    inside_picture = np.zeros((height, width), dtype=bool)
    inside_picture[EDGE[1]:height - EDGE[3], EDGE[0]:width - EDGE[2]] = True

    cleaned = picture_painted_out(painted_out(pixels))
    from_rim = rim_distance(height, width)
    sky = open_sky(cleaned, from_rim, inside_picture)
    colour, alpha = cut_from_sky(cleaned, sky, from_rim, inside_picture)
    owner = owners(alpha, from_rim, height, width)

    for index, (name, orb) in enumerate(ORBS.items()):
        cut = enlarged(canvas_of(colour, alpha, owner, index, orb))
        path = os.path.join(ART_DIR, f'orb-{name}.webp')
        cut.save(path, 'WEBP', quality=WEBP_QUALITY, method=6)
        print(f'{os.path.basename(path)}: {cut.size[0]}x{cut.size[1]}, {os.path.getsize(path) // 1024} KB')

        if args.debug:
            os.makedirs(args.debug, exist_ok=True)
            ground = Image.new('RGBA', cut.size, DEBUG_SKY + (255,))
            ground.alpha_composite(cut)
            ground.convert('RGB').save(os.path.join(args.debug, f'orb-{name}-on-sky.png'))
            pale = Image.new('RGBA', cut.size, (235, 235, 235, 255))
            pale.alpha_composite(cut)
            pale.convert('RGB').save(os.path.join(args.debug, f'orb-{name}-on-pale.png'))

    save_front(args.debug)


if __name__ == '__main__':
    main()
