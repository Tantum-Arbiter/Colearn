# Audio Assets

This directory contains audio files used throughout the Grow with Freya app.

## Background Music

### Current Setup
- **File**: `background-soundtrack.wav` (placeholder)
- **Usage**: Plays automatically when the app reaches the first screen after splash
- **Format**: WAV (recommended for quality)
- **Loop**: Yes, continuously loops
- **Volume**: Default 30% (adjustable by users)

### Adding Your Audio File

1. **Replace the placeholder file**:
   ```bash
   # Remove the placeholder
   rm assets/audio/background-soundtrack.wav
   
   # Add your actual audio file
   cp /path/to/your/background-soundtrack.wav assets/audio/background-soundtrack.wav
   ```

2. **Recommended Audio Specifications**:
   - **Format**: WAV or MP3
   - **Sample Rate**: 44.1 kHz
   - **Bit Depth**: 16-bit (WAV) or 128-320 kbps (MP3)
   - **Duration**: 2-5 minutes (will loop automatically)
   - **File Size**: <2MB for optimal performance
   - **Volume**: Normalized to prevent clipping

3. **Audio Content Guidelines**:
   - Child-friendly and soothing
   - Instrumental or soft vocals
   - No sudden loud sounds or jarring transitions
   - Seamless loop (ending should flow naturally into beginning)

### Supported Formats

The app supports the following audio formats:
- **WAV** (recommended for quality)
- **MP3** (recommended for size)
- **M4A** (iOS optimized)
- **AAC** (good compression)
- **OGG** (Android optimized)

### File Naming Convention

- Use descriptive names: `background-soundtrack.wav`
- Use lowercase with hyphens: `gentle-lullaby.mp3`
- Avoid spaces and special characters

## Audio Features

### Background Music Service
- **Auto-play**: Starts when first screen appears
- **Fade Effects**: 3-second fade-in on start
- **App State Handling**: Pauses when app goes to background
- **Volume Control**: User-adjustable volume
- **Loop**: Continuous playback
- **Memory Management**: Proper cleanup on app close

### User Controls
- **Music Toggle**: Available in top-right of main menu
- **Visual Feedback**: Icon changes based on play state
- **Accessibility**: Full screen reader support

## Testing

Run the audio tests to ensure everything works:

```bash
# Test background music service
npm test -- __tests__/services/background-music.test.ts

# Test music control component
npm test -- __tests__/components/ui/music-control.test.tsx
```

## Troubleshooting

### Common Issues

1. **Audio not playing**:
   - Check file exists: `ls -la assets/audio/`
   - Verify file format is supported
   - Check device volume and mute settings

2. **File too large**:
   - Compress audio file
   - Consider MP3 instead of WAV
   - Reduce duration and rely on looping

3. **Poor loop quality**:
   - Edit audio to have seamless loop points
   - Add fade-in/fade-out at loop boundaries
   - Test loop transition in audio editor

4. **Performance issues**:
   - Reduce file size
   - Use compressed formats (MP3, AAC)
   - Monitor memory usage during playback

### Audio Editing Tips

For best results, edit your audio file to:
- Have a seamless loop (ending flows into beginning)
- Consistent volume throughout
- No silence at start/end
- Appropriate length (2-5 minutes)

## Future Enhancements

Potential future features:
- Multiple background tracks
- Dynamic music based on app section
- Sound effects for interactions
- Voice narration support
- Playlist functionality
