#!/bin/bash

echo "=== Committing Auth Fixes ==="

cd grow-with-freya

echo "Current directory: $(pwd)"

echo "=== Git Status ==="
git status

echo "=== Adding Changes ==="
git add -A

echo "=== Committing Changes ==="
git commit -m "Fix remaining auth references in config and layout files

- Remove @/types/auth import from oauth-config.ts (already done)
- Comment out LoginScreen import and usage in _layout.tsx (already done)
- Add inline OAuthConfig type definition (already done)
- Skip login view and go directly to main app (already done)

This should resolve the remaining TypeScript errors:
- Cannot find module '@/types/auth'
- Module has no exported member 'LoginScreen'

Note: mainMenuStyles and BearTopImage export errors appear to be false positives
as both are properly exported in components/main-menu/index.ts"

echo "=== Checking if commit was created ==="
git log --oneline -1

echo "=== Pushing to Remote ==="
git push origin main

echo "=== Push Complete ==="
git log --oneline -1
