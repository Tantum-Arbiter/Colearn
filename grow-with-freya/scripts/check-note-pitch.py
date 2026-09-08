#!/usr/bin/env python3
"""Measure the pitch of every bundled note sample and flag anything off its named note.
A spectral estimate over the held tone (0.5-1.5 s) finds the note; when it lands within
25 cents an autocorrelation pass around the named pitch refines it to sub-cent precision. Usage: python3 scripts/check-note-pitch.py [--tolerance-cents 5] [--json]
Requires numpy only. Exit code 1 when any sample is outside tolerance."""
import argparse, glob, json, math, os, sys, wave
import numpy as np

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
COARSE_WINDOW_CENTS = 60.0
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'music', 'notes')


def load(path):
    with wave.open(path) as w:
        frames, channels, rate = w.getnframes(), w.getnchannels(), w.getframerate()
        samples = np.frombuffer(w.readframes(frames), dtype=np.int16).astype(float)
    if channels == 2:
        samples = samples.reshape(-1, 2).mean(axis=1)
    return samples / 32768.0, rate, channels, frames / rate


def fundamental_hz(samples, rate):
    segment = samples[int(0.5 * rate):int(1.5 * rate)]
    if len(segment) < rate // 2:
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


def held_tone_segment(samples, rate):
    segment = samples[int(0.5 * rate):int(1.5 * rate)]
    return segment if len(segment) >= rate // 2 else None


def refine_by_autocorrelation(segment, rate, coarse_hz):
    candidates = [autocorrelation_peak(segment, rate, coarse_hz * factor) for factor in (0.5, 1.0, 2.0)]
    best = max(score for _, score in candidates)
    coherent = [(hz, score) for hz, score in candidates if score >= 0.9 * best]
    return max(coherent, key=lambda item: item[0])[0]


def correlation_at(segment, start, lag, window):
    a, b = segment[start:start + window], segment[start + lag:start + lag + window]
    if len(b) < window:
        return -1.0
    norm = math.sqrt(float(np.dot(a, a) * np.dot(b, b)))
    return float(np.dot(a, b)) / norm if norm > 0 else -1.0


def best_lag(segment, start, centre, spread, window):
    lags = range(max(1, int(centre - spread)), int(centre + spread) + 2)
    scores = [correlation_at(segment, start, lag, window) for lag in lags]
    index = int(np.argmax(scores))
    offset = 0.0
    if 0 < index < len(scores) - 1:
        left, mid, right = scores[index - 1], scores[index], scores[index + 1]
        denominator = left - 2 * mid + right
        offset = 0.5 * (left - right) / denominator if denominator != 0 else 0.0
    return lags[index] + offset, scores[index]


def autocorrelation_peak(segment, rate, coarse_hz):
    """Period of the tone near coarse_hz, measured over ~0.2 s of periods within half a period
    of the coarse estimate; returns (hz, coherence)."""
    period = rate / coarse_hz
    periods = max(2, int(0.2 * rate / period))
    window = int(0.1 * rate)
    start = len(segment) // 4
    lag, score = best_lag(segment, start, periods * period, period / 2, window)
    return rate * periods / lag, score


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
        held = held_tone_segment(samples, rate)
        if note == named and abs(cents) <= COARSE_WINDOW_CENTS and held is not None:
            hz = refine_by_autocorrelation(held, rate, target_hz(note, octave))
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
