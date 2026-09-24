---
title: "Privacy policy — changes the Phase 8 backend needs"
type: proposal
status: draft — not applied; website/AGENTS.md requires the operator's confirmation before legal copy changes
page: website/src/app/privacy/page.tsx
updated: 2026-09-24
---

# Privacy policy changes (L2)

The live policy (`website/src/app/privacy/page.tsx`) no longer matches what the app and gateway
do. Each row says what the page says now, what is true now, and proposed wording. Nothing here
has been applied to the website. The in-app copy in `grow-with-freya/legal/` was not reviewed
(that file is stale and unused — see the Phase 8 flags).

| § | The page says | What the code does now | Proposed wording |
|-|-|-|-|
| 2.1 | Child profiles: display name/alias and avatar | Since Phase C the child document also holds age range, language, text size, favourites, reading progress, finished books, challenge counts, badges, screen-time and reminder settings, and reminder text the parent types | **Child profiles:** an alias, an avatar, an age range (never a birth date), the app language and text size, favourite stories and songs, which books have been read and finished, badges earned, and screen-time and reminder settings, including any reminder text you write. We keep these so they are the same on every phone you sign in on. We do not keep a record of when your child used the app. |
| 2.1 | — | Since Phase E the gateway holds the subscription tier and expiry, and which stories are held on the family's devices | **Subscription:** your plan (free, basic or premium) and when it renews or ends, as reported by the App Store or Google Play through RevenueCat, and which stories are downloaded, so we can honour your plan's limits. We never see your card or payment details. |
| 2.2 | No voice recordings on our servers | Still true: recordings are never sent to the gateway (voice sync was dropped 2026-09-24), and recording is behind the parents-only gate | Keep. Optionally add: "Recording is for grown-ups: the app asks a parents-only question first." |
| 2.2 | No payment data | Still true | Keep, with the subscription line above. |
| 6 | Cloud hosting; Apple/Google for sign-in | RevenueCat receives the account id (Phase E); Sentry receives crash reports when opted in | Add **RevenueCat** (subscription status) and **Sentry** (crash reports, only if you turn them on) as processors, with their locations once confirmed. |
| 7 | International transfers | Compute in Belgium (europe-west1); Firestore location ⚠️ UNVERIFIED; RevenueCat and Sentry are US companies | State where data is held once L3 is confirmed, and the transfer safeguard (UK IDTA or addendum) for each US processor. |
| 8 | Consent records: kept for 7 years | Account deletion deletes consent records | **Operator decision** (DPIA §5): keep a minimal consent log after deletion and change the code, or say "until you delete your account". |
| 8 | Account data & profiles: kept while your account is active | True; the list of downloaded stories follows the same rule | Add downloads and subscription status to this line. |
| 9 | Access, portability | `GET /api/account/export` returns account, profile, children, consents, subscription and downloaded stories | Add that the export is available from the app, and what it contains. |
