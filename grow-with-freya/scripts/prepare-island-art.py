#!/usr/bin/env python3
"""Take the island picture apart, so the island can move.

The island screen is one painting, assets/images/island/island.webp, supplied
by the operator and never edited. The app does not show it whole. It shows it
in layers cut from it here, so that the sun can stand behind the horizon and
the clouds, the trees, the water and the gulls can each move a little:

  island-base.webp        the painting with everything that moves taken out:
                          the drifting clouds painted over with sky, the gulls
                          with sea, the swaying trees with what is around them
  island-land.webp        the band round the horizon with the sky, the cloud
                          and the water cut out of it; it lies in front of the
                          sun and the horizon cloud
  island-cloud-*.webp     the clouds that drift: the bank on the horizon, which
                          lies in front of the sun, and those high to the left
                          and right, which lie behind it
  island-billow-*.webp    the cloud in the bottom corners, which swells
  island-tree-*.webp      the trees that sway, one each
  island-water-*.webp     three sheets of wave marks, shown in turn
  island-fall-*.webp      for each waterfall, a strip of streaks to run down
                          it and a cover with a hole the shape of the fall
  island-spray.webp       a puff of spray for the foot of a fall
  island-pool-*.webp      for the pool at the foot of each fall, a cover with
                          a hole the shape of the pool; island-ring.webp is the
                          ripple that spreads in it
  island-lit-*.webp       what is lit at night: the windows, and the lamps by
                          the houses and on the bridge, in two sheets that
                          glimmer in turn
  island-lamp-*.webp      the glow, the twin beams and the pulse of the lighthouse
  constants/island-art.ts where each of them sits in the painting

How each is told apart:

Sky is a deep, saturated blue, and only above the line where the sea meets the
sky, since the sea is nearly the same blue. Only blue that joins the open sky
at the top of the picture by more than a thread counts, which keeps the blue
shadows on the mountain; a patch of sky shut in between a cloud and the land
is known by the green in it, which the mountain's shadows lack. Water is the
same blue below that line. Cloud is anything with red in it and no green
dominance, inside the three parts of the sky where cloud is painted and
outside the mountains, whose snow is the same white; a thread of white along
the mountain's edge is not cloud, and is left where it is.

The painting's edges are soft, a few pixels of cloud or leaf mixed into the
blue, so within three pixels of a cut the colour is borrowed from the solid
pixel beside it, and no blue rim rides along over the sun.

A cloud that drifts would show a hole where a tree stood in front of it, so
each cloud is carried on a little way under the land in its own colour, but
not under the mountains, whose edge is too clean to hide it. As
painted, the cloud on the horizon is two banks with open sky between them, so
the foot of the sun showed through in patches; it is filled out with copies of
the painting's own cloud bank set behind the painted cloud.

A tree is told from what is behind it by being green. A palm standing among
other leaves is told from them by being the paler, yellower green.

A tree that sways leaves a gap behind it. What was behind is not in the
painting, so the gap is filled with a blur of what lies round it; only a
sliver of it ever shows. Where a tree on the horizon stood against the sky or
the cloud, the land behind it is left open instead, so the cloud shows through.

The wave marks are drawn here, not taken from the painting: short pale
strokes scattered over the water, each drawn three times a little further
along, one on each sheet. Shown in turn the strokes seem to travel.

A waterfall is told by its colour inside the box it is known to lie in: the
pale and the blue of falling water, and not the green or the brown round it.
The app runs a strip of streaks down behind a cover cut from the painting with
a hole that shape, so the streaks show only where water falls. The strip
repeats every so many rows, so it can run for ever. The pool at its foot is
found the same way, and ripples spread in it behind a cover of its own. Every
cover has a hole wherever any fall or pool lies, so one cover never hides what
moves under its neighbour.

The lights are drawn here too. A window is lit by a warm patch on the window
painted there; the places are written down below, read off the painting. The
lamps stand by the houses and on the posts of the bridge, and nowhere else
(operator, 2026-10-02); the script stops if one is on water or on a tree that
sways.

Usage:
    python3 scripts/prepare-island-art.py [--debug <dir>]

With --debug, pictures for checking by eye are written: the layers put back
together at rest and with everything moved as far as it goes, with a sun and
a moon of the size a phone and a tablet give them.
"""

import argparse
import glob
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(APP_ROOT, 'assets', 'images', 'island')
PICTURE = os.path.join(ART_DIR, 'island.webp')
MODULE_PATH = os.path.join(APP_ROOT, 'constants', 'island-art.ts')
MADE_HERE = ('island-base', 'island-land', 'island-horizon', 'island-cloud-', 'island-billow-', 'island-tree-',
             'island-water-', 'island-fall-', 'island-pool-', 'island-ring', 'island-spray', 'island-lit-', 'island-lamp-')

BAND_TOP = 226
BAND_BOTTOM = 492
SEA_LINE = 398
SUN_X = 620
FACE_FLOOR = 357

SKY_BLUE_AT_LEAST = 170
SKY_RED_AT_MOST = 112
SKY_BLUE_OVER_RED = 96
OPEN_SKY_NECK = 3
POCKET_GREEN = 155
WATER_RED_AT_MOST = 125
WATER_BLUE_OVER_RED = 80
EDGE_SOFTNESS = 0.7
RIM = 3
NEAR = 64
WEBP_QUALITY = 92
NIGHT = ((11, 22, 74), 0.58)

MOUNTAINS = [(185, 356), (300, 280), (350, 322), (362, 315), (462, 306), (500, 330), (534, 360),
             (574, 392), (604, 420), (604, 520), (185, 520)]
CLOUD_BLUE_AT_LEAST = 185
CLOUD_SMALLEST = 120
CLOUD_THINNEST = 3
CLOUD_UNDER_LAND = 16
CLOUDS = {
    'left': {'within': (0, 0, 250, 415), 'red': 48, 'reach': -12, 'beats': 3, 'lag': 0.15, 'near': False},
    'right': {'within': (880, 0, 1122, 300), 'red': 48, 'reach': 12, 'beats': 2, 'lag': 0.55, 'near': False},
    'horizon': {'within': (495, 300, 1122, 450), 'red': 100, 'reach': 7, 'beats': 2, 'lag': 0.0, 'near': True},
}
CLOUD_BANK = (704, 338, 882, 394)
CLOUD_BANK_FADE = 18
CLOUD_FURTHER_OFF = (0.93, 0.95, 1.0)
CLOUD_FILLS = [
    {'left': 606, 'foot': 400, 'scale': 1.08, 'turned': True},
    {'left': 505, 'foot': 398, 'scale': 1.0, 'turned': True},
    {'left': 648, 'foot': 416, 'scale': 1.0, 'turned': True},
    {'left': 560, 'foot': 414, 'scale': 1.0, 'turned': True},
]

BILLOWS = {
    'low-left': {'within': (0, 1160, 310, 1402), 'anchor': (0, 1)},
    'low-right': {'within': (940, 1230, 1122, 1402), 'anchor': (1, 1)},
}
BILLOW_SMALLEST = 2000

GULLS = [(1004, 488, 1078, 532), (1034, 550, 1088, 592), (1034, 798, 1088, 842), (838, 1016, 902, 1054)]
GULL_WHITE = 170

TREES = [
    {'box': (562, 352, 614, 432), 'kind': 'pine'},
    {'box': (604, 368, 646, 436), 'kind': 'pine'},
    {'box': (497, 380, 533, 436), 'kind': 'pine'},
    {'box': (536, 390, 566, 436), 'kind': 'pine'},
    {'box': (642, 394, 680, 446), 'kind': 'pine'},
    {'box': (744, 426, 782, 480), 'kind': 'pine'},
    {'box': (100, 296, 162, 400), 'kind': 'pine'},
    {'box': (48, 326, 94, 400), 'kind': 'pine'},
    {'box': (158, 341, 198, 402), 'kind': 'pine'},
    {'box': (905, 368, 937, 410), 'kind': 'pine'},
    {'box': (780, 692, 820, 768), 'kind': 'pine'},
    {'box': (850, 722, 898, 802), 'kind': 'pine'},
    {'box': (258, 872, 352, 940), 'kind': 'palm', 'among_leaves': True, 'pivot': (305, 925)},
    {'box': (908, 770, 962, 816), 'kind': 'palm', 'pivot': (935, 808)},
    {'box': (36, 960, 152, 1064), 'kind': 'palm', 'among_leaves': True, 'pivot': (95, 1035)},
    {'box': (116, 1042, 208, 1128), 'kind': 'palm', 'among_leaves': True, 'pivot': (160, 1100)},
    {'box': (188, 1118, 262, 1190), 'kind': 'palm', 'among_leaves': True, 'pivot': (225, 1165)},
    {'box': (240, 1190, 330, 1260), 'kind': 'palm', 'among_leaves': True, 'pivot': (285, 1235)},
    {'box': (305, 1240, 392, 1305), 'kind': 'palm', 'among_leaves': True, 'pivot': (345, 1280)},
    {'box': (420, 1100, 502, 1165), 'kind': 'palm', 'among_leaves': True, 'pivot': (460, 1145)},
    {'box': (690, 1058, 762, 1112), 'kind': 'palm', 'pivot': (725, 1100)},
    {'box': (755, 1052, 805, 1095), 'kind': 'palm', 'pivot': (782, 1085)},
    {'box': (812, 1068, 852, 1100), 'kind': 'palm', 'pivot': (832, 1094)},
    {'box': (640, 1110, 694, 1150), 'kind': 'palm', 'pivot': (668, 1142)},
    {'box': (912, 1122, 960, 1160), 'kind': 'palm', 'pivot': (935, 1150)},
    {'box': (985, 950, 1030, 990), 'kind': 'palm', 'pivot': (1008, 982)},
    {'box': (1035, 955, 1100, 1015), 'kind': 'palm', 'pivot': (1070, 1004)},
]
PINE_FADE = 0.35
LAND_BEHIND = (0.8, 0.96)
PALM_LIME_RED = 105
TREE_SWAY = {'pine': 3.2, 'palm': 5.5}

WATER_SHEETS = 3
WATER_SCALE = 0.5
WATER_INSET = 9
WATER_EVERY = 34
WATER_FLOW = (-5.0, 2.0)
WATER_STAGES = (0.5, 1.0, 0.5)
WATER_SEED = 20261002

FALLS = [
    {'box': (96, 798, 162, 886), 'spray': (160, 886, 56)},
    {'box': (258, 1076, 316, 1164), 'spray': (288, 1168, 66)},
    {'box': (232, 998, 294, 1040), 'spray': (262, 1042, 50)},
]
FALL_TILE = 48
FALL_STREAK_EVERY = 70
FALL_WHITE = (255, 255, 255, 190)
FALL_BLUE = (60, 128, 224, 135)
FALL_SEED = 20261003

WARM = (255, 206, 120)
WINDOW = (255, 234, 164)
WINDOW_HALO = 9
WINDOWS = [
    (605, 591, 5, 7), (622, 594, 3, 5), (636, 591, 2, 5), (603, 573, 2, 2),
    (567, 797, 3, 6), (605, 783, 4, 7), (595, 802, 3, 6), (612, 797, 3, 6),
    (702, 1171, 2, 4), (712, 1168, 2, 4),
    (987, 567, 4, 6), (996, 568, 5, 6), (1005, 567, 4, 6),
    (986, 602, 3, 6), (1004, 604, 3, 7), (985, 638, 3, 7),
    (1022, 661, 2, 4), (1041, 658, 2, 5),
]
VILLAGE_LAMPS = [
    (204, 962), (221, 982), (290, 947), (343, 950),
    (592, 603), (648, 602), (552, 814), (626, 814),
    (680, 1183), (722, 1181), (1048, 673),
]
VILLAGE_LAMP_CORE = 2.4
VILLAGE_LAMP_HALO = 15
VILLAGE_SHEETS = 2
LIGHTHOUSE_LAMP = (996, 568)
LAMP_GLOW = 76
LAMP_BEAM = (380, 44)
LAMP_RING = 150

POOLS = [
    {'box': (148, 876, 304, 968), 'ring': (188, 906, 104)},
    {'box': (234, 1032, 302, 1084), 'ring': (266, 1052, 58)},
    {'box': (258, 1148, 436, 1252), 'ring': (350, 1208, 132)},
]
POOL_RING = (256, 116)


def sky_of(pixels):
    red, blue = pixels[..., 0], pixels[..., 2]
    blue_enough = (blue >= SKY_BLUE_AT_LEAST) & (red <= SKY_RED_AT_MOST) & (blue - red >= SKY_BLUE_OVER_RED)
    rows = np.arange(pixels.shape[0])[:, None]
    blue_above_the_sea = blue_enough & (rows <= SEA_LINE)

    open_water = ndimage.binary_opening(blue_above_the_sea, iterations=OPEN_SKY_NECK)
    labels, _ = ndimage.label(open_water)
    from_the_top = np.unique(labels[0])
    open_sky = np.isin(labels, from_the_top[from_the_top > 0])

    joined = ndimage.binary_dilation(open_sky, iterations=OPEN_SKY_NECK + 1) & blue_above_the_sea
    pockets = ndimage.binary_opening(blue_above_the_sea & (pixels[..., 1] >= POCKET_GREEN), iterations=1)

    return joined | pockets


def water_of(pixels):
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    rows = np.arange(pixels.shape[0])[:, None]

    return ((rows > SEA_LINE) & (red <= WATER_RED_AT_MOST) & (blue >= SKY_BLUE_AT_LEAST)
            & (blue - red >= WATER_BLUE_OVER_RED) & (green >= 90))


def inside(shape, box):
    left, top, right, bottom = box
    area = np.zeros(shape, dtype=bool)
    area[top:bottom, left:right] = True
    return area


def mountains_of(shape):
    drawn = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(drawn).polygon(MOUNTAINS, fill=255)
    return np.asarray(drawn) > 0


def larger_than(mask, smallest):
    labels, count = ndimage.label(mask)
    if count == 0:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    return np.isin(labels, 1 + np.where(sizes >= smallest)[0])


def clouds_of(pixels, water):
    red, blue = pixels[..., 0], pixels[..., 2]
    mountains = mountains_of(pixels.shape[:2])
    found = {}

    for name, cloud in CLOUDS.items():
        here = inside(pixels.shape[:2], cloud['within'])
        white = (red >= cloud['red']) & (blue >= CLOUD_BLUE_AT_LEAST) & here & ~mountains & ~water
        billowy = ndimage.binary_opening(white, iterations=CLOUD_THINNEST)
        billowy = ndimage.binary_dilation(billowy, iterations=CLOUD_THINNEST + 1) & white
        found[name] = larger_than(billowy, CLOUD_SMALLEST)

    return found


def spread(pixels, known):
    """What lies round a hole, carried into it: near things count most."""
    weight = np.zeros(pixels.shape[:2], dtype=np.float32)
    total = np.zeros_like(pixels)
    seen = known.astype(np.float32)

    for sigma in (1.5, 3, 6, 12, 24, 48, 96):
        favour = sigma ** -3.0
        weight += favour * ndimage.gaussian_filter(seen, sigma)
        for channel in range(pixels.shape[2]):
            total[..., channel] += favour * ndimage.gaussian_filter(pixels[..., channel] * seen, sigma)

    return total / np.maximum(weight, 1e-9)[..., None]


def filled(pixels, hole, known):
    return np.where(hole[..., None], spread(pixels, known & ~hole), pixels)


def spread_near(pixels, hole, box):
    """The same, worked out only round one small hole."""
    top = max(0, box[1] - NEAR)
    left = max(0, box[0] - NEAR)
    bottom = min(pixels.shape[0], box[3] + NEAR)
    right = min(pixels.shape[1], box[2] + NEAR)
    around = pixels.copy()
    around[top:bottom, left:right] = spread(pixels[top:bottom, left:right], ~hole[top:bottom, left:right])
    return around


def lifted(pixels, keep):
    """Everything kept, soft at its edge, with no colour of what was cut away."""
    gone = ~keep
    below_the_sea_line = np.arange(pixels.shape[0])[:, None] > SEA_LINE
    solid = ~ndimage.binary_dilation(gone, iterations=RIM) | (keep & below_the_sea_line)
    alpha = 1.0 - ndimage.gaussian_filter(gone.astype(np.float32), EDGE_SOFTNESS)
    alpha = np.where(solid, 1.0, np.clip(alpha, 0.0, 1.0))
    alpha = np.where(gone & (alpha < 0.08), 0.0, alpha)

    if not solid.any():
        return np.dstack([pixels, alpha * 0])
    nearest = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    colour = np.where(solid[..., None], pixels, pixels[nearest[0], nearest[1]])

    return np.dstack([colour, alpha * 255])


def as_image(rgba):
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')


def cloud_bank(cloud_layer):
    bank = np.asarray(cloud_layer.crop(CLOUD_BANK)).astype(np.float32)
    labels, count = ndimage.label(bank[..., 3] > 127)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    largest = ndimage.binary_dilation(labels == 1 + int(np.argmax(sizes)), iterations=2)
    bank[..., 3] = np.where(largest, bank[..., 3], 0)
    fade = np.clip((bank.shape[1] - np.arange(bank.shape[1])) / CLOUD_BANK_FADE, 0, 1)
    bank[..., 3] *= fade[None, :]
    bank[..., :3] *= np.array(CLOUD_FURTHER_OFF, dtype=np.float32)

    return as_image(bank)


def filled_out(cloud_layer):
    bank = cloud_bank(cloud_layer)
    further_off = Image.new('RGBA', cloud_layer.size, (0, 0, 0, 0))

    for fill in CLOUD_FILLS:
        cloud = bank.transpose(Image.FLIP_LEFT_RIGHT) if fill['turned'] else bank
        size = (round(cloud.width * fill['scale']), round(cloud.height * fill['scale']))
        cloud = cloud.resize(size, Image.LANCZOS)
        further_off.alpha_composite(cloud, (fill['left'], fill['foot'] - cloud.height))

    above_the_sea = np.asarray(further_off).copy()
    above_the_sea[SEA_LINE + 1:, :, 3] = 0

    return Image.alpha_composite(Image.fromarray(above_the_sea, 'RGBA'), cloud_layer)


def carried_under(cloud_layer, land):
    """The cloud, carried on a little way under the land in its own colour."""
    rgba = np.asarray(cloud_layer).astype(np.float32)
    there = rgba[..., 3] > 200
    if not there.any():
        return cloud_layer
    distance, nearest = ndimage.distance_transform_edt(~there, return_indices=True)
    under = land & ~mountains_of(land.shape) & (distance <= CLOUD_UNDER_LAND) & ~there
    rgba[under] = rgba[nearest[0][under], nearest[1][under]]
    rgba[under, 3] = 255

    return as_image(rgba)


def cropped(image):
    box = image.getchannel('A').point(lambda value: 255 if value > 6 else 0).getbbox()
    return image.crop(box), box


def tree_of(pixels, tree):
    left, top, right, bottom = tree['box']
    patch = pixels[top:bottom, left:right]
    red, green, blue = patch[..., 0], patch[..., 1], patch[..., 2]
    leafy = (green > blue + 25) & (green > red - 12)
    rows, columns = np.mgrid[0:bottom - top, 0:right - left]

    if tree['kind'] == 'palm':
        if tree.get('among_leaves'):
            leafy &= red >= PALM_LIME_RED
        across, down = (right - left) / 2, (bottom - top) / 2
        leafy &= ((columns - across) / across) ** 2 + ((rows - down) / down) ** 2 <= 1
        leafy = ndimage.binary_closing(leafy, iterations=2)

    labels, count = ndimage.label(leafy)
    if count == 0:
        raise SystemExit(f'no tree found in {tree["box"]}')
    sizes = ndimage.sum(leafy, labels, range(1, count + 1))
    crown = ndimage.binary_fill_holes(labels == 1 + int(np.argmax(sizes)))
    crown = ndimage.binary_dilation(crown, iterations=2 if tree['kind'] == 'palm' else 1)

    alpha = np.clip(ndimage.gaussian_filter(crown.astype(np.float32), 0.8) * 1.3, 0, 1)
    if tree['kind'] == 'pine':
        height = bottom - top
        rise = np.clip((height - rows) / (height * PINE_FADE), 0, 1)
        alpha *= rise * rise * (3 - 2 * rise)

    whole = np.zeros(pixels.shape[:2], dtype=np.float32)
    whole[top:bottom, left:right] = alpha
    return whole


def water_sheets(water, shape):
    """Wave marks: each stroke drawn three times, a little further along each time."""
    height, width = shape
    random = np.random.default_rng(WATER_SEED)
    calm = ndimage.binary_erosion(water, iterations=WATER_INSET)
    sheets = [Image.new('RGBA', (width, height), (255, 255, 255, 0)) for _ in range(WATER_SHEETS)]
    pens = [ImageDraw.Draw(sheet) for sheet in sheets]

    def stroke(first_sheet, at, flow, draw):
        for stage in range(WATER_SHEETS):
            where = (at[0] + flow[0] * stage, at[1] + flow[1] * stage)
            draw(pens[(first_sheet + stage) % WATER_SHEETS], where, WATER_STAGES[stage])

    def on_calm_water(x, y, flow):
        for stage in range(WATER_SHEETS):
            column, row = int(x + flow[0] * stage), int(y + flow[1] * stage)
            if not (0 <= row < height and 12 <= column < width - 12):
                return False
            if not (calm[row, column - 9] and calm[row, column + 9]):
                return False
        return True

    for row in range(SEA_LINE + WATER_EVERY // 2, height, WATER_EVERY):
        for column in range(WATER_EVERY // 2, width, WATER_EVERY):
            x = column + random.uniform(-0.45, 0.45) * WATER_EVERY
            y = row + random.uniform(-0.45, 0.45) * WATER_EVERY
            length, sag = random.uniform(14, 24), random.uniform(2.6, 4.4)
            first = int(random.integers(0, WATER_SHEETS))
            if not on_calm_water(x, y, WATER_FLOW):
                continue

            def wave(pen, where, strength, length=length, sag=sag):
                box = (where[0] - length / 2, where[1] - sag, where[0] + length / 2, where[1] + sag)
                pen.arc(box, 200, 340, fill=(255, 255, 255, round(255 * strength)), width=3)

            stroke(first, (x, y), WATER_FLOW, wave)

    small = (round(width * WATER_SCALE), round(height * WATER_SCALE))
    return [sheet.resize(small, Image.LANCZOS) for sheet in sheets]


def moving_water(pixels, box):
    """The largest stretch of water, falling or pooled, inside a box."""
    left, top, right, bottom = box
    patch = pixels[top:bottom, left:right]
    red, green, blue = patch[..., 0], patch[..., 1], patch[..., 2]
    watery = (blue >= 170) & (blue - red >= 60) & (green <= blue + 10)
    pale = (patch.min(axis=2) >= 165) & (blue >= 215)
    found = ndimage.binary_closing(watery | pale, iterations=2)
    labels, count = ndimage.label(found)
    if count == 0:
        raise SystemExit(f'no water found in {box}')
    sizes = ndimage.sum(found, labels, range(1, count + 1))
    largest = ndimage.binary_fill_holes(labels == 1 + int(np.argmax(sizes)))

    whole = np.zeros(pixels.shape[:2], dtype=bool)
    whole[top:bottom, left:right] = largest
    return whole


def cover_of(base, moving, box):
    left, top, right, bottom = box
    open_part = np.clip(ndimage.gaussian_filter(moving.astype(np.float32), 1.0) * 1.4 - 0.2, 0, 1)
    return as_image(np.dstack([base[top:bottom, left:right], (1 - open_part[top:bottom, left:right]) * 255]))


def ring_of(width, height):
    rows, columns = np.mgrid[0:height, 0:width]
    away = np.hypot((columns - (width - 1) / 2) / (width / 2), (rows - (height - 1) / 2) / (height / 2))
    alpha = np.exp(-((away - 0.82) / 0.11) ** 2)
    return as_image(np.dstack([np.full((height, width, 3), 255, dtype=np.float32), alpha * 255]))


def streaks_of(fall, random):
    left, top, right, bottom = fall['box']
    width, height = right - left, bottom - top
    tall = height + FALL_TILE
    white = np.zeros((tall, width), dtype=np.float32)
    blue = np.zeros((tall, width), dtype=np.float32)
    rows = np.arange(tall)[:, None]
    columns = np.arange(width)[None, :]
    for _ in range(max(6, width * FALL_TILE // FALL_STREAK_EVERY)):
        x = random.uniform(3, width - 3)
        y = random.uniform(0, FALL_TILE)
        length = random.uniform(16, 30)
        thick = random.uniform(0.9, 1.7)
        sheet = white if random.random() < 0.55 else blue
        across = np.exp(-((columns - x) / thick) ** 2)
        for again in range(-1, tall // FALL_TILE + 2):
            along = np.clip(1 - np.abs(rows - (y + again * FALL_TILE + length / 2)) / (length / 2), 0, 1)
            np.maximum(sheet, across * along ** 0.7, out=sheet)

    strength = np.maximum(white * FALL_WHITE[3], blue * FALL_BLUE[3])
    colour = np.where((white * FALL_WHITE[3] >= blue * FALL_BLUE[3])[..., None],
                      np.array(FALL_WHITE[:3], dtype=np.float32), np.array(FALL_BLUE[:3], dtype=np.float32))
    return as_image(np.dstack([colour, strength]))


def glow_of(size, colour, strength, power):
    half = (size - 1) / 2
    rows, columns = np.mgrid[0:size, 0:size]
    away = np.hypot(rows - half, columns - half) / half
    alpha = strength * np.clip(1 - away, 0, 1) ** power
    return as_image(np.dstack([np.broadcast_to(np.array(colour, dtype=np.float32), (size, size, 3)), alpha * 255]))


def beam_of(length, height, colour):
    """Twin beams, one each way from the lamp in the middle."""
    rows, columns = np.mgrid[0:height, 0:length]
    along = np.abs(columns - (length - 1) / 2) / (length / 2)
    half_width = 1.5 + (height / 2 - 2) * along
    across = np.clip(1 - np.abs(rows - (height - 1) / 2) / half_width, 0, 1)
    alpha = 0.8 * (1 - along) ** 1.25 * across ** 1.6
    return as_image(np.dstack([np.broadcast_to(np.array(colour, dtype=np.float32), (height, length, 3)), alpha * 255]))


def pulse_of(size, colour):
    """A ring of light, to spread from the lamp each time it flashes."""
    half = (size - 1) / 2
    rows, columns = np.mgrid[0:size, 0:size]
    away = np.hypot(rows - half, columns - half) / half
    alpha = 0.9 * np.exp(-((away - 0.8) / 0.11) ** 2) + 0.25 * np.clip(0.8 - away, 0, 1)
    return as_image(np.dstack([np.broadcast_to(np.array(colour, dtype=np.float32), (size, size, 3)), np.clip(alpha, 0, 1) * 255]))


def lit_sheet(shape, halos, cores):
    """Soft warm halos, and over them the bright thing each one comes from."""
    height, width = shape
    alpha = np.zeros(shape, dtype=np.float32)
    rows, columns = np.mgrid[0:height, 0:width]
    for x, y, radius, strength in halos:
        top, bottom = max(0, int(y - radius)), min(height, int(y + radius) + 1)
        left, right = max(0, int(x - radius)), min(width, int(x + radius) + 1)
        away = np.hypot(rows[top:bottom, left:right] - y, columns[top:bottom, left:right] - x) / radius
        alpha[top:bottom, left:right] = np.maximum(
            alpha[top:bottom, left:right], strength * np.clip(1 - away, 0, 1) ** 2)

    sheet = as_image(np.dstack([np.broadcast_to(np.array(WARM, dtype=np.float32), (height, width, 3)), alpha * 255]))
    bright = Image.new('RGBA', (width, height), (*WINDOW, 0))
    pen = ImageDraw.Draw(bright)
    for shape_of, box in cores:
        getattr(pen, shape_of)(box, fill=(*WINDOW, 255))
    bright = Image.fromarray(np.dstack([
        np.asarray(bright)[..., :3],
        ndimage.gaussian_filter(np.asarray(bright)[..., 3].astype(np.float32), 0.45).astype(np.uint8),
    ]), 'RGBA')

    return Image.alpha_composite(sheet, bright)


def lights_of(shape, land, moving):
    windows = lit_sheet(
        shape,
        [(x, y, WINDOW_HALO + max(w, h), 0.55) for x, y, w, h in WINDOWS],
        [('rectangle', (x - w / 2, y - h / 2, x + w / 2, y + h / 2)) for x, y, w, h in WINDOWS],
    )

    adrift = [lamp for lamp in VILLAGE_LAMPS if not land[lamp[1], lamp[0]]]
    swaying = [lamp for lamp in VILLAGE_LAMPS if moving[lamp[1], lamp[0]]]
    if adrift or swaying:
        raise SystemExit(f'lamps not on land: {adrift}; lamps on a tree that sways: {swaying}')

    village = []
    for sheet in range(VILLAGE_SHEETS):
        lamps = VILLAGE_LAMPS[sheet::VILLAGE_SHEETS]
        village.append(lit_sheet(
            shape,
            [(x, y, VILLAGE_LAMP_HALO, 0.6) for x, y in lamps],
            [('ellipse', (x - VILLAGE_LAMP_CORE, y - VILLAGE_LAMP_CORE, x + VILLAGE_LAMP_CORE, y + VILLAGE_LAMP_CORE))
             for x, y in lamps],
        ))

    return windows, village


def frame_of(box):
    return f'{{ x: {box[0]}, y: {box[1]}, width: {box[2] - box[0]}, height: {box[3] - box[1]} }}'


def take_apart(picture):
    pixels = np.asarray(picture).astype(np.float32)
    shape = pixels.shape[:2]
    sky = sky_of(pixels)
    water = water_of(pixels)
    clouds = clouds_of(pixels, water)
    cloud = np.zeros(shape, dtype=bool)
    for found in clouds.values():
        cloud |= found
    land = ~(sky | cloud | water)

    parts = {'clouds': [], 'billows': [], 'trees': [], 'water': [], 'falls': [], 'pools': [], 'village': []}

    base = pixels.copy()
    cloud_gone = ndimage.binary_dilation(cloud, iterations=RIM + 1) & ~land
    base = filled(base, cloud_gone, (sky | water) & ~cloud)

    gulls = np.zeros(shape, dtype=bool)
    for box in GULLS:
        gulls |= inside(shape, box) & (pixels.min(axis=2) >= GULL_WHITE)
    gulls = ndimage.binary_dilation(gulls, iterations=3)
    for box in GULLS:
        here = gulls & inside(shape, box)
        base = np.where(here[..., None], spread_near(base, here, box), base)

    land_rgba = lifted(pixels, land)
    land_rgba[..., :3] *= land_rgba[..., 3:4] / 255.0

    for index, tree in enumerate(TREES, 1):
        alpha = tree_of(pixels, tree)
        sprite, box = cropped(as_image(np.dstack([pixels, alpha * 255])))
        left, top, right, bottom = tree['box']
        pivot = tree.get('pivot', ((left + right) / 2, bottom))
        in_front = bottom <= BAND_BOTTOM

        hole = alpha > 0.02
        around = spread_near(base, hole, tree['box'])
        base = base * (1 - alpha[..., None]) + around * alpha[..., None]
        if in_front:
            behind = spread_near(land_rgba, hole, tree['box'])
            mostly_land = np.clip((behind[..., 3:4] / 255.0 - LAND_BEHIND[0]) / (LAND_BEHIND[1] - LAND_BEHIND[0]), 0, 1)
            colour = behind[..., :3] / np.maximum(behind[..., 3:4] / 255.0, 1e-6)
            behind = np.dstack([colour * mostly_land, mostly_land * 255])
            land_rgba = land_rgba * (1 - alpha[..., None]) + behind * alpha[..., None]

        parts['trees'].append({
            'name': f'island-tree-{index:02d}', 'image': sprite, 'box': box, 'pivot': pivot,
            'sway': TREE_SWAY[tree['kind']], 'in_front': in_front,
        })

    visible = np.maximum(land_rgba[..., 3:4], 1e-6) / 255.0
    land_rgba[..., :3] = np.where(land_rgba[..., 3:4] > 0.5, land_rgba[..., :3] / visible, 0)
    land_image = as_image(land_rgba).crop((0, BAND_TOP, picture.width, BAND_BOTTOM))

    for name, found in clouds.items():
        layer = as_image(lifted(pixels, found))
        if CLOUDS[name]['near']:
            layer = filled_out(layer)
        layer = carried_under(layer, land)
        sprite, box = cropped(layer)
        parts['clouds'].append({'name': f'island-cloud-{name}', 'image': sprite, 'box': box, **CLOUDS[name]})

    for name, billow in BILLOWS.items():
        white = inside(shape, billow['within']) & (pixels.min(axis=2) >= 150) & (pixels[..., 2] >= 200)
        white = ndimage.binary_fill_holes(larger_than(white, BILLOW_SMALLEST))
        soft = np.clip(ndimage.gaussian_filter(white.astype(np.float32), 1.6) * 1.2 - 0.1, 0, 1)
        sprite, box = cropped(as_image(np.dstack([pixels, soft * 255])))
        parts['billows'].append({'name': f'island-billow-{name}', 'image': sprite, 'box': box, 'anchor': billow['anchor']})

    for index, sheet in enumerate(water_sheets(water, shape), 1):
        parts['water'].append({'name': f'island-water-{index}', 'image': sheet})

    random = np.random.default_rng(FALL_SEED)
    moving_parts = np.zeros(shape, dtype=bool)
    for place in FALLS + POOLS:
        moving_parts |= moving_water(pixels, place['box'])
    for index, fall in enumerate(FALLS, 1):
        parts['falls'].append({
            'name': f'island-fall-{index}', 'streaks': streaks_of(fall, random),
            'cover': cover_of(base, moving_parts, fall['box']), **fall,
        })
    for index, pool in enumerate(POOLS, 1):
        parts['pools'].append({'name': f'island-pool-{index}', 'cover': cover_of(base, moving_parts, pool['box']), **pool})

    moving = np.zeros(shape, dtype=bool)
    for tree in parts['trees']:
        moving[tree['box'][1]:tree['box'][3], tree['box'][0]:tree['box'][2]] = True
    windows, village = lights_of(shape, land, moving)
    lit, lit_box = cropped(windows)
    parts['windows'] = {'name': 'island-lit-windows', 'image': lit, 'box': lit_box}
    for index, sheet in enumerate(village, 1):
        lamps, lamps_box = cropped(sheet)
        parts['village'].append({'name': f'island-lit-village-{index}', 'image': lamps, 'box': lamps_box})

    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), 'RGB'), land_image, parts


def write_module(picture, parts):
    def source(name):
        return f"require('@/assets/images/island/{name}.webp')"

    lines = [
        '// Written by scripts/prepare-island-art.py. Change the script, not this file.',
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        'export interface ArtFrame {',
        '  readonly x: number;',
        '  readonly y: number;',
        '  readonly width: number;',
        '  readonly height: number;',
        '}',
        '',
        'export interface IslandCloudArt {',
        '  readonly id: string;',
        '  readonly source: ImageSourcePropType;',
        '  readonly frame: ArtFrame;',
        '  readonly reach: number;',
        '  readonly beats: number;',
        '  readonly lag: number;',
        '}',
        '',
        'export interface IslandBillowArt {',
        '  readonly id: string;',
        '  readonly source: ImageSourcePropType;',
        '  readonly frame: ArtFrame;',
        '  readonly anchorX: 0 | 1;',
        '  readonly anchorY: 0 | 1;',
        '}',
        '',
        'export interface IslandTreeArt {',
        '  readonly id: string;',
        '  readonly source: ImageSourcePropType;',
        '  readonly frame: ArtFrame;',
        '  readonly pivotX: number;',
        '  readonly pivotY: number;',
        '  readonly sway: number;',
        '}',
        '',
        'export interface IslandFallArt {',
        '  readonly id: string;',
        '  readonly streaks: ImageSourcePropType;',
        '  readonly cover: ImageSourcePropType;',
        '  readonly frame: ArtFrame;',
        '  readonly tile: number;',
        '  readonly sprayX: number;',
        '  readonly sprayY: number;',
        '  readonly spraySize: number;',
        '}',
        '',
        'export interface IslandPoolArt {',
        '  readonly id: string;',
        '  readonly cover: ImageSourcePropType;',
        '  readonly frame: ArtFrame;',
        '  readonly ringX: number;',
        '  readonly ringY: number;',
        '  readonly ringWidth: number;',
        '}',
        '',
        'export interface IslandSheetArt {',
        '  readonly id: string;',
        '  readonly source: ImageSourcePropType;',
        '  readonly frame: ArtFrame;',
        '}',
        '',
        'export interface IslandLampArt {',
        '  readonly x: number;',
        '  readonly y: number;',
        '  readonly glow: ImageSourcePropType;',
        '  readonly glowSize: number;',
        '  readonly beam: ImageSourcePropType;',
        '  readonly beamLength: number;',
        '  readonly beamHeight: number;',
        '  readonly pulse: ImageSourcePropType;',
        '  readonly pulseSize: number;',
        '}',
        '',
        'export interface IslandArt {',
        '  readonly picture: ImageSourcePropType;',
        '  readonly horizon: ImageSourcePropType;',
        '  readonly width: number;',
        '  readonly height: number;',
        '  readonly bandTop: number;',
        '  readonly bandBottom: number;',
        '  readonly seaLine: number;',
        '  readonly sunX: number;',
        '  readonly faceFloor: number;',
        '  readonly farClouds: readonly IslandCloudArt[];',
        '  readonly nearClouds: readonly IslandCloudArt[];',
        '  readonly billows: readonly IslandBillowArt[];',
        '  readonly lowTrees: readonly IslandTreeArt[];',
        '  readonly horizonTrees: readonly IslandTreeArt[];',
        '  readonly water: readonly ImageSourcePropType[];',
        '  readonly falls: readonly IslandFallArt[];',
        '  readonly spray: ImageSourcePropType;',
        '  readonly pools: readonly IslandPoolArt[];',
        '  readonly ring: ImageSourcePropType;',
        '  readonly ringAspect: number;',
        '  readonly litWindows: IslandSheetArt;',
        '  readonly villageLamps: readonly IslandSheetArt[];',
        '  readonly lighthouse: IslandLampArt;',
        '}',
        '',
        'export const ISLAND_ART: IslandArt = {',
        f"  picture: {source('island-base')},",
        f"  horizon: {source('island-land')},",
        f'  width: {picture.width},',
        f'  height: {picture.height},',
        f'  bandTop: {BAND_TOP},',
        f'  bandBottom: {BAND_BOTTOM},',
        f'  seaLine: {SEA_LINE},',
        f'  sunX: {SUN_X},',
        f'  faceFloor: {FACE_FLOOR},',
    ]

    def clouds(key, near):
        lines.append(f'  {key}: [')
        for cloud in parts['clouds']:
            if cloud['near'] == near:
                lines.append(
                    f"    {{ id: '{cloud['name']}', source: {source(cloud['name'])}, frame: {frame_of(cloud['box'])}, "
                    f"reach: {cloud['reach']}, beats: {cloud['beats']}, lag: {cloud['lag']} }},")
        lines.append('  ],')

    clouds('farClouds', False)
    clouds('nearClouds', True)

    lines.append('  billows: [')
    for billow in parts['billows']:
        lines.append(
            f"    {{ id: '{billow['name']}', source: {source(billow['name'])}, frame: {frame_of(billow['box'])}, "
            f"anchorX: {billow['anchor'][0]}, anchorY: {billow['anchor'][1]} }},")
    lines.append('  ],')

    def trees(key, in_front):
        lines.append(f'  {key}: [')
        for tree in parts['trees']:
            if tree['in_front'] == in_front:
                lines.append(
                    f"    {{ id: '{tree['name']}', source: {source(tree['name'])}, frame: {frame_of(tree['box'])}, "
                    f"pivotX: {tree['pivot'][0]:g}, pivotY: {tree['pivot'][1]:g}, sway: {tree['sway']} }},")
        lines.append('  ],')

    trees('lowTrees', False)
    trees('horizonTrees', True)

    lines.append('  water: [')
    for sheet in parts['water']:
        lines.append(f"    {source(sheet['name'])},")
    lines += ['  ],', '  falls: [']
    for fall in parts['falls']:
        lines.append(
            f"    {{ id: '{fall['name']}', streaks: {source(fall['name'] + '-streaks')}, "
            f"cover: {source(fall['name'] + '-cover')}, frame: {frame_of(fall['box'])}, tile: {FALL_TILE}, "
            f"sprayX: {fall['spray'][0]}, sprayY: {fall['spray'][1]}, spraySize: {fall['spray'][2]} }},")
    lines += ['  ],', f"  spray: {source('island-spray')},", '  pools: [']
    for pool in parts['pools']:
        lines.append(
            f"    {{ id: '{pool['name']}', cover: {source(pool['name'] + '-cover')}, frame: {frame_of(pool['box'])}, "
            f"ringX: {pool['ring'][0]}, ringY: {pool['ring'][1]}, ringWidth: {pool['ring'][2]} }},")
    lines += ['  ],', f"  ring: {source('island-ring')},", f'  ringAspect: {POOL_RING[0] / POOL_RING[1]:.4f},']
    windows = parts['windows']
    lines.append(
        f"  litWindows: {{ id: '{windows['name']}', source: {source(windows['name'])}, frame: {frame_of(windows['box'])} }},")
    lines.append('  villageLamps: [')
    for sheet in parts['village']:
        lines.append(f"    {{ id: '{sheet['name']}', source: {source(sheet['name'])}, frame: {frame_of(sheet['box'])} }},")
    lines += [
        '  ],',
        '  lighthouse: {',
        f'    x: {LIGHTHOUSE_LAMP[0]},',
        f'    y: {LIGHTHOUSE_LAMP[1]},',
        f"    glow: {source('island-lamp-glow')},",
        f'    glowSize: {LAMP_GLOW},',
        f"    beam: {source('island-lamp-beam')},",
        f'    beamLength: {LAMP_BEAM[0]},',
        f'    beamHeight: {LAMP_BEAM[1]},',
        f"    pulse: {source('island-lamp-pulse')},",
        f'    pulseSize: {LAMP_RING},',
        '  },',
        '};',
        '',
    ]

    with open(MODULE_PATH, 'w') as module:
        module.write('\n'.join(lines))


def put_together(base, land, parts, moved, tree_turn, face=None, face_width=0):
    scene = base.convert('RGBA')
    for sheet in parts['water'][:1]:
        scene.alpha_composite(sheet['image'].resize(scene.size, Image.LANCZOS))

    def trees(in_front):
        for tree in parts['trees']:
            if tree['in_front'] != in_front:
                continue
            layer = Image.new('RGBA', scene.size, (0, 0, 0, 0))
            layer.paste(tree['image'], tree['box'][:2])
            if tree_turn:
                layer = layer.rotate(tree_turn * tree['sway'], center=tree['pivot'], resample=Image.BICUBIC)
            scene.alpha_composite(layer)

    def clouds(near):
        for cloud in parts['clouds']:
            if cloud['near'] == near:
                layer = Image.new('RGBA', scene.size, (0, 0, 0, 0))
                layer.paste(cloud['image'], (cloud['box'][0] + round(cloud['reach'] * moved), cloud['box'][1]))
                scene.alpha_composite(layer)

    trees(False)
    clouds(False)
    if face is not None:
        disc = Image.new('RGBA', scene.size, (0, 0, 0, 0))
        disc.paste(face.resize((face_width, face_width), Image.LANCZOS),
                   (SUN_X - face_width // 2, FACE_FLOOR - round(0.76 * face_width)))
        mask = Image.new('L', scene.size, 0)
        ImageDraw.Draw(mask).rectangle((0, 0, scene.width, SEA_LINE), fill=255)
        scene = Image.composite(Image.alpha_composite(scene, disc), scene, mask)
    clouds(True)
    scene.alpha_composite(land, (0, BAND_TOP))
    trees(True)
    return scene.convert('RGB')


def write_debug(folder, picture, base, land, parts):
    os.makedirs(folder, exist_ok=True)
    faces = os.path.join(APP_ROOT, 'assets', 'images', 'ui-elements')
    moon = Image.open(os.path.join(faces, 'home-moon.webp')).convert('RGBA')
    sun = Image.open(os.path.join(faces, 'home-sun.webp')).convert('RGBA')

    base.save(os.path.join(folder, 'base.png'))
    at_rest = put_together(base, land, parts, 0, 0)
    at_rest.save(os.path.join(folder, 'at-rest.png'))
    difference = np.abs(np.asarray(at_rest).astype(np.float32) - np.asarray(picture).astype(np.float32)).mean(axis=2)
    print(f'at rest, differs from the painting by {difference.mean():.2f} on average; '
          f'{(difference > 40).mean() * 100:.2f}% of it by more than 40')
    Image.fromarray(np.clip(difference * 4, 0, 255).astype(np.uint8)).save(os.path.join(folder, 'difference.png'))

    night = np.asarray(put_together(base, land, parts, 0, 0, moon, 426)).astype(np.float32)
    night = night * (1 - NIGHT[1]) + np.array(NIGHT[0], dtype=np.float32) * NIGHT[1]
    night = Image.fromarray(night.astype(np.uint8)).convert('RGBA')
    for sheet in [parts['windows']] + parts['village']:
        night.alpha_composite(sheet['image'], sheet['box'][:2])
    glow = glow_of(LAMP_GLOW, (255, 242, 196), 0.8, 1.8)
    night.alpha_composite(glow, (LIGHTHOUSE_LAMP[0] - LAMP_GLOW // 2, LIGHTHOUSE_LAMP[1] - LAMP_GLOW // 2))
    night.alpha_composite(beam_of(*LAMP_BEAM, (255, 240, 190)),
                          (LIGHTHOUSE_LAMP[0] - LAMP_BEAM[0] // 2, LIGHTHOUSE_LAMP[1] - LAMP_BEAM[1] // 2))
    night.convert('RGB').save(os.path.join(folder, 'night.png'))

    falls = base.convert('RGBA')
    for fall in parts['falls']:
        left, top, right, bottom = fall['box']
        falls.alpha_composite(fall['streaks'].crop((0, FALL_TILE // 2, right - left, FALL_TILE // 2 + bottom - top)), (left, top))
    for pool in parts['pools']:
        x, y, width = pool['ring']
        for part_grown in (0.35, 0.7, 1.0):
            size = (round(width * part_grown), round(width * part_grown * POOL_RING[1] / POOL_RING[0]))
            ring = np.asarray(ring_of(*POOL_RING).resize(size, Image.LANCZOS)).astype(np.float32)
            ring[..., 3] *= 0.8 * (1.15 - part_grown)
            falls.alpha_composite(as_image(ring), (x - size[0] // 2, y - size[1] // 2))
    for place in parts['falls'] + parts['pools']:
        falls.alpha_composite(place['cover'], place['box'][:2])
    falls.convert('RGB').save(os.path.join(folder, 'falls.png'))

    put_together(base, land, parts, 1, 1).save(os.path.join(folder, 'moved.png'))
    put_together(base, land, parts, 1, -1).save(os.path.join(folder, 'moved-back.png'))
    for name, face, width in (('moon-phone', moon, 324), ('moon-tablet', moon, 426), ('sun-tablet', sun, 426)):
        for moved in (0, 1):
            put_together(base, land, parts, moved, moved, face, width).crop((0, 0, picture.width, 620)).save(
                os.path.join(folder, f'{name}-{"moved" if moved else "rest"}.png'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug')
    arguments = parser.parse_args()

    picture = Image.open(PICTURE).convert('RGB')
    base, land, parts = take_apart(picture)

    for stale in glob.glob(os.path.join(ART_DIR, '*.webp')):
        if os.path.basename(stale).startswith(MADE_HERE):
            os.remove(stale)

    def save(image, name):
        image.save(os.path.join(ART_DIR, name + '.webp'), 'WEBP', quality=WEBP_QUALITY, method=6)
        print(f'{name}.webp {image.width}x{image.height}')

    save(base, 'island-base')
    save(land, 'island-land')
    for kind in ('clouds', 'billows', 'trees', 'water', 'village'):
        for part in parts[kind]:
            save(part['image'], part['name'])
    for fall in parts['falls']:
        save(fall['streaks'], fall['name'] + '-streaks')
        save(fall['cover'], fall['name'] + '-cover')
    for pool in parts['pools']:
        save(pool['cover'], pool['name'] + '-cover')
    save(ring_of(*POOL_RING), 'island-ring')
    save(parts['windows']['image'], parts['windows']['name'])
    save(glow_of(96, (255, 255, 255), 0.85, 1.6), 'island-spray')
    save(glow_of(128, (255, 242, 196), 1.0, 1.8), 'island-lamp-glow')
    save(beam_of(LAMP_BEAM[0] * 2, LAMP_BEAM[1] * 2, (255, 240, 190)), 'island-lamp-beam')
    save(pulse_of(192, (255, 236, 180)), 'island-lamp-pulse')

    write_module(picture, parts)
    if arguments.debug:
        write_debug(arguments.debug, picture, base, land, parts)


if __name__ == '__main__':
    main()
