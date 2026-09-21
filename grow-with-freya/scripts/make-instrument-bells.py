#!/usr/bin/env python3
"""Cut the bell (open end) out of each instrument's body art so the UI can scale it
independently while a note sounds. The cutout is the body art cropped to the bell
frame with its alpha feathered on the side that joins the tube, so the scaled copy
blends back into the unscaled body underneath it.

Frames, origins and scales are fractions of the body art and must match the
`artwork.bell` entry in services/music-asset-registry.ts.

Usage: python3 scripts/make-instrument-bells.py [--preview DIR] [--only trumpet,flute]"""
import argparse, os, sys
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'music', 'instruments')

BELLS = {
    'trumpet': dict(frame=(0.735, 0.0, 1.0, 1.0), feather=dict(left=0.04), origin=(0.76, 0.50), scale=(1.04, 1.07)),
    'saxophone': dict(frame=(0.68, 0.0, 1.0, 1.0), feather=dict(left=0.045), origin=(0.71, 0.565), scale=(1.04, 1.07)),
    'recorder': dict(frame=(0.79, 0.0, 1.0, 1.0), feather=dict(left=0.04), origin=(0.815, 0.50), scale=(1.04, 1.07)),
    'flute': dict(frame=(0.78, 0.0, 1.0, 1.0), feather=dict(left=0.03), origin=(0.805, 0.497), scale=(1.02, 1.04)),
    'clarinet': dict(frame=(0.79, 0.0, 1.0, 1.0), feather=dict(left=0.04), origin=(0.815, 0.5), scale=(1.04, 1.07)),
    'ocarina': dict(frame=(0.72, 0.0, 0.96, 0.34), feather=dict(left=0.05, bottom=0.14), origin=(0.83, 0.30), scale=(1.03, 1.05)),
}


def smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def cut_bell(body, spec):
    width, height = body.size
    x0, y0, x1, y1 = spec['frame']
    box = (int(round(x0 * width)), int(round(y0 * height)), int(round(x1 * width)), int(round(y1 * height)))
    crop = np.array(body.crop(box)).astype(np.float64)
    h, w = crop.shape[:2]
    mask = np.ones((h, w))
    feather = spec['feather']
    if 'left' in feather:
        span = max(1, int(round(feather['left'] * width)))
        ramp = smoothstep(np.arange(w) / span)
        mask *= ramp[None, :]
    if 'bottom' in feather:
        span = max(1, int(round(feather['bottom'] * height)))
        ramp = smoothstep((h - 1 - np.arange(h)) / span)
        mask *= ramp[:, None]
    crop[:, :, 3] *= mask
    return Image.fromarray(crop.round().astype(np.uint8), 'RGBA'), box


def preview(body, bell, box, spec, path):
    width, height = body.size
    ox, oy = spec['origin'][0] * width, spec['origin'][1] * height
    sx, sy = spec['scale']
    scaled = bell.resize((int(round(bell.width * sx)), int(round(bell.height * sy))), Image.LANCZOS)
    left = ox - (ox - box[0]) * sx
    top = oy - (oy - box[1]) * sy
    frames = []
    for overlay, shift in ((bell, (box[0], box[1])), (scaled, (int(round(left)), int(round(top))))):
        canvas = Image.new('RGBA', body.size, (28, 28, 60, 255))
        canvas.alpha_composite(body)
        canvas.alpha_composite(overlay, dest=(max(0, shift[0]), max(0, shift[1])))
        region = (max(0, box[0] - int(0.08 * width)), 0, width, height)
        frames.append(canvas.crop(region))
    sheet = Image.new('RGBA', (frames[0].width, frames[0].height * 2 + 8), (0, 0, 0, 255))
    sheet.paste(frames[0], (0, 0))
    sheet.paste(frames[1], (0, frames[0].height + 8))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.LANCZOS)
    sheet.convert('RGB').save(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', default='')
    parser.add_argument('--only', default='')
    args = parser.parse_args()
    only = {name for name in args.only.split(',') if name}
    for name, spec in BELLS.items():
        if only and name not in only:
            continue
        body = Image.open(os.path.join(ROOT, f'{name}-body.webp')).convert('RGBA')
        bell, box = cut_bell(body, spec)
        target = os.path.join(ROOT, f'{name}-bell.webp')
        bell.save(target, 'WEBP', lossless=True, quality=100, method=6)
        x0, y0, x1, y1 = spec['frame']
        print(f"{name:<10} {bell.width}x{bell.height} px  frame x {x0}-{x1} y {y0}-{y1}  origin {spec['origin']}  "
              f"scale {spec['scale']}  {os.path.getsize(target) // 1024} KB")
        if args.preview:
            os.makedirs(args.preview, exist_ok=True)
            preview(body, bell, box, spec, os.path.join(args.preview, f'{name}-bell-preview.png'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
