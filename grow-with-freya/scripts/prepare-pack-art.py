#!/usr/bin/env python3
"""Make a game pack's art and sounds from the book it belongs to.

    scripts/prepare-pack-art.py --pack wombat-picnic

Reads  assets/packs/<pack>/pack.json: the objects, zones, rules, missions and
       sounds, written by hand, with the art left empty.
Writes assets/packs/<pack>/art/{phone,tablet}/*.webp   one file per layer
       assets/packs/<pack>/cover.webp                  the plan card's picture
       assets/packs/<pack>/sounds/*.m4a                short mono sounds
       assets/packs/<pack>/index.ts                    the require map Metro needs
       and fills pack.json: art (layers, starts, zones per crop) and checksum.

Wombat's Picnic Count is made from *Snuggle Little Wombat*:

  the cover (2732x2048) is the painting: a grassy hill at dusk under stars.
  The sleeping wombat and the title are painted out, the hill with its own
  colour row by row, the sky with its own gradient; the stars are lifted
  into two sheets that twinkle in turn and painted out of the base.
  The host is the wombat walking on page 4, cut from the grass by his colour.
  The leaf plate, the berries, the nuts and the petals are drawn here.

The tablet crop is the whole cover at 1448x1086; the phone crop is the middle
1536 columns at 1086x1448. Every position is set once in the cover's own
pixels and carried into each crop, so the two crops agree.
"""

import argparse
import hashlib
import json
import math
import os
import shutil
import struct
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STORIES = os.path.join(ROOT, 'assets', 'stories')

FULL_W, FULL_H = 2732, 2048
CROPS = {
    'tablet': {'box': (0, 0, FULL_W, FULL_H), 'size': (1448, 1086)},
    'phone': {'box': (598, 0, 2134, FULL_H), 'size': (1086, 1448)},
}
WEBP_QUALITY = 82
COVER_SIZE = (724, 543)

# Where things stand, in the cover's own pixels. x, y is the centre.
WOMBAT_PICNIC = {
    'leaf': {'at': (1366, 1790), 'w': 720},
    'wombat': {'at': (1800, 1660), 'h': 400},
    'starts': {
        'berry-1': (760, 1735),
        'berry-2': (900, 1905),
        'berry-3': (1080, 1990),
        'berry-4': (1630, 1985),
        'berry-5': (2010, 1935),
        'nut-1': (700, 1900),
        'nut-2': (1310, 1995),
        'nut-3': (1840, 1960),
        'petal-1': (980, 1595),
        'petal-2': (1750, 1540),
    },
    'berry': 92,
    'nut': 96,
    'petal': 88,
}


def info(message):
    print(message, flush=True)


def load(path):
    return Image.open(path).convert('RGBA')


def to_array(image):
    return np.asarray(image).astype(np.float32)


def from_array(array):
    return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8))


def save_webp(image, path, lossless=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if lossless:
        image.save(path, 'WEBP', lossless=True, quality=100, method=6)
    else:
        image.save(path, 'WEBP', quality=WEBP_QUALITY, method=6)


def blur(image, radius):
    return image.filter(ImageFilter.GaussianBlur(radius))


def grain(size, strength=6.0, seed=1):
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, strength, (size[1], size[0], 1)).astype(np.float32)
    return noise


# ---------------------------------------------------------------- painting out


def bbox_of(mask):
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def paint_out_rows(rgb, mask, feather=6, reach=1):
    """Fill the masked pixels of each row from unmasked pixels a little way
    beyond either end of the gap, blended across it, so a vertical gradient
    (the sky) carries straight on and no halo round the gap is copied in."""
    out = rgb.copy()
    h, w, _ = rgb.shape
    for y in range(h):
        row = mask[y]
        if not row.any():
            continue
        xs = np.where(row)[0]
        runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1)
        for run in runs:
            x0, x1 = int(run[0]), int(run[-1])
            left = max(x0 - reach, 0)
            right = min(x1 + reach, w - 1)
            if row[left]:
                left = None
            if row[right]:
                right = None
            if left is None and right is None:
                continue
            a = rgb[y, left] if left is not None else rgb[y, right]
            b = rgb[y, right] if right is not None else rgb[y, left]
            t = np.linspace(0, 1, x1 - x0 + 3)[1:-1][:, None]
            out[y, x0:x1 + 1] = a * (1 - t) + b * t
    soft = np.asarray(blur(from_array(out), 5.0)).astype(np.float32)
    weight = np.asarray(blur(Image.fromarray((mask * 255).astype(np.uint8)), feather)).astype(np.float32)[..., None] / 255.0
    return out * (1 - weight) + (soft + grain(rgb.shape[1::-1], 3.0)) * weight


def fill_band(rgb, band, keep_out):
    """Give every row of a band the colour the same row has beyond keep_out,
    blended in from the band's edges, with the paper's grain."""
    x0, y0, x1, y1 = band
    kx0, kx1 = keep_out
    out = rgb.copy()
    rows = rgb[y0:y1]
    outside = np.concatenate([rows[:, :kx0], rows[:, kx1:]], axis=1)
    colour = np.median(outside, axis=1)
    fill = np.repeat(colour[:, None, :], x1 - x0, axis=1)
    mask = np.zeros((FULL_H, FULL_W), dtype=np.uint8)
    mask[y0 + 12:y1 - 12, x0 + 12:x1 - 12] = 255
    weight = np.asarray(blur(Image.fromarray(mask), 14)).astype(np.float32)[y0:y1, x0:x1, None] / 255.0
    out[y0:y1, x0:x1] = rows[:, x0:x1] * (1 - weight) + (fill + grain((x1 - x0, y1 - y0), 3.0, seed=13)) * weight
    return out


def paint_out_blob(rgb, mask, feather=8):
    """Fill a masked blob from the colour around its edge: a blurred copy of the
    picture with the blob's own pixels pushed out, used where the surround is a
    texture rather than a gradient."""
    out = rgb.copy()
    box = bbox_of(mask)
    if box is None:
        return out
    x0, y0, x1, y1 = box
    pad = 40
    X0, Y0, X1, Y1 = max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad, rgb.shape[1]), min(y1 + pad, rgb.shape[0])
    window = rgb[Y0:Y1, X0:X1]
    hole = mask[Y0:Y1, X0:X1]
    filled = np.where(hole[..., None], 0.0, window)
    known = ~hole
    for _ in range(40):
        soft = np.asarray(blur(from_array(np.where(known[..., None], filled, 0.0)), 10)).astype(np.float32)
        alpha = np.asarray(blur(Image.fromarray((known * 255).astype(np.uint8)), 10)).astype(np.float32) / 255.0
        reached = alpha > 0.03
        guess = soft / np.maximum(alpha, 1e-3)[..., None]
        filled = np.where((hole & reached & ~known)[..., None], np.clip(guess, 0, 255), filled)
        known = known | reached
        if known.all():
            break
    filled = np.asarray(blur(from_array(filled), 2.0)).astype(np.float32)
    filled = np.where(hole[..., None], filled + grain((X1 - X0, Y1 - Y0), 3.0), window)
    weight = np.asarray(blur(Image.fromarray((hole * 255).astype(np.uint8)), feather)).astype(np.float32)[..., None] / 255.0
    out[Y0:Y1, X0:X1] = window * (1 - weight) + filled * weight
    return out


def dilate(mask, radius):
    img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(radius * 2 + 1))
    return np.asarray(img) > 127


def erode(mask, radius):
    img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(radius * 2 + 1))
    return np.asarray(img) > 127


def fill_holes(mask):
    return ndimage.binary_fill_holes(mask)


def components(mask):
    labels, _ = ndimage.label(mask)
    return labels


# ---------------------------------------------------------------- the painting


def cover_painting():
    """The cover with its sleeping wombat and title painted out, and the stars
    lifted into two sheets. Returns (base_rgb float array, star sheets)."""
    cover = load(os.path.join(STORIES, 'snuggle-little-wombat', 'cover', 'cover-large.webp'))
    assert cover.size == (FULL_W, FULL_H), cover.size
    rgb = to_array(cover)[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    # the hill: green beats red and blue, in the lower part of the picture
    hill = (g > r + 6) & (g > b + 6)
    hill[: int(FULL_H * 0.5)] = False
    hill = erode(dilate(hill, 6), 6)
    hill = fill_holes(hill)

    # the sleeping wombat: tan fur, which the peach of the horizon is not
    fur = (r - b > 60) & (g - b > 30) & (r < 235) & (r > 120)
    fur[: int(FULL_H * 0.62)] = False
    fur = fill_holes(erode(dilate(fur, 4), 2))
    labels = components(fur)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    wombat = labels == int(sizes.argmax())
    wombat = dilate(wombat, 14)
    box = bbox_of(wombat)
    if box is None or (box[2] - box[0]) * (box[3] - box[1]) > FULL_W * FULL_H * 0.25:
        raise SystemExit('the sleeping wombat was not found where expected: %s' % (box,))
    info('painting the sleeping wombat out: %s' % (box,))
    rgb = paint_out_rows(rgb, wombat, feather=10, reach=12)

    # the title: near-white letters in the sky, with the glow round them
    white = (r > 205) & (g > 205) & (b > 205)
    white[int(FULL_H * 0.45):] = False
    title = dilate(white, 6)
    labels = components(title)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    big = np.isin(labels, np.where(sizes > 3000)[0])
    title = fill_holes(dilate(big, 18))
    x0, y0, x1, y1 = bbox_of(title)
    info('painting the title out: %s' % ((x0, y0, x1, y1),))
    # the sky is one gradient from top to bottom, so the whole band the title
    # and its glow occupy is given each row's own colour from beyond the text
    band = (max(x0 - 40, 0), max(y0 - 70, 0), min(x1 + 40, FULL_W), min(y1 + 70, FULL_H))
    rgb = fill_band(rgb, band, (max(x0 - 80, 0), min(x1 + 80, FULL_W)))
    title = np.zeros((FULL_H, FULL_W), dtype=bool)
    title[band[1]:band[3], band[0]:band[2]] = True
    painted = wombat | title

    # the stars: small bright spots in the sky, lifted into sheets
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    bright = (r + g + b) / 3
    local = np.asarray(blur(from_array(rgb), 9)).astype(np.float32).mean(axis=2)
    spark = (bright > local + 28) & (bright > 150)
    spark[int(FULL_H * 0.62):] = False
    spark = dilate(spark, 9)
    labels = components(spark)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    boxes = ndimage.find_objects(labels)
    keep = []
    for label in np.where((sizes > 200) & (sizes < 9000))[0]:
        ys, xs = boxes[label - 1]
        width, height = xs.stop - xs.start, ys.stop - ys.start
        if width < 80 and height > width * 0.35:
            keep.append(label)
    sheets = [np.zeros((FULL_H, FULL_W), dtype=bool), np.zeros((FULL_H, FULL_W), dtype=bool)]
    for index, label in enumerate(keep):
        sheets[index % 2] |= labels == label
    stars = sheets[0] | sheets[1]
    info('lifting %d stars into two sheets' % len(keep))
    glow = np.clip((bright - local) * 5, 0, 255)
    star_rgba = []
    for sheet in sheets:
        alpha = np.asarray(blur(from_array(np.where(sheet, glow, 0)), 0.8)).astype(np.float32)
        star_rgba.append(np.dstack([rgb, alpha]))
    rgb = paint_out_rows(rgb, dilate(stars, 2), feather=4, reach=12)
    rgb = settle(rgb, dilate(painted | stars, 6))
    return rgb, star_rgba, hill


def settle(rgb, mask):
    """Soften what was painted, so no row shows, and give it the paper's grain back."""
    soft = np.asarray(blur(from_array(rgb), 7)).astype(np.float32)
    weight = np.asarray(blur(Image.fromarray((mask * 255).astype(np.uint8)), 10)).astype(np.float32)[..., None] / 255.0
    return rgb * (1 - weight) + (soft + grain(rgb.shape[1::-1], 3.5, seed=11)) * weight


# ---------------------------------------------------------------- the host


def walking_wombat():
    """The wombat from page 4, cut from the grass by his colour."""
    page = load(os.path.join(STORIES, 'snuggle-little-wombat', 'page-4', 'background.webp'))
    region = (860, 740, 1230, 1050)
    crop = page.crop(region)
    rgb = to_array(crop)[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    fur = (r > g + 10) & (r > b + 38) & (r > 120)
    dark = (r < 120) & (g < 100) & (b < 90)
    body = fill_holes(erode(dilate(fur, 3), 2))
    body = body | (dark & dilate(body, 6))
    body = fill_holes(body)
    labels = components(body)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    body = labels == int(sizes.argmax())
    body = erode(body, 1)
    alpha = np.asarray(blur(Image.fromarray((body * 255).astype(np.uint8)), 1.2)).astype(np.float32)
    # colour borrowed inward at the rim so no green rides along the edge
    inner = erode(body, 3)
    inner_rgb = rgb.copy()
    inner_img = from_array(np.where(inner[..., None], rgb, 0))
    weight_img = Image.fromarray((inner * 255).astype(np.uint8))
    soft = np.asarray(blur(inner_img, 4)).astype(np.float32)
    weight = np.asarray(blur(weight_img, 4)).astype(np.float32)[..., None] / 255.0
    borrowed = soft / np.maximum(weight, 1e-3)
    inner_rgb = np.where(inner[..., None], rgb, borrowed)
    layer = np.dstack([inner_rgb, alpha])
    box = bbox_of(alpha > 8)
    x0, y0, x1, y1 = box
    return from_array(layer[y0:y1, x0:x1])


# ---------------------------------------------------------------- drawn things


def radial(size, inner, outer, centre=(0.5, 0.5), power=1.0):
    w, h = size
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = centre[0] * w, centre[1] * h
    d = np.sqrt(((xs - cx) / (w / 2)) ** 2 + ((ys - cy) / (h / 2)) ** 2)
    t = np.clip(d, 0, 1) ** power
    inner = np.array(inner, dtype=np.float32)
    outer = np.array(outer, dtype=np.float32)
    return inner * (1 - t[..., None]) + outer * t[..., None]


def ellipse_mask(size, pad=0, soft=1.5):
    w, h = size
    img = Image.new('L', size, 0)
    ImageDraw.Draw(img).ellipse((pad, pad, w - 1 - pad, h - 1 - pad), fill=255)
    return np.asarray(blur(img, soft)).astype(np.float32)


def draw_berry(size):
    """A dusky berry: round, deep red, lit from the top left, with a tiny
    green calyx."""
    s = int(size)
    body = radial((s, s), (196, 72, 110), (84, 24, 52), centre=(0.38, 0.36), power=1.4)
    alpha = ellipse_mask((s, s), pad=s * 0.08)
    shine = ellipse_mask((s, s), pad=0, soft=s * 0.08)
    gloss = radial((s, s), (255, 235, 240), (196, 72, 110), centre=(0.33, 0.28), power=0.6)
    gloss_w = np.clip(1 - np.sqrt(((np.mgrid[0:s, 0:s][1] - s * 0.33) / (s * 0.22)) ** 2 + ((np.mgrid[0:s, 0:s][0] - s * 0.28) / (s * 0.16)) ** 2), 0, 1)[..., None]
    body = body * (1 - gloss_w * 0.75) + gloss * gloss_w * 0.75
    body = body + grain((s, s), 3.0, seed=3)
    layer = np.dstack([body, alpha * (shine > 0)])
    img = from_array(layer)
    draw = ImageDraw.Draw(img)
    cx, cy = s * 0.5, s * 0.12
    for angle in (-50, 0, 50):
        a = math.radians(angle - 90)
        lx, ly = cx + math.cos(a) * s * 0.07, cy + math.sin(a) * s * 0.07
        draw.ellipse((lx - s * 0.075, ly - s * 0.11, lx + s * 0.075, ly + s * 0.11), fill=(96, 138, 72, 255))
    return img


def draw_nut(size):
    """An acorn: a warm oval body under a darker cap with a stalk."""
    w = int(size)
    h = int(size * 0.92)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    body = radial((w, h), (196, 142, 84), (112, 70, 30), centre=(0.4, 0.45), power=1.3)
    body_alpha = Image.new('L', (w, h), 0)
    ImageDraw.Draw(body_alpha).ellipse((w * 0.1, h * 0.28, w * 0.9, h * 0.98), fill=255)
    body_img = from_array(np.dstack([body + grain((w, h), 3.0, seed=5), np.asarray(blur(body_alpha, 1.2)).astype(np.float32)]))
    img.alpha_composite(body_img)
    cap = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    cap_draw = ImageDraw.Draw(cap)
    cap_draw.ellipse((w * 0.05, h * 0.12, w * 0.95, h * 0.58), fill=(112, 72, 40, 255))
    cap_draw.ellipse((w * 0.14, h * 0.17, w * 0.78, h * 0.42), fill=(138, 92, 52, 255))
    cap_draw.rounded_rectangle((w * 0.46, h * 0.0, w * 0.56, h * 0.2), radius=w * 0.04, fill=(98, 62, 34, 255))
    cap = blur(cap, 0.8)
    img.alpha_composite(cap)
    return img


def draw_petal(size):
    """A fallen petal: a soft pink oval with a crease along it."""
    w = int(size)
    h = int(size * 0.68)
    body = radial((w, h), (250, 200, 214), (226, 134, 162), centre=(0.45, 0.42), power=1.2)
    alpha = ellipse_mask((w, h), pad=1, soft=1.4)
    img = from_array(np.dstack([body + grain((w, h), 2.5, seed=7), alpha]))
    draw = ImageDraw.Draw(img)
    draw.line((w * 0.2, h * 0.5, w * 0.82, h * 0.46), fill=(214, 120, 150, 140), width=max(1, int(w * 0.03)))
    return img.rotate(-18, resample=Image.BICUBIC, expand=True)


def draw_leaf(width, glow=False):
    """A big leaf lying flat: a pointed green oval with a pale midrib and
    veins, and a soft shadow beneath. With glow, a warm halo around it."""
    w = int(width)
    h = int(width * 0.42)
    pad = int(w * 0.28) if glow else int(w * 0.06)
    W, H = w + pad * 2, h + pad * 2
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if glow:
        halo = radial((W, H), (255, 232, 140, 255), (255, 214, 90, 0), centre=(0.5, 0.5), power=0.75)
        halo_alpha = ellipse_mask((W, H), pad=0, soft=w * 0.06) * (halo[..., 3] / 255.0)
        img.alpha_composite(from_array(np.dstack([halo[..., :3], halo_alpha * 0.85])))
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((pad + w * 0.04, pad + h * 0.3, pad + w * 0.98, pad + h * 1.12), fill=(40, 58, 36, 120))
    img.alpha_composite(blur(shadow, w * 0.02))
    shape = Image.new('L', (W, H), 0)
    draw = ImageDraw.Draw(shape)
    points = []
    for i in range(120):
        t = i / 120 * 2 * math.pi
        rx = w / 2 * (1 - 0.08 * abs(math.cos(t)) ** 0.5)
        x = pad + w / 2 + math.cos(t) * rx
        y = pad + h / 2 + math.sin(t) * h / 2 * (0.78 + 0.22 * abs(math.sin(t)))
        points.append((x, y))
    draw.polygon(points, fill=255)
    alpha = np.asarray(blur(shape, 1.3)).astype(np.float32)
    body = radial((W, H), (128, 176, 96), (62, 104, 58), centre=(0.42, 0.38), power=1.1)
    body = body + grain((W, H), 3.5, seed=9)
    leaf = from_array(np.dstack([body, alpha]))
    veins = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(veins)
    vd.line((pad + w * 0.06, pad + h * 0.52, pad + w * 0.94, pad + h * 0.48), fill=(186, 214, 150, 170), width=max(2, int(w * 0.012)))
    for i in range(1, 7):
        x = pad + w * (0.14 + i * 0.11)
        y = pad + h * (0.52 - i * 0.004)
        vd.line((x, y, x + w * 0.07, y - h * 0.34), fill=(176, 206, 142, 120), width=max(1, int(w * 0.008)))
        vd.line((x, y, x + w * 0.07, y + h * 0.34), fill=(176, 206, 142, 120), width=max(1, int(w * 0.008)))
    veins = blur(veins, 0.8)
    leaf.alpha_composite(veins)
    img.alpha_composite(leaf)
    return img, (pad, pad, w, h)


def shadow_under(rgb, centre, size, strength=0.28):
    """Darken the hill softly beneath something standing on it."""
    out = rgb.copy()
    cx, cy = centre
    w, h = size
    mask = Image.new('L', (FULL_W, FULL_H), 0)
    ImageDraw.Draw(mask).ellipse((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=255)
    weight = np.asarray(blur(mask, h * 0.35)).astype(np.float32)[..., None] / 255.0 * strength
    return out * (1 - weight) + out * np.array([0.55, 0.62, 0.5], dtype=np.float32) * weight


# ---------------------------------------------------------------- crops


def crop_rgb(array, crop):
    x0, y0, x1, y1 = crop['box']
    img = from_array(array[y0:y1, x0:x1])
    return img.resize(crop['size'], Image.LANCZOS)


def crop_frame(frame, crop):
    """A frame in cover pixels -> the crop's pixels, rounded whole."""
    x0, y0, x1, y1 = crop['box']
    sx = crop['size'][0] / (x1 - x0)
    sy = crop['size'][1] / (y1 - y0)
    fx, fy, fw, fh = frame
    return {'x': round((fx - x0) * sx), 'y': round((fy - y0) * sy), 'w': round(fw * sx), 'h': round(fh * sy)}


def crop_scale(crop):
    x0, y0, x1, y1 = crop['box']
    return crop['size'][0] / (x1 - x0)


def centred(at, w, h):
    return (at[0] - w / 2, at[1] - h / 2, w, h)


# ---------------------------------------------------------------- sounds


def tone(duration, freqs, amps, decay, rate=44100, vibrato=0.0, attack=0.01):
    n = int(duration * rate)
    t = np.linspace(0, duration, n, endpoint=False)
    wave_ = np.zeros(n)
    for f, a in zip(freqs, amps):
        phase = 2 * np.pi * f * t
        if vibrato:
            phase = phase + vibrato * np.sin(2 * np.pi * 5.5 * t)
        wave_ += a * np.sin(phase)
    env = np.exp(-t * decay)
    env *= np.clip(t / attack, 0, 1)
    out = wave_ * env
    return out / max(np.abs(out).max(), 1e-6) * 0.7


def sweep(duration, f0, f1, decay, rate=44100):
    n = int(duration * rate)
    t = np.linspace(0, duration, n, endpoint=False)
    f = f0 + (f1 - f0) * t / duration
    phase = 2 * np.pi * np.cumsum(f) / rate
    out = np.sin(phase) * np.exp(-t * decay) * np.clip(t / 0.004, 0, 1)
    return out / max(np.abs(out).max(), 1e-6) * 0.7


def bell(duration, f, rate=44100, amp=1.0):
    return tone(duration, [f, f * 2.0, f * 3.01, f * 4.2], [1.0, 0.45, 0.22, 0.08], 4.5, rate=rate, attack=0.004) * amp


def write_wav(path, samples, rate=44100):
    data = np.clip(samples, -1, 1)
    with wave.open(path, 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(struct.pack('<%dh' % len(data), *(data * 32767).astype(np.int16)))


def sounds(pack_dir):
    rate = 44100
    pop = sweep(0.11, 640, 300, 28)
    bloop = sweep(0.22, 330, 215, 14)
    hum = tone(0.9, [196, 392, 588], [1.0, 0.35, 0.12], 2.6, vibrato=0.25, attack=0.08)
    chime = bell(0.75, 1046.5)
    silence = np.zeros(int(0.16 * rate))
    tada = np.concatenate([bell(0.55, 523.25, amp=0.9), silence, bell(0.55, 659.25, amp=0.9), silence, bell(1.1, 783.99, amp=1.0)])
    out_dir = os.path.join(pack_dir, 'sounds')
    os.makedirs(out_dir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for name, samples in (('pop', pop), ('bloop', bloop), ('hum', hum), ('chime', chime), ('tada', tada)):
        wav_path = os.path.join(tmp, name + '.wav')
        write_wav(wav_path, samples, rate)
        m4a_path = os.path.join(out_dir, name + '.m4a')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path, '-ac', '1', '-c:a', 'aac', '-b:a', '64k', m4a_path], check=True)
        info('sound %s: %.2f s, %d bytes' % (name, len(samples) / rate, os.path.getsize(m4a_path)))
    shutil.rmtree(tmp)


# ---------------------------------------------------------------- the pack


def wombat_picnic(pack_dir, manifest):
    plan = WOMBAT_PICNIC
    base, star_sheets, hill = cover_painting()
    leaf_w = plan['leaf']['w']
    leaf_h = leaf_w * 0.42
    base = shadow_under(base, (plan['leaf']['at'][0], plan['leaf']['at'][1] + leaf_h * 0.3), (leaf_w * 1.1, leaf_h * 0.9), 0.22)
    wombat_src = walking_wombat()
    wombat_h = plan['wombat']['h']
    wombat_w = wombat_h * wombat_src.width / wombat_src.height
    base = shadow_under(base, (plan['wombat']['at'][0] + wombat_w * 0.02, plan['wombat']['at'][1] + wombat_h * 0.47), (wombat_w * 0.9, wombat_h * 0.22), 0.3)

    star_boxes = [bbox_of(sheet[..., 3] > 8) for sheet in star_sheets]

    sprites = {'berry': draw_berry, 'nut': draw_nut, 'petal': draw_petal}
    art = {}
    cover_layers = None
    for crop_name, crop in CROPS.items():
        s = crop_scale(crop)
        out_dir = os.path.join(pack_dir, 'art', crop_name)
        if os.path.isdir(out_dir):
            shutil.rmtree(out_dir)
        os.makedirs(out_dir)
        layers = []
        W, H = crop['size']

        sky = crop_rgb(base, crop).convert('RGB')
        save_webp(sky, os.path.join(out_dir, 'sky.webp'))
        layers.append({'id': 'sky', 'file': 'art/%s/sky.webp' % crop_name, 'frame': {'x': 0, 'y': 0, 'w': W, 'h': H}, 'z': 0})

        for index, (sheet, box) in enumerate(zip(star_sheets, star_boxes)):
            if box is None:
                continue
            x0, y0, x1, y1 = box
            cx0, cy0, cx1, cy1 = crop['box']
            x0, x1 = max(x0, cx0), min(x1, cx1)
            y0, y1 = max(y0, cy0), min(y1, cy1)
            if x1 <= x0 or y1 <= y0:
                continue
            frame = crop_frame((x0, y0, x1 - x0, y1 - y0), crop)
            piece = from_array(sheet[y0:y1, x0:x1]).resize((max(frame['w'], 1), max(frame['h'], 1)), Image.LANCZOS)
            name = 'stars-%d' % (index + 1)
            save_webp(piece, os.path.join(out_dir, name + '.webp'))
            layers.append({'id': name, 'file': 'art/%s/%s.webp' % (crop_name, name), 'frame': frame, 'z': 1, 'clock': 'twinkle'})

        leaf_img, (pad_x, pad_y, lw, lh) = draw_leaf(leaf_w * s)
        glow_img, (gpad_x, gpad_y, glw, glh) = draw_leaf(leaf_w * s, glow=True)
        leaf_at = plan['leaf']['at']
        leaf_frame_full = centred(leaf_at, leaf_w, leaf_h)
        leaf_frame = crop_frame(leaf_frame_full, crop)
        plain_frame = {'x': leaf_frame['x'] - pad_x, 'y': leaf_frame['y'] - pad_y, 'w': leaf_img.width, 'h': leaf_img.height}
        glow_frame = {'x': leaf_frame['x'] - gpad_x, 'y': leaf_frame['y'] - gpad_y, 'w': glow_img.width, 'h': glow_img.height}
        save_webp(leaf_img, os.path.join(out_dir, 'leaf.webp'))
        save_webp(glow_img, os.path.join(out_dir, 'leaf-glow.webp'))
        layers.append({'id': 'leaf', 'file': 'art/%s/leaf.webp' % crop_name, 'frame': plain_frame, 'z': 2})
        layers.append({'id': 'leaf-glow', 'file': 'art/%s/leaf-glow.webp' % crop_name, 'frame': glow_frame, 'z': 2})

        wombat_img = wombat_src.resize((max(1, round(wombat_w * s)), max(1, round(wombat_h * s))), Image.LANCZOS)
        wombat_frame = crop_frame(centred(plan['wombat']['at'], wombat_w, wombat_h), crop)
        save_webp(wombat_img, os.path.join(out_dir, 'wombat.webp'))
        layers.append({'id': 'wombat', 'file': 'art/%s/wombat.webp' % crop_name, 'frame': wombat_frame, 'z': 5})

        starts = {}
        sprite_frames = {}
        for kind, draw in sprites.items():
            img = draw(plan[kind] * s)
            save_webp(img, os.path.join(out_dir, kind + '.webp'))
            sprite_frames[kind] = (img.width, img.height)
            layers.append({'id': kind, 'file': 'art/%s/%s.webp' % (crop_name, kind), 'frame': {'x': 0, 'y': 0, 'w': img.width, 'h': img.height}, 'z': 4})
        for object_id, at in plan['starts'].items():
            kind = object_id.split('-')[0]
            w, h = sprite_frames[kind]
            frame = crop_frame(centred(at, w / s, h / s), crop)
            frame['w'], frame['h'] = w, h
            starts[object_id] = frame

        plate = {'x': leaf_frame['x'] + round(leaf_frame['w'] * 0.08), 'y': leaf_frame['y'] + round(leaf_frame['h'] * 0.12), 'w': round(leaf_frame['w'] * 0.84), 'h': round(leaf_frame['h'] * 0.74)}
        art[crop_name] = {'width': W, 'height': H, 'sky': '#2B2A5E', 'layers': layers, 'starts': starts, 'zones': {'leaf': plate}}
        if crop_name == 'tablet':
            cover_layers = (sky, leaf_img, plain_frame, wombat_img, wombat_frame, [(sprite_frames, starts)], out_dir)

    sky, leaf_img, plain_frame, wombat_img, wombat_frame, _, out_dir = cover_layers
    cover = sky.convert('RGBA')
    cover.alpha_composite(leaf_img, (plain_frame['x'], plain_frame['y']))
    for object_id, frame in art['tablet']['starts'].items():
        kind = object_id.split('-')[0]
        cover.alpha_composite(load(os.path.join(out_dir, kind + '.webp')), (frame['x'], frame['y']))
    cover.alpha_composite(wombat_img, (wombat_frame['x'], wombat_frame['y']))
    cover = cover.convert('RGB').resize(COVER_SIZE, Image.LANCZOS)
    save_webp(cover, os.path.join(pack_dir, 'cover.webp'))

    manifest['art'] = art
    return manifest


PACKS = {'wombat-picnic': wombat_picnic}


def write_index(pack_dir, manifest):
    files = [manifest['cover']]
    for crop in manifest['art'].values():
        files.extend(layer['file'] for layer in crop['layers'])
    files.extend(sound['file'] for sound in manifest['sounds'].values())
    files = sorted(set(files))
    lines = [
        "import type { GamePack } from '@/types/game-pack';",
        "import manifest from './pack.json';",
        '',
        'export const WOMBAT_PICNIC = {',
        '  manifest: manifest as unknown as GamePack,',
        '  files: {',
    ]
    lines.extend("    '%s': require('./%s')," % (file, file) for file in files)
    lines.extend(['  } as Record<string, unknown>,', '};', ''])
    with open(os.path.join(pack_dir, 'index.ts'), 'w') as f:
        f.write('\n'.join(lines))


def checksum(pack_dir, manifest):
    digest = hashlib.sha256()
    files = [manifest['cover']]
    for crop in manifest['art'].values():
        files.extend(layer['file'] for layer in crop['layers'])
    files.extend(sound['file'] for sound in manifest['sounds'].values())
    for file in sorted(set(files)):
        with open(os.path.join(pack_dir, file), 'rb') as f:
            digest.update(file.encode())
            digest.update(f.read())
    without = dict(manifest)
    without['checksum'] = ''
    digest.update(json.dumps(without, sort_keys=True).encode())
    return digest.hexdigest()[:16]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pack', required=True, choices=sorted(PACKS))
    parser.add_argument('--no-sounds', action='store_true')
    args = parser.parse_args()
    pack_dir = os.path.join(ROOT, 'assets', 'packs', args.pack)
    manifest_path = os.path.join(pack_dir, 'pack.json')
    with open(manifest_path) as f:
        manifest = json.load(f)
    manifest = PACKS[args.pack](pack_dir, manifest)
    if not args.no_sounds:
        sounds(pack_dir)
    manifest['checksum'] = checksum(pack_dir, manifest)
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    write_index(pack_dir, manifest)
    total = 0
    for root, _, names in os.walk(pack_dir):
        for name in names:
            if name.endswith(('.webp', '.m4a')):
                total += os.path.getsize(os.path.join(root, name))
    info('pack %s: %.2f MB of art and sound' % (args.pack, total / 1048576))


if __name__ == '__main__':
    main()
