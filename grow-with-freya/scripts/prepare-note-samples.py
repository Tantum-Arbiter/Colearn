#!/usr/bin/env python3
"""Condition every bundled note sample for the instrument UI: mono 44.1 kHz 16-bit,
onset trimmed so the note speaks the instant it is triggered, sustained to a common
length by looping the steady tone (whole periods found by autocorrelation, phase-aligned
linear crossfades, the tone eased onto its exact named pitch before the loop begins), the
recording's own release kept at the end, then matched in loudness.

Usage: python3 scripts/prepare-note-samples.py [--report] [--target-seconds 3.2]
       [--only flute,trumpet] [--src DIR] [--out DIR]
--report measures without writing. Requires numpy only."""
import argparse, glob, math, os, sys, wave
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'music', 'notes')
RATE = 44100
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

ONSET_DB = -42.0
PRE_ROLL_MS = 6
FADE_IN_MS = 4
LOOP_TARGET_MS = 220
CROSSFADE_MS = 40
GLIDE_MS = 160
FLATNESS_WEIGHT = 0.5
RELEASE_MS = 240
END_FADE_MS = 200
TARGET_RMS_DBFS = -17.0
PEAK_CEILING_DBFS = -1.0


def load(path):
    with wave.open(path) as w:
        frames, channels, rate, width = w.getnframes(), w.getnchannels(), w.getframerate(), w.getsampwidth()
        raw = w.readframes(frames)
    if width != 2:
        raise SystemExit(f'{path}: only 16-bit PCM is supported')
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    if rate != RATE:
        samples = resample(samples, rate, RATE)
    return samples


def resample(samples, src_rate, dst_rate):
    n = int(round(len(samples) * dst_rate / src_rate))
    x_old = np.linspace(0, 1, len(samples), endpoint=False)
    x_new = np.linspace(0, 1, n, endpoint=False)
    return np.interp(x_new, x_old, samples)


def save(path, samples):
    clipped = np.clip(samples, -1.0, 1.0)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((clipped * 32767.0).astype(np.int16).tobytes())


def ms(n):
    return int(round(n * RATE / 1000))


def envelope(samples, window_ms=8):
    win = ms(window_ms)
    padded = np.concatenate([samples ** 2, np.zeros(win)])
    cumulative = np.cumsum(padded)
    energy = (cumulative[win:] - cumulative[:-win]) / win
    return np.sqrt(np.maximum(energy, 0.0))[:len(samples)]


def db(value):
    return 20 * math.log10(max(value, 1e-9))


def fundamental_hz(samples):
    env = envelope(samples, 40)
    peak = int(np.argmax(env))
    return spectral_peak_hz(samples[max(0, peak - ms(50)):peak + ms(450)])


def peak_near_hz(segment, nominal_hz):
    size = 1 << int(math.ceil(math.log2(len(segment) * 16)))
    spectrum = np.abs(np.fft.rfft(segment * np.hanning(len(segment)), size))
    freqs = np.fft.rfftfreq(size, 1 / RATE)
    lo, hi = np.searchsorted(freqs, nominal_hz / 1.06), np.searchsorted(freqs, nominal_hz * 1.06)
    index = lo + int(np.argmax(spectrum[lo:hi]))
    left, mid, right = np.log(spectrum[index - 1:index + 2] + 1e-12)
    denominator = left - 2 * mid + right
    offset = 0.5 * (left - right) / denominator if denominator != 0 else 0.0
    return float(freqs[index] + offset * (freqs[1] - freqs[0]))


def spectral_peak_hz(segment):
    size = 1 << int(math.ceil(math.log2(len(segment) * 8)))
    spectrum = np.abs(np.fft.rfft(segment * np.hanning(len(segment)), size))
    freqs = np.fft.rfftfreq(size, 1 / RATE)
    product = spectrum.copy()
    for harmonic in (2, 3, 4):
        decimated = spectrum[::harmonic]
        product[:len(decimated)] *= decimated
    lo, hi = np.searchsorted(freqs, 100), np.searchsorted(freqs, 2500)
    index = lo + int(np.argmax(product[lo:hi]))
    left, mid, right = np.log(spectrum[index - 1:index + 2] + 1e-12)
    denominator = left - 2 * mid + right
    offset = 0.5 * (left - right) / denominator if denominator != 0 else 0.0
    return float(freqs[index] + offset * (freqs[1] - freqs[0]))


def named_note_hz(named, measured):
    midi = 69 + 12 * math.log2(measured / 440.0)
    nearest = round(midi)
    if NOTE_NAMES[nearest % 12] != named:
        raise SystemExit(f'measured {NOTE_NAMES[nearest % 12]} but the file is named {named}')
    return 440.0 * 2 ** ((nearest - 69) / 12)


def trim_onset(samples):
    env = envelope(samples)
    threshold = env.max() * 10 ** (ONSET_DB / 20)
    onset = int(np.argmax(env > threshold))
    start = max(0, onset - ms(PRE_ROLL_MS))
    trimmed = samples[start:].copy()
    fade = ms(FADE_IN_MS)
    trimmed[:fade] *= 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, fade))
    return trimmed, onset / RATE * 1000


def sounding_end(samples):
    env = envelope(samples)
    threshold = env.max() * 10 ** (ONSET_DB / 20)
    above = np.where(env > threshold)[0]
    return int(above[-1]) if len(above) else len(samples)


def nearest_positive_crossing(samples, index):
    window = samples[max(1, index - ms(10)):index + ms(10)]
    base = max(1, index - ms(10))
    crossings = np.where((window[:-1] <= 0) & (window[1:] > 0))[0]
    if len(crossings) == 0:
        return index
    return base + int(crossings[np.argmin(np.abs(crossings + base - index))])


def aligned_join(head, tail, overlap):
    fade_in = np.linspace(0, 1, overlap)
    mixed = head[-overlap:] * (1 - fade_in) + tail[:overlap] * fade_in
    return np.concatenate([head[:-overlap], mixed, tail[overlap:]])


def loop_score(samples, start, lag, window):
    a = samples[start:start + window]
    b = samples[start + lag:start + lag + window]
    if len(a) != window or len(b) != window:
        return -1.0
    denominator = math.sqrt(float(np.dot(a, a) * np.dot(b, b)))
    return float(np.dot(a, b)) / denominator if denominator > 0 else -1.0


def aligned_lag(samples, start, target_lag, half_period, window):
    lags = range(int(target_lag) - half_period, int(target_lag) + half_period + 2)
    scores = [loop_score(samples, start, lag, window) for lag in lags]
    index = int(np.argmax(scores))
    offset = 0.0
    if 0 < index < len(scores) - 1:
        left, mid, right = scores[index - 1], scores[index], scores[index + 1]
        denominator = left - 2 * mid + right
        offset = 0.5 * (left - right) / denominator if denominator != 0 else 0.0
    return lags[index] + offset


def local_period(samples, start, nominal_period):
    window = ms(60)
    half_period = max(1, int(nominal_period // 2))
    estimate = aligned_lag(samples, start, nominal_period, int(nominal_period * 0.06) + 1, window)
    for multiple in (4, 16, 64):
        estimate = aligned_lag(samples, start, multiple * estimate, half_period, window) / multiple
    return estimate


def flatness_penalty(samples, start, length):
    env = envelope(samples[start:start + length], 8)
    return float((env.max() - env.min()) / max(env.mean(), 1e-9))


def candidate_score(samples, start, lag, window, overlap):
    join = loop_score(samples, start - overlap, lag, window)
    middle = loop_score(samples, start + lag // 2, lag, window)
    return min(join, middle) - FLATNESS_WEIGHT * flatness_penalty(samples, start, lag)


def best_loop(samples, periods, nominal_period, end):
    best = None
    half_period = max(1, int(nominal_period // 2))
    overlap = ms(CROSSFADE_MS)
    first = max(overlap, min(ms(120), end // 3))
    for start in range(first, end, ms(30)):
        local_len = int(round(periods * local_period(samples, start, nominal_period)))
        window = min(ms(60), local_len)
        if start + 2 * local_len + half_period + window > end:
            break
        lags = range(local_len - half_period, local_len + half_period + 1)
        scores = [candidate_score(samples, start, lag, window, overlap) for lag in lags]
        index = int(np.argmax(scores))
        candidate = (scores[index], start, lags[index])
        if best is None or candidate[0] > best[0]:
            best = candidate
    return best


def glide_retune(samples, ratio, settle_at):
    glide = min(ms(GLIDE_MS), settle_at)
    rate = np.ones(len(samples))
    ramp = np.linspace(0, 1, glide)
    rate[settle_at - glide:settle_at] = 1 + (ratio - 1) * (0.5 - 0.5 * np.cos(ramp * math.pi))
    rate[settle_at:] = ratio
    source_position = np.concatenate([[0.0], np.cumsum(1 / rate)[:-1]])
    length = int(math.floor(source_position[-1]))
    tuned = np.interp(np.arange(length), source_position, samples)
    return tuned, int(np.searchsorted(source_position, settle_at))


def sustain(samples, nominal_period, target_len):
    end = sounding_end(samples)
    release_len = min(ms(RELEASE_MS), end // 4)
    found = None
    loop_len = 0
    for loop_ms in (LOOP_TARGET_MS, LOOP_TARGET_MS // 2, LOOP_TARGET_MS // 4):
        periods = int(ms(loop_ms) / nominal_period)
        if periods < 2:
            break
        loop_len = int(round(periods * nominal_period))
        found = best_loop(samples, periods, nominal_period, end - release_len)
        if found is not None and found[0] >= 0.4:
            break
        found = None
    if found is None:
        return samples, False, 1.0
    _, start, actual_len = found
    ratio = loop_len / actual_len
    settle = max(0, start - ms(CROSSFADE_MS) - ms(10))
    tuned, settled = glide_retune(samples, ratio, settle)
    loop_start = nearest_positive_crossing(tuned, settled + int(round((start - settle) * ratio)))
    loop_end = loop_start + loop_len
    overlap = min(ms(CROSSFADE_MS), loop_len // 3, loop_start)
    body = tuned[:loop_end]
    chunk = tuned[loop_start - overlap:loop_end]
    tail = tuned[loop_end - overlap:]
    while len(body) + len(tail) - overlap < target_len:
        body = aligned_join(body, chunk, overlap)
    return aligned_join(body, tail, overlap), True, ratio


def finish(samples, target_len):
    out = samples[:target_len].copy()
    fade = min(ms(END_FADE_MS), len(out) // 4)
    out[-fade:] *= 0.5 + 0.5 * np.cos(np.linspace(0, math.pi, fade))
    return out


def loudest_window_rms(samples, window_ms=300):
    win = ms(window_ms)
    if len(samples) <= win:
        return float(np.sqrt(np.mean(samples ** 2)))
    energy = np.convolve(samples ** 2, np.ones(win) / win, 'valid')
    return float(np.sqrt(energy.max()))


def normalise(samples):
    gain = 10 ** (TARGET_RMS_DBFS / 20) / max(loudest_window_rms(samples), 1e-9)
    out = samples * gain
    peak = float(np.abs(out).max())
    ceiling = 10 ** (PEAK_CEILING_DBFS / 20)
    if peak > ceiling:
        out *= ceiling / peak
    return out


def process(path, target_len):
    named = os.path.splitext(os.path.basename(path))[0]
    original = load(path)
    hz = named_note_hz(named, fundamental_hz(original))
    trimmed, onset_ms = trim_onset(original)
    extended, looped, ratio = sustain(trimmed, RATE / hz, target_len + ms(RELEASE_MS))
    return normalise(finish(extended, target_len)), dict(
        onset_ms=onset_ms, looped=looped, original_s=len(original) / RATE, hz=hz,
        retune_cents=1200 * math.log2(ratio))


def describe(samples):
    env = envelope(samples)
    threshold = env.max() * 10 ** (ONSET_DB / 20)
    onset = int(np.argmax(env > threshold))
    return dict(seconds=len(samples) / RATE, peak_db=db(float(np.abs(samples).max())),
                rms_db=db(loudest_window_rms(samples)), onset_ms=onset / RATE * 1000)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', action='store_true')
    parser.add_argument('--target-seconds', type=float, default=3.2)
    parser.add_argument('--only', default='')
    parser.add_argument('--src', default=ROOT)
    parser.add_argument('--out', default=ROOT)
    args = parser.parse_args()
    only = {name for name in args.only.split(',') if name}
    target_len = int(round(args.target_seconds * RATE))
    for path in sorted(glob.glob(os.path.join(args.src, '*', '*.wav'))):
        instrument = os.path.basename(os.path.dirname(path))
        if only and instrument not in only:
            continue
        if args.report:
            info = describe(load(path))
            print(f"{instrument:<10} {os.path.basename(path):<6} {info['seconds']:5.2f} s  peak {info['peak_db']:6.1f} dBFS  "
                  f"rms {info['rms_db']:6.1f} dBFS  onset {info['onset_ms']:5.0f} ms")
            continue
        out, meta = process(path, target_len)
        target = os.path.join(args.out, instrument, os.path.basename(path))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        save(target, out)
        info = describe(out)
        print(f"{instrument:<10} {os.path.basename(path):<6} {meta['original_s']:5.2f} s -> {info['seconds']:4.2f} s  "
              f"onset {meta['onset_ms']:4.0f} -> {info['onset_ms']:3.0f} ms  rms {info['rms_db']:6.1f} dBFS  "
              f"peak {info['peak_db']:5.1f} dBFS  {'looped' if meta['looped'] else 'natural'}  {meta['hz']:.1f} Hz  "
              f"retuned {meta['retune_cents']:+.1f} c")
    return 0


if __name__ == '__main__':
    sys.exit(main())
