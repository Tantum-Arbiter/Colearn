#!/usr/bin/env python3
"""
Generate clean 5-second instrument note WAV files using additive synthesis.
Each instrument family gets distinct harmonic profiles that approximate its timbre.
This replaces the previous crossfade-looping approach which caused audible jitter.

Usage:  python3 scripts/extend-notes.py
"""

import wave
import struct
import os
import math

NOTES_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'music', 'notes')
SAMPLE_RATE = 44100
DURATION = 5.0        # seconds
AMPLITUDE = 0.85      # peak amplitude (0..1) — leaves headroom
ATTACK_MS = 80        # attack ramp duration
RELEASE_MS = 300      # fade-out at end of file

# Note frequencies (C4–B4)
NOTE_FREQ = {
    'C': 261.63, 'D': 293.66, 'E': 329.63,
    'F': 349.23, 'G': 392.00, 'A': 440.00, 'B': 493.88,
}

# Harmonic profiles per instrument family.
# Each entry is (harmonic_number, relative_amplitude).
# These approximate the spectral character of each instrument.
HARMONICS = {
    'flute': [
        (1, 1.0), (2, 0.15), (3, 0.05),
    ],
    'recorder': [
        (1, 1.0), (2, 0.30), (3, 0.10), (4, 0.03),
    ],
    'ocarina': [
        (1, 1.0), (2, 0.08), (3, 0.02),
    ],
    'trumpet': [
        (1, 1.0), (2, 0.65), (3, 0.50), (4, 0.35),
        (5, 0.20), (6, 0.10),
    ],
    'clarinet': [
        # Clarinet emphasises odd harmonics
        (1, 1.0), (3, 0.55), (5, 0.30), (7, 0.15), (9, 0.05),
    ],
    'saxophone': [
        (1, 1.0), (2, 0.50), (3, 0.40), (4, 0.25),
        (5, 0.15), (6, 0.08),
    ],
}

# Light vibrato settings per instrument (rate_hz, depth_cents)
VIBRATO = {
    'flute':     (5.0, 12),
    'recorder':  (5.5, 8),
    'ocarina':   (4.5, 15),
    'trumpet':   (5.5, 10),
    'clarinet':  (5.0, 8),
    'saxophone': (5.0, 18),
}


def generate_note(instrument: str, note: str, path: str):
    freq = NOTE_FREQ.get(note)
    if freq is None:
        print(f'  Unknown note {note}, skipping')
        return

    harmonics = HARMONICS.get(instrument, HARMONICS['flute'])
    vib_rate, vib_cents = VIBRATO.get(instrument, (5.0, 10))

    n_samples = int(DURATION * SAMPLE_RATE)
    attack_samples = int(ATTACK_MS / 1000.0 * SAMPLE_RATE)
    release_samples = int(RELEASE_MS / 1000.0 * SAMPLE_RATE)

    # Normalise harmonic amplitudes so peak doesn't clip
    total_amp = sum(a for _, a in harmonics)
    scale = AMPLITUDE / total_amp

    samples = []
    for i in range(n_samples):
        t = i / SAMPLE_RATE

        # Vibrato: slight pitch modulation for natural feel
        # Delay vibrato onset by 0.15s so the attack is clean
        vib_env = min(1.0, max(0.0, (t - 0.15) / 0.3))
        vib = vib_env * (vib_cents / 1200.0) * math.sin(2.0 * math.pi * vib_rate * t)
        inst_freq = freq * (2.0 ** vib)

        # Sum harmonics
        val = 0.0
        for h_num, h_amp in harmonics:
            val += h_amp * math.sin(2.0 * math.pi * inst_freq * h_num * t)
        val *= scale

        # Attack envelope
        if i < attack_samples:
            val *= i / attack_samples

        # Release envelope (fade out at end of file)
        release_start = n_samples - release_samples
        if i >= release_start:
            val *= (n_samples - i) / release_samples

        # Convert to 16-bit int
        samples.append(max(-32768, min(32767, int(val * 32767))))

    # Write WAV
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(struct.pack(f'<{len(samples)}h', *samples))

    print(f'  {note}.wav: generated {DURATION:.0f}s')


def main():
    instruments = [d for d in os.listdir(NOTES_DIR)
                   if os.path.isdir(os.path.join(NOTES_DIR, d))]
    instruments.sort()

    for inst in instruments:
        inst_dir = os.path.join(NOTES_DIR, inst)
        wav_files = sorted(f for f in os.listdir(inst_dir) if f.endswith('.wav'))
        print(f'\n{inst}:')
        for wav_name in wav_files:
            note = wav_name.replace('.wav', '')
            path = os.path.join(inst_dir, wav_name)
            try:
                generate_note(inst, note, path)
            except Exception as e:
                print(f'  {wav_name}: ERROR: {e}')


if __name__ == '__main__':
    main()
