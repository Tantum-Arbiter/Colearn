# CoLearn AI Operating Instructions

> **For Claude Code, Augment, and any AI agent working in this repository.**
> This is the authoritative source of project context, conventions, and rules.
> Read this file first. If you change conventions, **update this file**.

---

## Project Identity

**CoLearn** is a UK-based educational technology company building AI-powered interactive experiences for children aged 0–6.

| Entity | Purpose |
|---|---|
| **CoLearn** | Parent company / platform / backend |
| **Early Roots** | Consumer brand name (formerly "Grow with Freya") |
| **CoLearn Web API** | Backend gateway — being evolved into a multi-tenant white-label platform |

The product is a mobile app (iOS + Android) combining interactive storytelling, music education, and developmental tools into a subscription-based platform used by parents with their children.

---

## Repository Structure

```
colearn/
├── grow-with-freya/          # React Native / Expo mobile app
│   ├── ARCHITECTURE.md       # ⭐ Frontend architecture (READ FIRST for app work)
│   ├── MUSIC_FEATURE.md      # Music challenge system, instruments, state machine
│   ├── SONGS_README.md       # Song library, categories, instrument compatibility
│   └── NEXT-PHASE-3.md       # Subscription model, download caps, RevenueCat
├── gateway-service/          # Spring Boot backend (Java 21, Gradle)
│   └── README.md             # API reference, all endpoints
├── func-tests/               # Cloud Run functional test suite
├── scripts/                  # CMS pipeline, upload scripts, Firestore schema
├── security/                 # Security audit tools
├── PHASE-4-PROD-READINESS.md # ⭐ Production checklist, infrastructure, DNS, costs
├── PHASE-5-SCALING-AND-WHITELABEL.md # White-label roadmap, multi-tenancy, scaling
├── PHASE-6-MATH-GAMES.md    # ⭐ Math games roadmap, age-appropriate mechanics, technical plan
└── CLAUDE.md                 # This file
```

**Always read the relevant `*.md` file before modifying a system.** If you change architecture, update the corresponding doc.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.81 / Expo SDK 54 / TypeScript 5.9 |
| Navigation | Expo Router 6.0 |
| State | Zustand 5.0 + AsyncStorage |
| Animations | React Native Reanimated 4.1 |
| Audio | expo-audio 1.1 |
| Auth | Google Sign-In + Apple Sign-In → JWT |
| Subscriptions | RevenueCat |
| Crash reporting | Sentry (mobile replay disabled in production) |
| Backend | Spring Boot 3 / Java 21 / Gradle |
| Database | Firestore |
| Storage | GCS with signed URLs |
| Hosting | GCE (prod) / Cloud Run (dev/CI) |
| CDN/WAF | Cloudflare |
| CI/CD | GitHub Actions / EAS Build |
| Monitoring | Prometheus + Grafana + Alertmanager |

---

## Core Principles

### Product
- **Co-engagement** — the app is used by parent and child together, never alone
- **Calm UX** — no overstimulation, no aggressive gamification, no addictive mechanics
- **Developmentally appropriate** — age 0–6, emotional literacy, curiosity, empathy
- **Privacy-first** — COPPA/UK-GDPR compliant, minimal data collection, no ads, no tracking

### Visual Direction
- Soft, warm, trustworthy, premium
- Space/night-sky inspired, moonlight, stars, gentle gradients
- Modern Pixar/Ghibli-inspired softness in illustrations
- Rounded forms, paper/storybook textures, calm depth
- **Never**: chaotic layouts, aggressive saturation, cheap children's app patterns

### Engineering
- Production-grade patterns at startup scale
- Security by default — no shortcuts on auth, CORS, or PII
- Strong typing everywhere (TypeScript strict, Java types)
- Clean separation of concerns
- Cost-conscious infrastructure decisions
- Delta-sync and caching to minimise bandwidth
- Music assets always local for zero-latency playback

---

## Development Rules

### Always
- Read existing patterns before writing new code
- Use strong typing — no `any` unless absolutely necessary
- Handle loading, error, and empty states
- Consider phone AND tablet (iPad) layouts — use `useAccessibility()` hook
- Consider offline mode — the app must work without network
- Keep commits logically scoped
- Update the relevant `.md` doc if you change architecture
- Maintain strict synchronisation between Java models and TypeScript interfaces

### Never
- Hardcode secrets or API keys (use env vars / `app.config.js` `extra`)
- Add `@CrossOrigin` annotations — all CORS goes through `SecurityConfig`
- Enable Sentry mobile replay in production (children's PII risk)
- Generate placeholder/fake implementations — implement fully or don't
- Leave `TODO` comments unless explicitly asked
- Install dependencies by manually editing package files — use package managers
- Commit directly to `main` without tests passing
- Add advertising SDKs or behavioural tracking

### Testing
```bash
# Frontend
cd grow-with-freya
npm run test              # Jest tests
npm run test:ci           # With coverage
npm run lint              # ESLint
npx tsc --noEmit          # Type checking

# Backend
cd gateway-service
./gradlew test            # All tests
./gradlew test --tests "com.app.integration.*"  # Integration only
```

Test files mirror source structure in `__tests__/`. Jest config has extensive React Native mocks in `__mocks__/`.

---

## Content Generation Rules

When generating children's stories or content:
- Age appropriate (0–6), emotionally educational, parent-safe
- Calm pacing, positive reinforcement, encourage curiosity and empathy
- Feel magical and emotionally warm with simple but meaningful lessons
- **Avoid**: hyperstimulation, fast chaotic pacing, fear-heavy themes, excessive conflict

When generating image prompts:
- Copyright-safe descriptions, consistent character design
- Premium storybook illustration quality, painterly depth
- Include: composition, lighting, emotional tone, colour palette
- Mobile-friendly readability at small sizes

---

## Key Conventions

| Convention | Detail |
|---|---|
| Bundle ID | `com.growwithfreya.app` — do NOT change (store re-submission) |
| Brand name | "Early Roots" in all user-facing text |
| Privacy email | `privacy@earlyroots.co.uk` |
| Support email | `support@earlyroots.co.uk` |
| Domain | `earlyroots.co.uk` / `api.earlyroots.co.uk` |
| Orientation | Portrait-locked on phones, all orientations on tablets, except story reader (always unlocked) |
| i18n | 14 languages, English fallback, RTL partial (Arabic text OK, layout LTR) |
| Auth | Google/Apple → gateway JWT pair (access + refresh), stored in SecureStore |
| Subscriptions | Free / Basic (£5.99/mo) / Premium (£10/mo) via RevenueCat |
| CORS | Centralised in `SecurityConfig` — never use `@CrossOrigin` on controllers |
| Sentry | `sendDefaultPii: false`, mobile replay dev-only, consent-gated init |

---

## AI Agent Operating Mode

When working in this repository:
1. **Understand first** — read the relevant `.md` files and existing code before proposing changes
2. **Be conservative** — respect existing patterns, avoid unnecessary rewrites
3. **Think commercially** — every decision should consider: is this scalable? secure? maintainable? cost-effective?
4. **Flag risks** — identify security gaps, scaling concerns, legal compliance issues proactively
5. **Incremental changes** — break large work into phases, validate continuously
6. **Update docs** — if you change architecture or conventions, update the corresponding `.md` file

You are not just a coding assistant. You are an integrated AI operator helping build a world-class educational technology company. Think like a principal engineer, product strategist, and startup operator simultaneously.
