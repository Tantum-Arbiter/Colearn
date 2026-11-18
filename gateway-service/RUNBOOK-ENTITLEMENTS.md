# Runbook — subscriptions and paid downloads

How the gateway decides whether a family may download a paid story, what can go wrong, and what
to do about it. Design: [`PHASE-8-BACKEND-ALIGNMENT.md`](../PHASE-8-BACKEND-ALIGNMENT.md) §7.
Every alert in `prometheus/alerts/gateway-alerts.yml` group `gateway-entitlements` links to a
section here (`AlertRulesTest` checks that it does).

## The one idea to hold on to

**RevenueCat is the truth. What the gateway keeps in `users/{uid}.entitlement` is a copy.**
Anything wrong with the copy is fixed by throwing it away; the next download asks RevenueCat
again. No purchase exists only in our database.

Families never lose what is already on their phone: downloaded stories open offline without
the gateway. Only new downloads pass this check.

## Levers (environment variables on the gateway — no code change)

| Lever | Effect | Use when |
|-|-|-|
| `ENTITLEMENTS_ENFORCE=false` | Nothing is refused; would-be refusals are only logged and counted (`enforced="false"`) | Anyone paying is being refused. **Pull this first, investigate second.** |
| `ENTITLEMENTS_CACHE_EPOCH=<ISO instant, e.g. 2026-09-25T14:00:00Z>` | Every saved answer checked before that instant is ignored and fetched again | The saved copies are wrong (bad deploy, bad data) |
| `REVENUECAT_ACCEPT_SANDBOX=true` (default) / `false` | Whether TestFlight (sandbox) purchases count | Set `false` when the app ships to the stores |

On dev, variables are set in `.github/workflows/gateway-build.yml` (the deploy replaces the
service's environment, so a value set by hand in Cloud Run is lost at the next deploy).

## Dashboards and metrics

| Metric | Read it as |
|-|-|
| `app_entitlements_decisions_total{decision, source, enforced}` | Every download decision. `source`: `free_story`, `referral`, `cache`, `revenuecat`, `stale_cache`, `unverified` |
| `app_revenuecat_requests_total{outcome}` and `app_revenuecat_request_duration_seconds` | Every RevenueCat lookup: `active`, `inactive`, `unauthorized`, `rate_limited`, `server_error`, `timeout`, `bad_response`, `circuit_open`, `not_configured` |
| `app_entitlements_refresh_total{source}` | Refreshes the app asked for after a purchase or restore |
| `app_circuitbreaker_state{name="revenuecat"}` | `OPEN` means lookups are being skipped |

## RevenueCat unauthorized

**Alert:** `RevenueCatUnauthorized` (critical).
**Means:** RevenueCat rejects `REVENUECAT_SECRET_API_KEY` (revoked, rotated, wrong project, or a
public `appl_`/`goog_` key used by mistake). Every paid decision is on the fallback.
**Families:** unaffected: without a working key nobody is turned free.
**Do:**
1. RevenueCat → Project settings → API keys: create a v1 **secret** key (`sk_…`).
2. `gh secret set REVENUECAT_SECRET_API_KEY --repo Tantum-Arbiter/Colearn` and redeploy.
3. **Recovered when** `app_revenuecat_requests_total{outcome=~"active|inactive"}` rises and
   `unauthorized` stops.

## RevenueCat errors

**Alert:** `RevenueCatErrorRate` (warning); `CircuitBreakerOpen{name="revenuecat"}` may follow.
**Means:** RevenueCat is slow, down or rate-limiting us.
**Families:** unaffected. Saved paid answers are used even past their re-check time while they
have not expired; unknown families are let in as `unverified` — never turned free.
**Do:**
1. Check https://status.revenuecat.com.
2. If it is `rate_limited` and RevenueCat is healthy, look for a burst of refreshes
   (`app_entitlements_refresh_total`) — an app bug calling refresh in a loop.
3. Nothing else is needed: the breaker retries by itself every 30 s.
4. **Recovered when** the breaker is `CLOSED` and `unverified` decisions return to near zero.

## Unverified spike

**Alert:** `EntitlementsUnverifiedSpike` (warning).
**Means:** more than 10 % of paid decisions could not be checked — RevenueCat down (see above), or
the saved copies or download counts cannot be read from Firestore.
**Families:** unaffected; they are being let in.
**Do:** find which: `app_revenuecat_requests_total` by outcome (RevenueCat), or Firestore errors
(`app_firestore_errors_total`, Firestore status page). Unverified access is the designed
behaviour: an inability to verify is never treated as a lapsed subscription.

## Refusal spike

**Alert:** `EntitlementsRefusalSpike` (warning).
**Means:** "subscription required" refusals are over three times yesterday's rate. Either a
campaign brought many free families to paid stories (fine), or a bug refuses paying families.
**Do:**
1. **If enforcement is on and support is hearing "I paid but it's locked": set
   `ENTITLEMENTS_ENFORCE=false` now.**
2. Split refusals by `source`: all `revenuecat` means RevenueCat itself says those families are
   free — check a refused account in the RevenueCat dashboard (customer = the gateway user id).
   All `cache` means the saved copies are wrong — set `ENTITLEMENTS_CACHE_EPOCH` to now.
3. A refused family whose RevenueCat customer has no purchase: their purchase is tied to another
   id (bought before signing in, or on another account) — see the support script below.
4. Turn enforcement back on when refusals match RevenueCat.

## Support: "I paid but the story is locked"

1. In the app: Account → **Restore Purchases**. The store receipt is re-checked by RevenueCat and
   the app asks the gateway to refresh.
2. Open the story again. The app also refreshes and retries once by itself before it shows the
   paywall.
3. Still locked: find the customer in RevenueCat by the gateway user id (from the account export
   or logs) and check the entitlement is active and the purchase is attached to that id.
4. Never unlock by editing `users/{uid}.entitlement` by hand — it is a copy and will be
   overwritten. Fix it in RevenueCat (grant a promotional entitlement if needed).

## Backups and restores

- The entitlement copy needs no backup: after a Firestore restore it is either correct or
  re-fetched (set `ENTITLEMENTS_CACHE_EPOCH` to the restore time to be sure).
- Family data does need them. Firestore point-in-time recovery (7 days) and a daily scheduled
  export are configured in Google Cloud, not in this repository — ⚠️ UNVERIFIED whether they are
  on (PHASE-4-PROD-READINESS.md §9). To turn them on:
  `gcloud firestore databases update --database='(default)' --enable-pitr` and a Cloud Scheduler
  job running `gcloud firestore export gs://<backup-bucket>` daily.
