#!/usr/bin/env node

/**
 * Test script to verify audio file compatibility on Android
 * Run this script to check if the background audio file can be loaded
 */

const fs = require('fs');
const path = require('path');

const AUDIO_FILE_PATH = path.join(__dirname, '../assets/audio/background-soundtrack.wav');

console.log('Testing Audio File for Android Compatibility');
console.log('='.repeat(50));

// Check if file exists
if (!fs.existsSync(AUDIO_FILE_PATH)) {
  console.error('[ERROR] Audio file not found:', AUDIO_FILE_PATH);
  process.exit(1);
}

// Get file stats
const stats = fs.statSync(AUDIO_FILE_PATH);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('[OK] Audio file found');
console.log('Path:', AUDIO_FILE_PATH);
console.log('Size:', fileSizeInMB, 'MB');

// Check file size (warn if too large)
if (stats.size > 5 * 1024 * 1024) { // 5MB
  console.warn('[WARN] Audio file is quite large (' + fileSizeInMB + 'MB)');
  console.warn('   Consider compressing to improve loading performance on Android');
}

// Read first few bytes to check file format
const buffer = fs.readFileSync(AUDIO_FILE_PATH, { start: 0, end: 11 });
const header = buffer.toString('ascii', 0, 4);
const format = buffer.toString('ascii', 8, 12);

console.log('File format check:');
console.log('   Header:', header);
console.log('   Format:', format);

if (header === 'RIFF' && format === 'WAVE') {
  console.log('[OK] Valid WAV file detected');
} else {
  console.warn('[WARN] File may not be a valid WAV file');
  console.warn('   Expected: RIFF header with WAVE format');
  console.warn('   Found: Header="' + header + '", Format="' + format + '"');
}

console.log('\nAndroid Audio Troubleshooting:');
console.log('1. Ensure app has MODIFY_AUDIO_SETTINGS permission');
console.log('2. Check device volume is not muted');
console.log('3. Try restarting the app completely');
console.log('4. Check Android system audio settings');
console.log('5. Test on different Android device if available');

console.log('\nTo test audio on Android:');
console.log('1. Build and install the app on Android device');
console.log('2. Check Metro bundler logs for audio initialization errors');
console.log('3. Look for "Background music initialized successfully" message');
console.log('4. If errors occur, check the detailed error logs');

console.log('\nAudio file test completed');
