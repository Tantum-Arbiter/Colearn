#!/usr/bin/env python3
"""Cut the home screen's planet from the operator's painting.

The painting (assets/images/home-planet/planet-painting.webp, stored untouched,
operator, 2026-10-03) is one tall picture: a night sky with a band of galaxy
across it, and at its foot a large planet rising out of cloud. It is the
operator's second painting of this planet that day; the first, with a smaller
planet among taller clouds, was drawn at the foot of the home page for an hour
and replaced by this one. The app keeps its own sky and shows only the foot of
the painting:

  planet-horizon.webp   from above the cloud tops to the painting's bottom
                        edge, with the sky taken out: the planet, the clouds
                        round it and the glow of its air. Drawn the right way
                        up at the foot of the home page and the splash, and
                        upside down, by the app, at the top of the pages below.

  planet-cloud-ring.webp   a ring of the painting's own cloud round the
                        world's waist, seen almost edge on, for the gap between
                        the home page and the page below, where the two halves
                        of the planet meet while the pages slide. Its front
                        passes in front of the planet; its back shows only
                        beyond the planet's edge. It is the painting's two
                        cloud banks made into one band (a mirrored copy of each
                        set lower between them, the cut edges rounded into
                        puffs, a thin wisp over the sea left out), bent along
                        the front and the back of the ring and made a little
                        see-through. Sized against the planet's radius, so
                        the app scales it with the planet.

Two things were made from the paintings and taken out again the same day: the
first painting's stars and galaxy, laid over the app's sky (too much), and the
cloud band laid along the edge of the screen in front of the planet at rest.

How the planet and clouds are told from sky: each row's own blue is the median
colour of that row, and the sky is everything reachable from the top of the
painting through pixels little brighter than their row's blue. The planet's
seas are dark too, but they are walled in by the bright rim of its air and by
cloud, so the search never reaches them. The glow of the planet's air, just
above its rim, is kept as the least see-through layer of light that, laid over
that blue, gives the pixel back -- the same sum as a "colour to alpha".

Two things about the planet are written into the constants for the layout to
use:

  limbWidth   how wide the planet shows between the clouds either side of it.
              Read off the painting: its edge is last seen clear of cloud at
              row 1400, at columns 7 and 926, and below that cloud hides it
              (cloud in shadow is too near the sea's blue to tell apart by
              rule). The script checks both columns lie on the planet's
              circle. The layout draws the painting so that this width is the
              screen's width.
  cloudLine   how far below the planet's top cloud crosses its middle: down
              the columns either side of its centre, the first row below its
              seas where the paint turns pale and grey as cloud is.

Nothing from outside the painting is added.

Usage:
    python3 scripts/prepare-planet-art.py [--debug <dir>]
"""

import argparse
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(APP_ROOT, 'assets', 'images', 'home-planet')
PAINTING = os.path.join(ART_DIR, 'planet-painting.webp')
HORIZON = os.path.join(ART_DIR, 'planet-horizon.webp')
RING = os.path.join(ART_DIR, 'planet-cloud-ring.webp')
CONSTANTS = os.path.join(APP_ROOT, 'constants', 'planet-art.ts')

SKY_ROWS = 1040
HORIZON_TOP = 1010
HORIZON_FADE = 50
PLANET_TOP = 1126
PLANET_CENTRE = (466, 1648)
PLANET_RADIUS = 522
BAND_TOP = 1500
BAND_BANK = {'deepest_channel': 85, 'blue': 190, 'violet': 0.62, 'thin': 4, 'wisp': 9, 'sea_red': 48, 'land_blue': 170, 'lump': 6000}
BAND_SOLID_FROM = 1600
BAND_WISP = {'box': (570, 1500, 700, 1615), 'thick': 18}
BAND_EDGE = {'depth': 46, 'soft': 4, 'radius': (20, 32), 'apart': (30, 46)}
BAND_SHIFT = 240
BAND_DROP = 40
BAND_FOOT = 30
BAND_MEND = 24
BAND_PUFFS = {'seed': 7, 'radius': (20, 34), 'middle': 38, 'wander': 5, 'apart': (20, 34), 'soft': 4}
RING_SHAPE = {'wide': 1.18, 'tilt': 0.08, 'thick': 0.31, 'half': 0.6, 'blend': 0.25, 'edge': 0.04, 'below': 0.5, 'see': 0.85}
CLOUD_SEARCH = {'from': 220, 'either_side': 110, 'run': 14, 'pale': 185, 'grey': 0.32}
SOLID_ABOVE_SKY = 105
SPECK = 2500
AIR_REACH = 120
GLOW_FLOOR = 4
LIMB = {'row': 1400, 'left': 7, 'right': 926, 'on_circle': 6}
HORIZON_ENLARGE = 2
WEBP_QUALITY = 90
LUMA = np.array([0.299, 0.587, 0.114], dtype=np.float32)


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def sky_blue(pixels):
    rows = np.median(pixels[:SKY_ROWS], axis=1)
    rows = ndimage.gaussian_filter1d(rows, 14, axis=0, mode='nearest')
    below = np.repeat(rows[-1:], pixels.shape[0] - SKY_ROWS, axis=0)
    return np.concatenate([rows, below], axis=0)[:, None, :]


def light_over(pixels, blue):
    over = np.clip(pixels - blue - GLOW_FLOOR, 0, None)
    room = np.clip(255 - blue, 1, None)
    alpha = np.clip((over / room).max(axis=2), 0, 1)
    colour = blue + over / np.clip(alpha, 1e-4, None)[..., None]
    return np.clip(colour, 0, 255), alpha


def solid_ground(pixels, blue):
    brighter = ((pixels - blue) @ LUMA) > SOLID_ABOVE_SKY
    open_sky, _ = ndimage.label(~brighter)
    reached = np.unique(open_sky[0])
    sky = np.isin(open_sky, reached[reached > 0])
    solid = ~sky
    solid[:HORIZON_TOP] = False
    lumps, count = ndimage.label(solid)
    sizes = ndimage.sum(solid, lumps, range(1, count + 1))
    keep = np.flatnonzero(sizes >= SPECK) + 1
    return np.isin(lumps, keep)


def largest(mask):
    lumps, count = ndimage.label(mask)
    sizes = ndimage.sum(mask, lumps, range(1, count + 1))
    return np.isin(lumps, np.flatnonzero(sizes >= BAND_BANK['lump']) + 1)


def puffed_edge(height, width, side, line, seed):
    rows, columns = np.mgrid[0:height, 0:width].astype(np.float32)
    inward = {'top': rows - line, 'left': columns - line, 'right': line - columns}[side]
    along = rows if side in ('left', 'right') else columns
    span = height if side in ('left', 'right') else width
    random = np.random.default_rng(seed)
    depth, soft = BAND_EDGE['depth'], BAND_EDGE['soft']
    shape = smoothstep((inward - depth) / soft + 0.5)
    at = -BAND_EDGE['radius'][1]
    while at < span + BAND_EDGE['radius'][1]:
        radius = random.uniform(*BAND_EDGE['radius'])
        if side in ('left', 'right'):
            away = np.hypot(along - at, inward - depth)
        else:
            away = np.hypot(along - at, inward - depth)
        shape = np.maximum(shape, smoothstep((radius - away) / soft + 0.5))
        at += random.uniform(*BAND_EDGE['apart'])
    return shape


def puffed_top(height, width):
    rows, columns = np.mgrid[0:height, 0:width].astype(np.float32)
    random = np.random.default_rng(BAND_PUFFS['seed'])
    shape = smoothstep((rows - BAND_PUFFS['middle']) / BAND_PUFFS['soft'] + 0.5)
    across = -BAND_PUFFS['radius'][1]
    while across < width + BAND_PUFFS['radius'][1]:
        radius = random.uniform(*BAND_PUFFS['radius'])
        down = BAND_PUFFS['middle'] + random.uniform(-BAND_PUFFS['wander'], BAND_PUFFS['wander'])
        away = np.hypot(columns - across, rows - down)
        shape = np.maximum(shape, smoothstep((radius - away) / BAND_PUFFS['soft'] + 0.5))
        across += random.uniform(*BAND_PUFFS['apart'])
    return shape


def cloud_band(pixels):
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    cloud = (
        (pixels.min(axis=2) > BAND_BANK['deepest_channel'])
        & (blue > BAND_BANK['blue'])
        & (red / np.clip(green, 1, None) > BAND_BANK['violet'])
    )
    cloud[:BAND_TOP] = False
    left, top, right, bottom = BAND_WISP['box']
    thick = ndimage.binary_opening(cloud, iterations=BAND_WISP['thick'])
    cloud[top:bottom, left:right] &= thick[top:bottom, left:right]
    banks = largest(ndimage.binary_opening(cloud, iterations=BAND_BANK['wisp']))
    sea = (red < BAND_BANK['sea_red']) | ((green > 170) & (red < 110) & (green / np.clip(blue, 1, None) > 0.75))
    banks = np.maximum.accumulate(banks, axis=0) & ~sea & (blue > BAND_BANK['land_blue'])
    banks = ndimage.binary_fill_holes(largest(ndimage.binary_opening(banks, iterations=BAND_BANK['thin'])))
    banks[BAND_SOLID_FROM:] = np.maximum.accumulate(banks[BAND_SOLID_FROM - 1:], axis=0)[1:]
    banks[:BAND_SOLID_FROM] &= pixels[:BAND_SOLID_FROM].min(axis=2) > BAND_BANK['deepest_channel']
    banks = largest(ndimage.binary_opening(banks, iterations=BAND_BANK['thin']))
    alpha = np.clip(ndimage.gaussian_filter(banks.astype(np.float32), 1.0) * 2 - 0.5, 0, 1)
    sprite = np.dstack([pixels, alpha * 255])[BAND_TOP:]
    width = sprite.shape[1]
    mirrored = sprite[:, ::-1].copy()
    height = sprite.shape[0]
    mirrored[..., 3] *= puffed_edge(height, width, 'top', 0, 1)
    mirrored[..., 3] *= puffed_edge(height, width, 'left', 0, 2)
    mirrored[..., 3] *= puffed_edge(height, width, 'right', width - 1, 3)
    band = np.zeros_like(sprite)

    def lay(piece, across, down):
        left = max(across, 0)
        right = min(across + width, width)
        rows = piece.shape[0] - down
        into = band[down:, left:right]
        over = piece[:rows, left - across:right - across]
        see = over[..., 3:4] / 255
        into[..., :3] = over[..., :3] * see + into[..., :3] * (1 - see)
        into[..., 3:4] = np.maximum(into[..., 3:4], over[..., 3:4])

    lay(mirrored, BAND_SHIFT, BAND_DROP)
    lay(mirrored, -BAND_SHIFT, BAND_DROP)
    lay(sprite, 0, 0)
    band[..., 3] *= puffed_top(band.shape[0], width)

    foot = band[-BAND_FOOT:]
    bare = np.flatnonzero(foot[..., 3].min(axis=0) < 250)
    if len(bare) > BAND_MEND:
        raise SystemExit(f'the cloud band leaves its foot bare at {len(bare)} columns, {bare[0]} to {bare[-1]}')
    known = foot[..., 3] / 255
    weight = np.zeros_like(known)
    mend = np.zeros_like(foot[..., :3])
    for sigma in (2, 4, 8, 16):
        favour = sigma ** -2.0
        weight += favour * ndimage.gaussian_filter(known, sigma)
        for channel in range(3):
            mend[..., channel] += favour * ndimage.gaussian_filter(foot[..., channel] * known, sigma)
    mend /= np.maximum(weight, 1e-6)[..., None]
    foot[..., :3] = foot[..., :3] * known[..., None] + mend * (1 - known[..., None])
    foot[..., 3] = 255
    return band


def cloud_ring(pixels):
    band = cloud_band(pixels)[:-BAND_FOOT]
    radius = PLANET_RADIUS
    half = round(radius * RING_SHAPE['wide'])
    width = 2 * half
    thick = round(radius * RING_SHAPE['thick'])
    dip = RING_SHAPE['tilt'] * half
    half_thick = round(thick * RING_SHAPE['half'])
    upright = np.asarray(Image.fromarray(np.clip(band, 0, 255).astype(np.uint8), 'RGBA').resize(
        (round(half_thick * band.shape[1] / band.shape[0]), half_thick), Image.LANCZOS)).astype(np.float32)
    depth = np.arange(half_thick, dtype=np.float32)[:, None]
    underside = upright[::-1, ::-1].copy()
    underside[..., 3] *= smoothstep(depth / (half_thick * RING_SHAPE['edge']))
    upright = upright.copy()
    upright[..., 3] *= 1 - smoothstep((depth - half_thick * (1 - RING_SHAPE['blend'])) / (half_thick * RING_SHAPE['blend']))
    tile = np.zeros((thick, upright.shape[1], 4), dtype=np.float32)
    tile[thick - half_thick:] = underside
    over = tile[:half_thick]
    see = upright[..., 3:4] / 255
    over[..., :3] = upright[..., :3] * see + over[..., :3] * (1 - see)
    over[..., 3:4] = np.maximum(over[..., 3:4], upright[..., 3:4])
    repeats = width // tile.shape[1] + 2
    strip = np.concatenate([tile if k % 2 == 0 else tile[:, ::-1] for k in range(repeats)], axis=1)
    strip = strip[:, (strip.shape[1] - width) // 2:(strip.shape[1] - width) // 2 + width]
    height = int(np.ceil(thick + 2 * dip)) + 2
    centre = dip + thick * (1 - RING_SHAPE['below'])
    ring = np.zeros((height, width, 4), dtype=np.float32)
    rows = np.arange(height, dtype=np.float32)

    def lay(arc, front):
        for column in range(width):
            across = (column + 0.5 - half) / half
            sag = dip * np.sqrt(max(0.0, 1 - across * across))
            top = int(round(dip + (sag if front else -sag)))
            piece = arc[:, column]
            span = min(piece.shape[0], height - top)
            into = ring[top:top + span, column]
            see = piece[:span, 3:4] / 255
            if not front:
                inside = np.hypot(column + 0.5 - half, rows[top:top + span] - centre) < radius
                see = see * (~inside)[:, None]
            into[:, :3] = piece[:span, :3] * see + into[:, :3] * (1 - see)
            into[:, 3:4] = np.maximum(into[:, 3:4], see * 255)

    lay(strip, False)
    lay(strip, True)
    ring[..., 3] *= RING_SHAPE['see']
    return ring, centre


def cloud_line(pixels):
    luma = pixels @ LUMA
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    cloud = (luma > CLOUD_SEARCH['pale']) & (spread / np.clip(pixels.max(axis=2), 1, None) < CLOUD_SEARCH['grey'])
    first = []
    for column in range(PLANET_CENTRE[0] - CLOUD_SEARCH['either_side'], PLANET_CENTRE[0] + CLOUD_SEARCH['either_side']):
        run = 0
        for row in range(PLANET_TOP + CLOUD_SEARCH['from'], pixels.shape[0]):
            run = run + 1 if cloud[row, column] else 0
            if run >= CLOUD_SEARCH['run']:
                first.append(row - run + 1)
                break
    return int(np.median(first)) - PLANET_TOP


def limb_width():
    half = np.sqrt(PLANET_RADIUS ** 2 - (PLANET_CENTRE[1] - LIMB['row']) ** 2)
    for seen, drawn in ((LIMB['left'], PLANET_CENTRE[0] - half), (LIMB['right'], PLANET_CENTRE[0] + half)):
        if abs(seen - drawn) > LIMB['on_circle']:
            raise SystemExit(f'the planet edge at column {seen} is not on its circle (column {drawn:.0f})')
    return LIMB['right'] - LIMB['left']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug')
    arguments = parser.parse_args()

    pixels = np.asarray(Image.open(PAINTING).convert('RGB')).astype(np.float32)
    height, width, _ = pixels.shape
    blue = sky_blue(pixels)
    solid = solid_ground(pixels, blue)
    colour, alpha = light_over(pixels, blue)

    away = ndimage.distance_transform_edt(~solid)
    near = smoothstep(1 - away / AIR_REACH)
    rows = np.arange(height, dtype=np.float32)[:, None]

    rise = smoothstep((rows - HORIZON_TOP) / HORIZON_FADE)
    edge = np.clip(ndimage.gaussian_filter(solid.astype(np.float32), 0.8) * 2 - 0.5, 0, 1)
    horizon_alpha = np.maximum(edge, alpha * near * rise)
    horizon_colour = np.where(solid[..., None], pixels, colour)
    horizon = np.dstack([horizon_colour, horizon_alpha * 255])[HORIZON_TOP:]
    image = Image.fromarray(np.clip(horizon, 0, 255).astype(np.uint8), 'RGBA')
    image = image.resize((image.width * HORIZON_ENLARGE, image.height * HORIZON_ENLARGE), Image.LANCZOS)
    red, green, blue_band, see_through = image.split()
    sharp = Image.merge('RGB', (red, green, blue_band)).filter(ImageFilter.UnsharpMask(radius=1.4, percent=50, threshold=2))
    image = Image.merge('RGBA', (*sharp.split(), see_through))
    image.save(HORIZON, 'WEBP', quality=WEBP_QUALITY, method=6)

    ring, ring_centre = cloud_ring(pixels)
    ring_image = Image.fromarray(np.clip(ring, 0, 255).astype(np.uint8), 'RGBA')
    ring_image = ring_image.resize((ring_image.width * HORIZON_ENLARGE, ring_image.height * HORIZON_ENLARGE), Image.LANCZOS)
    ring_image.save(RING, 'WEBP', quality=WEBP_QUALITY, method=6)

    horizon_rows = height - HORIZON_TOP
    with open(CONSTANTS, 'w') as out:
        out.write('// Written by scripts/prepare-planet-art.py. Do not edit by hand: change the script and run it again.\n\n')
        out.write('export const PLANET_ART = {\n')
        out.write(f"  source: require('@/assets/images/home-planet/planet-horizon.webp'),\n")
        out.write(f'  width: {width},\n')
        out.write(f'  height: {horizon_rows},\n')
        out.write(f'  planetTop: {PLANET_TOP - HORIZON_TOP},\n')
        out.write(f'  planetRadius: {PLANET_RADIUS},\n')
        out.write(f'  planetCentreX: {PLANET_CENTRE[0]},\n')
        out.write(f'  limbWidth: {limb_width()},\n')
        out.write(f'  cloudLine: {cloud_line(pixels)},\n')
        out.write('} as const;\n\n')
        out.write('export const CLOUD_RING_ART = {\n')
        out.write(f"  source: require('@/assets/images/home-planet/planet-cloud-ring.webp'),\n")
        out.write(f'  width: {ring.shape[1]},\n')
        out.write(f'  height: {ring.shape[0]},\n')
        out.write(f'  radius: {PLANET_RADIUS},\n')
        out.write(f'  centreY: {ring_centre:.2f},\n')
        out.write('} as const;\n')

    print(f'planet-horizon.webp {image.width}x{image.height} ({os.path.getsize(HORIZON) // 1024} KB)')
    print(f'planet-cloud-ring.webp {ring_image.width}x{ring_image.height} ({os.path.getsize(RING) // 1024} KB)')

    if arguments.debug:
        os.makedirs(arguments.debug, exist_ok=True)
        Image.fromarray((solid * 255).astype(np.uint8)).save(os.path.join(arguments.debug, 'solid.png'))
        for name, layer in (('horizon', image), ('ring', ring_image)):
            for label, ground in (('magenta', (255, 0, 255, 255)), ('night', (7, 29, 84, 255))):
                under = Image.new('RGBA', layer.size, ground)
                Image.alpha_composite(under, layer).convert('RGB').save(os.path.join(arguments.debug, f'{name}-on-{label}.png'))


if __name__ == '__main__':
    main()
