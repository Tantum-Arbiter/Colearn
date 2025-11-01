#!/bin/bash

echo "=== Pushing Auth Fixes ==="

cd grow-with-freya

echo "Current directory: $(pwd)"

echo "=== Git Status ==="
git status --porcelain

echo "=== Adding Changes ==="
git add -A

echo "=== Committing Changes ==="
git commit -m "Fix remaining auth references in config and layout files

- Remove @/types/auth import from oauth-config.ts
- Comment out LoginScreen import and usage in _layout.tsx  
- Add inline OAuthConfig type definition
- Skip login view and go directly to main app

This should resolve the remaining TypeScript errors:
- Cannot find module '@/types/auth'
- Module has no exported member 'LoginScreen'"

echo "=== Pushing to Remote ==="
git push origin main

echo "=== Push Complete ==="
