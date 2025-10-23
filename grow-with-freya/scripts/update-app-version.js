#!/usr/bin/env node

/**
 * Script to sync package.json version with app.json
 * This ensures both files have the same version number
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const appJsonPath = path.join(__dirname, '..', 'app.json');

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  // Update app.json version
  appJson.expo.version = version;

  // Write updated app.json
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

  console.log(`✅ Updated app.json version to ${version}`);
} catch (error) {
  console.error('❌ Error updating app.json version:', error.message);
  process.exit(1);
}
