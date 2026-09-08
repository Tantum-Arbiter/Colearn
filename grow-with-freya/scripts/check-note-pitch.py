#!/usr/bin/env python3
"""Measure the fundamental pitch of every bundled note sample and flag anything off its
named note. Usage: python3 scripts/check-note-pitch.py [--tolerance-cents 5] [--json]
Requires numpy only. Exit code 1 when any sample is outside tolerance."""
import argparse, glob, json, math, os, sys, wave
import numpy as np

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'music', 'notes')


def load(path):
    with wave.open(path) as w:
        frames, channels, rate = w.getnframes(), w.getnchannels(), w.getframerate()
        samples = np.frombuffer(w.readframes(frames), dtype=np.int16).astype(float)
    if channels == 2:
        samples = samples.reshape(-1, 2).mean(axis=1)
    return samples / 32768.0, rate, channels, frames / rate


def fundamental_hz(samples, rate):
    envelope = np.convolve(np.abs(samples), np.ones(2048) / 2048, 'same')
    peak = int(np.argmax(envelope))
    segment = samples[max(0, peak - int(0.05 * rate)):peak + int(0.45 * rate)]
    if len(segment) < rate // 4:
        segment = samples[:rate // 2]
    size = 1 << int(math.ceil(math.log2(len(segment) * 8)))
    spectrum = np.abs(np.fft.rfft(segment * np.hanning(len(segment)), size))
    freqs = np.fft.rfftfreq(size, 1 / rate)
    product = spectrum.copy()
    for harmonic in (2, 3, 4):
        decimated = spectrum[::harmonic]
        product[:len(decimated)] *= decimated
    lo, hi = np.searchsorted(freqs, 100), np.searchsorted(freqs, 2500)
    index = lo + int(np.argmax(product[lo:hi]))
    left, mid, right = np.log(spectrum[index - 1:index + 2] + 1e-12)
    offset = 0.5 * (left - right) / (left - 2 * mid + right) if (left - 2 * mid + right) != 0 else 0.0
    return float(freqs[index] + offset * (freqs[1] - freqs[0]))


def describe(hz):
    midi = 69 + 12 * math.log2(hz / 440.0)
    nearest = round(midi)
    return NOTE_NAMES[nearest % 12], nearest // 12 - 1, (midi - nearest) * 100


def target_hz(note, octave):
    midi = 12 * (octave + 1) + NOTE_NAMES.index(note)
    return 440.0 * 2 ** ((midi - 69) / 12)


def measure_all():
    rows = []
    for path in sorted(glob.glob(os.path.join(ROOT, '*', '*.wav'))):
        instrument = os.path.basename(os.path.dirname(path))
        named = os.path.splitext(os.path.basename(path))[0]
        samples, rate, channels, duration = load(samples_path := path)
        hz = fundamental_hz(samples, rate)
        note, octave, cents = describe(hz)
        rows.append(dict(instrument=instrument, named=named, path=samples_path, hz=round(hz, 2),
                         detected=f'{note}{octave}', cents=round(cents, 1), duration=round(duration, 2),
                         channels=channels, rate=rate, wrong_note=(note != named)))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tolerance-cents', type=float, default=5.0)
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    rows = measure_all()
    if args.json:
        print(json.dumps(rows, indent=1))
    failures = 0
    for row in rows:
        bad = row['wrong_note'] or abs(row['cents']) > args.tolerance_cents
        failures += bad
        if not args.json:
            mark = 'FAIL' if bad else ' ok '
            print(f"{mark} {row['instrument']:<10} {row['named']}  {row['hz']:8.2f} Hz  {row['detected']:<4} {row['cents']:+6.1f} c  {row['duration']:5.2f} s {row['channels']}ch")
    if not args.json:
        print(f"{len(rows) - failures} in tune, {failures} outside ±{args.tolerance_cents:g} cents")
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
