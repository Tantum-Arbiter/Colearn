# Phase 3 — Monetisation & Download Management

> **For LLMs / AI agents**: This document defines the subscription model and download cap system.
> Read this file before implementing any paywall, subscription, download limit, or catalog browsing feature.
> If you change the monetisation approach, **update this file**.

---

## 1. Subscription

### Tier Model

| Tier | Price | Stories Available | Download Limit | How to Unlock |
|------|-------|-------------------|----------------|---------------|
| **Free** | £0 | 2 bundled stories | 2 (or 3 with referral) | Default on install |
| **Basic** | £5.99/mo | Full catalog | 50 | In-app subscription |
| **Premium** | £10/mo | Full catalog | 125 | In-app subscription |

**Free tier bonus:** Sharing a referral link with a friend who installs the app unlocks 1 additional
free story (total 3). Both the referrer and referee receive the bonus.

### Auth vs Subscription (They Are Separate)

Users **can sign in without paying**. Authentication syncs profile, preferences, and screen time
settings across devices. Subscription controls content access:

```
Signed out → bundled stories only, no sync
Signed in (free) → bundled stories + profile sync + catalog browsing
Signed in (basic) → full catalog, 50 downloads, profile sync
Signed in (premium) → full catalog, 125 downloads, profile sync
```

### Billing Infrastructure

Both Apple and Google **mandate** that digital content subscriptions go through their billing
systems. Third-party payment processors (Stripe, etc.) cannot be used for in-app content.

**RevenueCat** (`react-native-purchases`) is the recommended SDK:
- Wraps both Apple StoreKit 2 and Google Play Billing Library into one API
- Handles receipt validation server-side (no custom receipt validation needed)
- Manages subscription lifecycle: renewals, cancellations, grace periods, refunds
- Free tier up to $2.5k/mo revenue
- Provides analytics, A/B testing on pricing, and webhook integrations
- Compatible with Expo managed workflow

**Store product IDs to configure:**

| Product ID | Type | Price | Entitlement |
|------------|------|-------|-------------|
| `freya_basic_monthly` | Auto-renewable subscription | £5.99/mo | `basic_access` |
| `freya_premium_monthly` | Auto-renewable subscription | £10/mo | `premium_access` |

### Architecture — Client-Side Only

Subscription validation does **not** go through the gateway. RevenueCat's SDK validates receipts
directly with Apple/Google servers. The client decides content access based on the entitlement
returned by RevenueCat. This is the standard approach for children's/educational apps where the
content (stories) is not high-value enough to justify server-side entitlement enforcement.

```
Apple/Google Servers ←→ RevenueCat Servers ←→ RevenueCat SDK (client)
                                                      ↓
                                             Zustand store (tier)
                                                      ↓
                                             Content gating (local filter)
```

**Why not gateway-side gating?**
- Stories are cached locally as plain JSON + images — a determined user could access them regardless
- The real payment security is handled by Apple/Google infrastructure
- Adding gateway enforcement adds complexity without meaningful security gain
- RevenueCat's server-side receipt validation IS the server validation — just not our server

### Content Delivery Model — Catalog Browse + On-Demand Download

The current bulk delta-sync model (`batch-sync-service.ts`) is replaced with a catalog-first
approach. Users browse a visual catalog and download individual stories on tap.

**Current flow (being replaced):**
```
App opens → delta-sync → download ALL changed stories + assets in bulk
```

**New flow:**
```
App opens
  │
  ├─ Fetch catalog (lightweight, ~2KB)
  │   GET /api/stories/catalog
  │   Returns: [{storyId, title, thumbnailUrl, description, category, isFree}, ...]
  │
  ├─ Display browsable grid of thumbnail tiles
  │   ├─ Downloaded stories → playable, shown in "My Stories"
  │   ├─ Not downloaded + subscribed → "Download" button on tile
  │   └─ Not downloaded + free tier → lock icon + "Subscribe" CTA
  │
  ├─ User taps "Download" on a specific story
  │   GET /api/stories/{storyId}/download
  │   Returns: full story JSON + signed URLs for assets
  │   Client downloads assets → saves to cache
  │   downloadedCount++ → check against tier limit
  │
  └─ Premium only: auto pre-fetch up to 10 recommended stories in background
```

### Gateway Changes Required

Two new lightweight endpoints (no subscription logic on the server):

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/stories/catalog` | GET | Returns titles, thumbnails, descriptions, categories, `isFree` flag | Yes |
| `/api/stories/{id}/download` | GET | Returns full story JSON + signed asset URLs | Yes |

The existing `/api/stories/delta` and `/api/stories/version` endpoints remain for backward
compatibility but are no longer called by the updated client.

### CMS Schema Change

Add `isFree: boolean` to `story-data.json` schema. The 2 designated free stories are marked
`isFree: true` in the CMS. All other stories default to `false`.

### Client Implementation

**New services:**
```
services/
├─ subscription-service.ts     ← RevenueCat init, purchase, restore, tier sync
├─ catalog-service.ts          ← Fetch/cache catalog metadata from gateway
├─ story-download-service.ts   ← On-demand single-story download + asset fetch
├─ story-access-service.ts     ← Tier gating logic, download limit enforcement
└─ referral-service.ts         ← Share link generation, referral bonus claim
```

**Modified services:**
```
services/
├─ batch-sync-service.ts       ← DEPRECATED (replaced by catalog + on-demand)
├─ story-loader.ts             ← MODIFY: merge bundled + individually downloaded stories
└─ cache-manager.ts            ← MODIFY: track per-story download count, deletion management
```

**Zustand store extensions (`store/app-store.ts`):**
```typescript
// New subscription state
tier: 'free' | 'basic' | 'premium';
downloadedStoryIds: string[];      // IDs of stories currently downloaded
downloadLimit: 2 | 50 | 125;       // Derived from tier
referralBonusClaimed: boolean;      // Whether +1 free story unlocked

---

## 2. Download Cap Rules & Best Practices

### How Similar Apps Handle Download Limits

The download cap model is used by most offline-capable content apps. Here's how the leaders do it
and what patterns to follow:

#### Spotify (Music)
- Free: streaming only, no downloads
- Premium: up to 10,000 songs across 5 devices
- Downloads expire after 30 days without going online (re-verification)
- Expired downloads are automatically removed
- Users manage downloads via a "Downloaded" filter in their library

#### Netflix (Video)
- All paid tiers can download, but limits vary by plan (15 / 25 / 100 per device)
- Downloads expire after 48 hours of first play or 7 days of download (whichever comes first)
- Clear messaging: "You have X downloads remaining on this device"
- Smart download: auto-deletes watched episodes, downloads next one
- Storage usage shown per-title so users can make informed delete decisions

#### Duolingo (Education)
- Free: online only
- Super: full offline access with no explicit download cap
- Content is small (text + audio), so storage isn't a concern

#### Epic! (Children's Books — closest competitor)
- Free: 1 book per day
- Paid: unlimited reading, offline downloads
- Download limit: ~50 books at a time
- Simple "Remove Download" button per book
- No expiry — downloads stay until manually removed or app uninstalled

#### Khan Academy Kids (Education)
- Free (non-profit model)
- Selective download: individual lessons, not bulk
- Storage indicator showing total cached content size

### Recommended Pattern for Grow with Freya

Based on industry patterns, here is the recommended download cap implementation:

#### Rule 1: Hard Cap Per Tier — Enforced Locally

```
Free:    2 stories (+ 1 referral bonus) — bundled, no download management needed
Basic:   50 stories maximum downloaded at any time
Premium: 125 stories maximum downloaded at any time
```

Enforcement is entirely client-side. The `story-access-service.ts` checks
`downloadedStoryIds.length` against `downloadLimit` before allowing a new download.

When the user hits the cap:
```
User taps "Download" on story #51 (basic tier)
  → Bottom sheet appears:
    "You've reached your download limit (50 stories)."
    "Remove a story to make room, or upgrade to Premium for 125 stories."
    [Manage Downloads]  [Upgrade]
```

#### Rule 2: No Expiry on Downloads

Unlike Spotify/Netflix, downloaded stories do **not** expire. Children's content is re-read
repeatedly — a 3-year-old will read the same story 50 times. Expiring downloads would be
hostile to the core use case.

However, **subscription lapse** locks access:
```
Subscription expires
  → Downloaded stories remain on device (don't delete)
  → Stories beyond the free tier become locked (greyed out, lock icon)
  → If user resubscribes → immediate access restored, no re-download needed
  → After 30 days lapsed → prompt to free storage by removing locked stories
```

This follows Netflix's pattern of keeping downloads but restricting playback.

#### Rule 3: Storage Transparency

Show the user how much device storage their downloads consume. This follows the
Khan Academy / Netflix pattern:

```
Settings → Storage
  ├─ Total stories downloaded: 34 / 50
  ├─ Storage used: 287 MB
  ├─ Device free space: 12.4 GB
  └─ [Manage Downloads] → list with per-story size + delete button
```

The `CacheManager` already tracks cached assets and can compute sizes via
`FileSystem.getInfoAsync()`. This just needs a UI surface.

#### Rule 4: Individual Delete, Not Bulk Wipe

Users should delete stories one-at-a-time, not "clear all downloads". This prevents
accidental data loss and follows the Epic! / Spotify pattern:

```
Manage Downloads screen (or swipe-to-delete on story tile)
  ├─ Story thumbnail + title + size (e.g. "8.2 MB")
  ├─ Swipe left → "Delete" button
  └─ Confirmation: "Remove 'Squirrel's Snowman'? You can re-download anytime."
```

Deletion removes:
1. Story JSON from AsyncStorage cache
2. All associated image assets from the filesystem
3. Story ID from `downloadedStoryIds` in Zustand
4. Frees up 1 slot toward the download limit

#### Rule 5: Re-Download Is Free and Instant

Deleting a story doesn't revoke access. If the user is still subscribed, they can
re-download the same story at any time from the catalog. This is critical for trust —
users shouldn't fear deleting downloads.

#### Rule 6: Smart Pre-Fetch (Premium Only)

Premium users get automatic background pre-fetching of up to 10 recommended stories.
This follows Netflix's "Smart Download" pattern:

```
App opens (premium user, on WiFi)
  → Check: downloadedStoryIds.length < downloadLimit
  → Fetch catalog → find newest stories not yet downloaded
  → Download up to 10 in background (lowest priority, WiFi only)
  → Show "New stories downloaded!" notification badge on Explore tab
```

Pre-fetched stories count toward the download limit. This feature should:
- Only run on WiFi (check `NetInfo`)
- Only run when battery > 20%
- Be toggleable in Settings ("Auto-download new stories")
- Default to ON for premium, unavailable for basic/free

#### Rule 7: Upgrade Prompts — Contextual, Not Aggressive

Upgrade prompts should only appear at natural friction points, never interrupt
active reading. This follows Apple's Human Interface Guidelines and avoids
review rejection:

**Acceptable prompt moments:**
- Tapping a locked story in the catalog
- Hitting the download limit
- Tapping "Explore" for the first time (soft banner, dismissible)
- After completing all free stories (congratulatory + upsell)

**Never prompt during:**
- Story reading
- Music challenges
- Onboarding (first 2 minutes of app usage)
- Screen time lockout

#### Rule 8: Offline Grace Period

If the device is offline, the app should:
- Allow access to all downloaded stories regardless of subscription status
- Not attempt subscription verification (RevenueCat caches entitlements locally)
- Show a subtle banner: "Go online to check for new stories"
- After 7 days offline, show: "Connect to verify your subscription" (still allow access)

RevenueCat's SDK handles this natively — it caches the last known entitlement state
and only re-verifies when connectivity is available.

### Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| P0 | Tier gating (free vs paid content access) | Medium |
| P0 | RevenueCat integration + paywall | Medium |
| P0 | Catalog browse UI | Medium |
| P0 | On-demand story download | Small |
| P1 | Download limit enforcement + "Manage Downloads" | Medium |
| P1 | Storage transparency (settings screen) | Small |
| P1 | Subscription lapse handling | Small |
| P2 | Referral system | Medium |
| P2 | Smart pre-fetch (premium) | Medium |
| P3 | Annual pricing options | Small (config only) |
| P3 | Free trial (7-day) | Small (RevenueCat config) |

### Technical Considerations

**RevenueCat + Expo compatibility:**
`react-native-purchases` requires a config plugin for Expo managed workflow. Add to `app.config.js`:
```javascript
plugins: [
  // ... existing plugins
  ['react-native-purchases', { appStoreKey: 'appl_xxx', googleApiKey: 'goog_xxx' }],
]
```

**Download counting accuracy:**
Track downloads in Zustand (persisted to AsyncStorage), not by counting files on disk.
File-system counting is slow and unreliable (partial downloads, corrupted files). The Zustand
array `downloadedStoryIds` is the source of truth.

**Tier transitions:**
When a user upgrades (free → basic → premium), the limit increases immediately.
When a user downgrades (premium → basic), downloads above 50 are **not** deleted — they
become locked until the user manually removes enough to get below the new limit, or
re-upgrades. This follows Spotify's approach.

**Guest users:**
Guest mode (no sign-in) gets the free tier: 2 bundled stories, no catalog access,
no download capability. Signing in (even without subscribing) unlocks catalog browsing.

---

## 3. Testing Subscriptions (Sandbox & License Testing)

### Apple — Sandbox Test Accounts

Apple provides dedicated sandbox accounts for testing in-app purchases without real charges.

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Sandbox → Testers
2. Create a sandbox tester (use a throwaway email — doesn't need to be a real inbox)
3. On the test device: Settings → App Store → sign out of your real Apple ID
4. When the app triggers a purchase, iOS prompts sign-in — use the sandbox account
5. All purchases are free and instant
6. Subscriptions auto-renew on an accelerated schedule:
   - Weekly → every 3 minutes
   - Monthly → every 5 minutes
   - Yearly → every 1 hour

**Important:** Never sign into the main App Store with a sandbox account — only use it when the in-app purchase dialog appears.

### Google — License Testers

Google uses real Google accounts but bypasses payment for designated testers.

1. Go to [Google Play Console](https://play.google.com/console) → Settings → License testing
2. Add your Gmail (or any tester's Gmail) to the license testers list
3. Those accounts get all purchases for free with test card options
4. Subscriptions also renew on an accelerated schedule (monthly → every 5 minutes)

### RevenueCat Sandbox Integration

RevenueCat automatically detects sandbox transactions and separates them in the dashboard.

```typescript
// Enable during development for detailed purchase flow logging
Purchases.setLogLevel(LOG_LEVEL.DEBUG);

// Test the "Ask to Buy" parental approval flow (relevant for children's app)
Purchases.setSimulatesAskToBuyInSandbox(true);
```

- Sandbox purchases appear separately in the RevenueCat dashboard
- Debug logs show the full purchase flow: offering → product → transaction → entitlement
- No special code paths needed — sandbox accounts go through the real purchase flow, Apple/Google just don't charge money

### Debug Menu (Recommended)

Add a hidden debug menu (e.g. long-press on the settings icon or version number) that displays:

- Current RevenueCat customer ID
- Active entitlements and their expiry dates
- Current subscription tier (Free / Basic / Premium)
- A "Restore Purchases" button
- Sandbox vs production indicator

This avoids needing to check the RevenueCat dashboard during device testing. The debug menu should only be visible in development builds (`__DEV__`) or behind a hidden gesture.

### Typical Development Testing Flow

```
Development build on physical device
  → App launches with RevenueCat SDK
  → Sign in with sandbox (iOS) or license tester (Android) account
  → Browse catalog → tap "Subscribe"
  → Purchase completes instantly (free)
  → RevenueCat reports entitlement as active
  → App unlocks paid content
  → Subscription auto-renews every 5 min → test renewal handling
  → Cancel subscription → test grace period / downgrade to free tier
```

No code bypass or mock accounts are needed. The sandbox system tests the real integration end-to-end.

---

## Related Documentation

| Document | Scope |
|----------|-------|
| `ARCHITECTURE.md` | Frontend tech stack, current sync architecture, design decisions |
| `MUSIC_FEATURE.md` | Music challenge system |
| `scripts/README.md` | CMS pipeline, story schema |
| `.github/workflows/README.md` | CI/CD pipelines |
| `gateway-service/README.md` | Backend API reference |
