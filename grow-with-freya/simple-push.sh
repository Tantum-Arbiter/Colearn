#!/bin/bash

# Simple script to push auth fixes
cd "$(dirname "$0")"

echo "Adding files..."
git add config/oauth-config.ts app/_layout.tsx

echo "Committing changes..."
git commit -m "Fix remaining auth references - oauth-config inline types and layout LoginScreen removal"

echo "Pushing to remote..."
git push origin main

echo "Done!"
