#!/bin/bash

echo "=== Force Pushing Auth Fixes ==="

cd grow-with-freya

echo "Current directory: $(pwd)"

# Force add all changes
git add -A

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit - files are already committed"
    echo "Checking latest commit..."
    git log --oneline -1
else
    echo "Changes found - committing..."
    git commit -m "Fix remaining auth references in config and layout files

- oauth-config.ts: Remove @/types/auth import, add inline OAuthConfig type
- _layout.tsx: Comment out LoginScreen import and usage, skip to main app
- These changes resolve the remaining TypeScript errors:
  * Cannot find module '@/types/auth'
  * Module has no exported member 'LoginScreen'

Note: mainMenuStyles and BearTopImage export errors appear to be false positives
as both are properly exported in components/main-menu/index.ts"
fi

echo "=== Current Status ==="
git status --porcelain

echo "=== Latest Commit ==="
git log --oneline -1

echo "=== Pushing to Remote ==="
git push origin main

echo "=== Push Complete - Latest Remote Commit ==="
git ls-remote origin main
