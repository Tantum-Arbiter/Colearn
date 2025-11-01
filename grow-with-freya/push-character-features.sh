#!/bin/bash

echo "Pushing character creation and account features..."

# Add all changes
git add .

# Commit with a clear message
git commit -m "Restore character creation and account features

- Add CharacterCreationScreen component with name input and avatar selection
- Add AccountScreen component with upward scroll transition  
- Update app store to include character data (name, avatar)
- Update app layout to show character creation after onboarding
- Add account button to main menu top-left
- All features work without Expo authentication modules
- Maintains CI/CD pipeline compatibility"

# Push to remote
git push origin main

echo "Push completed!"
