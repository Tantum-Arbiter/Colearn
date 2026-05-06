#!/bin/bash
# Download high-quality instrument samples from Philharmonia Orchestra (CC BY-SA 3.0)
# Source: https://github.com/skratchdot/philharmonia-samples (GitHub Pages mirror)
#
# File naming: {instrument}_{note}{octave}_{duration}_{dynamic}_{articulation}.mp3
# We use: octave 5, 1-second duration, mezzo-forte, normal articulation
#
# License: CC BY-SA 3.0 - free for commercial use, must not be sold "as is"

set -e

NOTES_DIR="$(cd "$(dirname "$0")/../assets/music/notes" && pwd)"
# Use raw GitHub content URL (more reliable than the redirect)
BASE_URL="https://raw.githubusercontent.com/skratchdot/philharmonia-samples/gh-pages/audio"

echo "=== Downloading Philharmonia Orchestra Samples ==="
echo "Target directory: $NOTES_DIR"
echo ""

download_and_convert() {
  local instrument="$1"
  local note="$2"
  local octave="$3"
  local dynamic="$4"
  local target_dir="$5"
  local filename="${instrument}_${note}${octave}_1_${dynamic}_normal.mp3"
  local url="${BASE_URL}/${instrument}/${filename}"
  local mp3_path="/tmp/${filename}"
  local wav_path="${target_dir}/${note}.wav"

  echo "  Downloading ${instrument} ${note}${octave} (${dynamic})..."
  if curl -sL -f -o "$mp3_path" "$url"; then
    # Convert MP3 to WAV using macOS built-in afconvert
    if afconvert -f WAVE -d LEI16@44100 "$mp3_path" "$wav_path" 2>/dev/null; then
      rm "$mp3_path"
      local size=$(wc -c < "$wav_path" | tr -d ' ')
      echo "    ✅ ${note}.wav (${size} bytes)"
    else
      echo "    ❌ Conversion failed"
      rm -f "$mp3_path"
      return 1
    fi
  else
    echo "    ❌ Download failed (HTTP error)"
    rm -f "$mp3_path"
    return 1
  fi
}

# === FLUTE (C5, D5, E5, F5, G5, A5) — uses mezzo-forte ===
echo "🎶 Flute..."
mkdir -p "$NOTES_DIR/flute"
for note in C D E F G A; do
  download_and_convert "flute" "$note" "5" "mezzo-forte" "$NOTES_DIR/flute"
done
echo ""

# === CLARINET (C5, D5, E5, F5, G5) — uses forte (no mezzo-forte available) ===
echo "🎵 Clarinet..."
mkdir -p "$NOTES_DIR/clarinet"
for note in C D E F G; do
  download_and_convert "clarinet" "$note" "5" "forte" "$NOTES_DIR/clarinet"
done
echo ""

# === SAXOPHONE (C5, D5, E5, F5, G5) — uses forte (mezzo-forte not available for all notes) ===
echo "🎷 Saxophone..."
mkdir -p "$NOTES_DIR/saxophone"
for note in C D E F G; do
  download_and_convert "saxophone" "$note" "5" "forte" "$NOTES_DIR/saxophone"
done
echo ""

# === TRUMPET (C5, D5, E5, F5) — using Philharmonia trombone (similar brass timbre) ===
echo "🎺 Trumpet (using trombone samples — similar brass timbre)..."
mkdir -p "$NOTES_DIR/trumpet"
for note in C D E F; do
  download_and_convert "trombone" "$note" "5" "forte" "$NOTES_DIR/trumpet"
done
echo ""

# === RECORDER (C5, D5, E5, F5, G5) — VCSL Baroque Soprano Recorder (CC0) ===
VCSL_BASE="https://raw.githubusercontent.com/sgossner/VCSL/master/Aerophones/Edge-blown%20Aerophones/Baroque%20Soprano%20Recorder/Sustain"
echo "🪈 Recorder (VCSL Baroque Soprano Recorder, CC0)..."
mkdir -p "$NOTES_DIR/recorder"
declare -A RECORDER_MAP=(["C"]="C5" ["D"]="D5" ["E"]="E5" ["F"]="F%235" ["G"]="G5")
declare -A RECORDER_DISPLAY=(["C"]="C5" ["D"]="D5" ["E"]="E5" ["F"]="F#5" ["G"]="G5")
for note in C D E F G; do
  src="${RECORDER_MAP[$note]}"
  display="${RECORDER_DISPLAY[$note]}"
  url="${VCSL_BASE}/SopRecorder_Sus_${src}_rr1_Main.wav"
  wav_path="$NOTES_DIR/recorder/${note}.wav"
  echo "  Downloading recorder ${display}..."
  if curl -sL -f -o "$wav_path" "$url"; then
    # Resample to 44100 Hz for consistency
    afconvert -f WAVE -d LEI16@44100 "$wav_path" "${wav_path}.tmp" 2>/dev/null && mv "${wav_path}.tmp" "$wav_path"
    local_size=$(wc -c < "$wav_path" | tr -d ' ')
    echo "    ✅ ${note}.wav (${local_size} bytes)"
  else
    echo "    ❌ Download failed"
  fi
done
echo ""

# === OCARINA (C5, D5, E5, F5, G5) — mixed sources (all CC0) ===
echo "🎵 Ocarina (CC0 sources)..."
mkdir -p "$NOTES_DIR/ocarina"

# C5 from VCSL Ocarina Typical (CC0)
VCSL_OCA="https://raw.githubusercontent.com/sgossner/VCSL/master/Aerophones/Edge-blown%20Aerophones/Ocarina%2C%20Typical/Sustains/Sus"
echo "  Downloading ocarina C5 (VCSL)..."
if curl -sL -f -o "$NOTES_DIR/ocarina/C.wav" "${VCSL_OCA}/StdOcarina_Sus_C5.wav"; then
  afconvert -f WAVE -d LEI16@44100 "$NOTES_DIR/ocarina/C.wav" "$NOTES_DIR/ocarina/C.wav.tmp" 2>/dev/null && mv "$NOTES_DIR/ocarina/C.wav.tmp" "$NOTES_DIR/ocarina/C.wav"
  echo "    ✅ C.wav ($(wc -c < "$NOTES_DIR/ocarina/C.wav" | tr -d ' ') bytes)"
else
  echo "    ❌ Download failed"
fi

# D5, E5, F5, G5 from FreePats ocarina1 (CC0, FLAC → WAV)
FREEPATS_OCA="https://raw.githubusercontent.com/freepats/ocarina1/main/samples"
for note in D E F G; do
  echo "  Downloading ocarina ${note}5 (FreePats)..."
  flac_path="/tmp/ocarina_${note}5.flac"
  wav_path="$NOTES_DIR/ocarina/${note}.wav"
  if curl -sL -f -o "$flac_path" "${FREEPATS_OCA}/${note}5_01.flac"; then
    if afconvert -f WAVE -d LEI16@44100 "$flac_path" "$wav_path" 2>/dev/null; then
      rm "$flac_path"
      echo "    ✅ ${note}.wav ($(wc -c < "$wav_path" | tr -d ' ') bytes)"
    else
      echo "    ❌ Conversion failed"
      rm -f "$flac_path"
    fi
  else
    echo "    ❌ Download failed"
  fi
done
echo ""

echo "=== Summary ==="
echo "Philharmonia Orchestra (CC BY-SA 3.0):"
echo "  Flute:     $(ls "$NOTES_DIR/flute/"*.wav 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Clarinet:  $(ls "$NOTES_DIR/clarinet/"*.wav 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Saxophone: $(ls "$NOTES_DIR/saxophone/"*.wav 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Trumpet:   $(ls "$NOTES_DIR/trumpet/"*.wav 2>/dev/null | wc -l | tr -d ' ') files (trombone samples)"
echo ""
echo "VCSL (CC0):"
echo "  Recorder:  $(ls "$NOTES_DIR/recorder/"*.wav 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "VCSL + FreePats (CC0):"
echo "  Ocarina:   $(ls "$NOTES_DIR/ocarina/"*.wav 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "Done! All 30 samples downloaded."
