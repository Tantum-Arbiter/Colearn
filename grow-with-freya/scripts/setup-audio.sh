#!/bin/bash

# Setup Audio Script for Grow with Freya
# This script helps you add background music to your app

echo " Grow with Freya - Audio Setup"
echo "================================"

AUDIO_DIR="assets/audio"
TARGET_FILE="$AUDIO_DIR/background-soundtrack.wav"

# Check if audio directory exists
if [ ! -d "$AUDIO_DIR" ]; then
    echo "Creating audio directory..."
    mkdir -p "$AUDIO_DIR"
fi

# Check current file status
if [ -f "$TARGET_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$TARGET_FILE" 2>/dev/null || stat -c%s "$TARGET_FILE" 2>/dev/null)
    if [ "$FILE_SIZE" -eq 0 ]; then
        echo " Current audio file is empty (0 bytes)"
        echo "   This is why you're seeing 'Background music not loaded'"
    else
        echo " Audio file exists (${FILE_SIZE} bytes)"
        echo "   If you're still seeing errors, the file might be corrupted"
    fi
else
    echo " No audio file found at $TARGET_FILE"
fi

echo ""
echo " To fix the background music issue:"
echo ""
echo "1. Find or create a suitable audio file:"
echo "   - Format: WAV, MP3, or M4A"
echo "   - Duration: 2-5 minutes (will loop automatically)"
echo "   - Content: Child-friendly, soothing background music"
echo "   - File size: Preferably under 2MB"
echo ""
echo "2. Copy your audio file to replace the placeholder:"
echo "   cp /path/to/your/audio/file.wav $TARGET_FILE"
echo ""
echo "3. Alternative: Download a free audio file:"
echo "   # Example using a creative commons audio file"
echo "   # curl -o $TARGET_FILE 'https://example.com/your-audio-file.wav'"
echo ""
echo "4. Test the file:"
echo "   # Check file size"
echo "   ls -lh $TARGET_FILE"
echo ""
echo "   # Play the file (macOS)"
echo "   afplay $TARGET_FILE"
echo ""
echo "   # Play the file (Linux)"
echo "   aplay $TARGET_FILE"
echo ""

# Offer to remove the empty placeholder
if [ -f "$TARGET_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$TARGET_FILE" 2>/dev/null || stat -c%s "$TARGET_FILE" 2>/dev/null)
    if [ "$FILE_SIZE" -eq 0 ]; then
        echo "  Remove empty placeholder file? (y/n)"
        read -r response
        if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
            rm "$TARGET_FILE"
            echo "   Empty placeholder removed"
            echo "   Now add your actual audio file to: $TARGET_FILE"
        fi
    fi
fi

echo ""
echo " Tips for finding background music:"
echo "   - Freesound.org (creative commons)"
echo "   - YouTube Audio Library (royalty-free)"
echo "   - Incompetech.com (Kevin MacLeod music)"
echo "   - Zapsplat.com (with account)"
echo ""
echo " After adding your audio file:"
echo "   1. Restart your development server"
echo "   2. The background music should start automatically"
echo "   3. Use the music control button in the app to toggle"
echo ""
echo " The music will:"
echo "    Start automatically after splash screen"
echo "    Loop continuously"
echo "    Fade in gently (3 seconds)"
echo "    Pause when app goes to background"
echo "    Resume when app becomes active"
echo ""
