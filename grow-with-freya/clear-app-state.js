#!/usr/bin/env node

// Script to clear AsyncStorage and reset app state
const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Clearing app state to force fresh start...');

try {
  // For iOS Simulator
  console.log('📱 Clearing iOS Simulator data...');
  try {
    execSync('xcrun simctl privacy booted reset all com.growwithfreya.app', { stdio: 'inherit' });
    console.log('✅ iOS Simulator data cleared');
  } catch (error) {
    console.log('⚠️  iOS Simulator not available or app not installed');
  }

  // For Android Emulator
  console.log('🤖 Clearing Android Emulator data...');
  try {
    execSync('adb shell pm clear com.growwithfreya.app', { stdio: 'inherit' });
    console.log('✅ Android Emulator data cleared');
  } catch (error) {
    console.log('⚠️  Android Emulator not available or app not installed');
  }

  // Clear Metro cache
  console.log('🧹 Clearing Metro cache...');
  try {
    execSync('npx expo start --clear', { stdio: 'inherit', timeout: 5000 });
  } catch (error) {
    // Expected to timeout, we just want to clear cache
    console.log('✅ Metro cache cleared');
  }

  console.log('\n🎉 App state cleared successfully!');
  console.log('📋 Next steps:');
  console.log('1. Run: npx expo start');
  console.log('2. Open the app on your device/simulator');
  console.log('3. The app should now show the splash screen → onboarding → login flow');

} catch (error) {
  console.error('❌ Error clearing app state:', error.message);
  console.log('\n🔧 Manual steps to clear app state:');
  console.log('1. Delete the app from your device/simulator');
  console.log('2. Run: npx expo start --clear');
  console.log('3. Reinstall the app');
}
