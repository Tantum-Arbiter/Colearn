# Music Audio Files

This directory contains audio files for the music player feature.

## Required Files

The following audio files are referenced by the music data:

### Tantrum Calming Music
- `calm-ocean-waves.mp3` - Gentle ocean waves (3 minutes)
- `gentle-rain.mp3` - Soft rainfall sounds (4 minutes)
- `peaceful-forest.mp3` - Birds chirping and gentle wind (5 minutes)
- `soft-piano-melody.mp3` - Gentle piano music (3.5 minutes)

### Bedtime Music
- `twinkle-lullaby.mp3` - Gentle lullaby version of Twinkle Twinkle Little Star (3 minutes)
- `moonlight-dreams.mp3` - Soft instrumental music (4 minutes)
- `sleepy-time-melody.mp3` - Peaceful melody for sleep (5 minutes)
- `gentle-night-sounds.mp3` - Soft crickets and night breeze (6 minutes)
- `brahms-lullaby.mp3` - Classic Brahms lullaby (2.5 minutes)

### Binaural Beats (in binaural-beats/ subdirectory)

#### Tantrum Calming
- `binaural-beats/tantrums/alpha-waves-10hz.mp3` - 10Hz alpha waves for tantrum calming (15 minutes)

#### Sleep Progression (Auto-transitioning sequence)
- `binaural-beats/sleep/alpha-phase.mp3` - Alpha waves to begin sleep relaxation (15 minutes)
- `binaural-beats/sleep/beta-phase.mp3` - Beta waves for deeper relaxation (20 minutes)
- `binaural-beats/sleep/theta-phase.mp3` - Theta waves for deep sleep (45 minutes)

**Sleep Sequence:** The app automatically progresses through Alpha → Beta → Theta phases for a complete 80-minute sleep experience.

**Note:** Binaural beats require stereo headphones to be effective. They work by playing slightly different frequencies in each ear to create the desired brainwave entrainment effect. MP3 format is used to keep app size manageable.

## File Format Requirements

- Format: MP3 or WAV
- Sample Rate: 44.1 kHz recommended
- Bit Rate: 128-320 kbps for MP3
- Channels: Mono or Stereo (Stereo required for binaural beats)

## Adding Audio Files

1. Place audio files in this directory with the exact names listed above
2. Ensure files are properly formatted and not corrupted
3. Test playback in the app to verify functionality

## Placeholder Files

If audio files are missing, the app will:
1. Show an error message when trying to play the track
2. Continue to function normally for other features
3. Display the track in the UI but mark it as unavailable

## Copyright Notice

Ensure all audio files used comply with copyright laws and licensing requirements.
For production use, obtain proper licenses for any copyrighted material.
