# Agent Operating Rules — `website` (Marketing / Legal Site)

> Read this **after** the root `../CLAUDE.md`.
> This is the **Next.js 15** marketing + legal site at `earlyroots.co.uk`.
> Separate from the mobile app — different stack, different locales, different release cadence.

---

## 1. Communication

- Be concise. No flattery. Match root CLAUDE.md.

---

## 2. What Lives Here

| Layer | Location |
|---|---|
| App Router pages | `src/app/<route>/page.tsx` |
| Layout | `src/app/layout.tsx` |
| Static assets | `public/`, `src/images/` |
| Utils | `src/utils/` |
| i18n messages | `messages/{locale}.json` |
| Styling | Tailwind (`tailwind.config.ts`), `src/app/globals.css` |
| Config | `next.config.js`, `postcss.config.js` |

---

## 3. Key Differences vs Mobile App

- **8 locales here** (`de, en, es, fr, it, nl, pl, pt`) vs **14 in the mobile app**. Do not assume parity — adding a locale to mobile does **not** automatically add it here, and vice versa.
- **`next-intl`** for translations, **not** `react-i18next`. Different API.
- **React 18** (not 19 like the mobile app).
- **No subscription / auth flows here** — sign-in, payments, RevenueCat all live in the mobile app.
- This site is the **canonical home for privacy policy, terms, and contact endpoints** — `privacy@earlyroots.co.uk`, `support@earlyroots.co.uk` (root CLAUDE.md).

---

## 4. Test-Driven Development

There is **no test suite in this project yet.** Treat this as a gap, not as permission to skip testing.

When adding meaningful logic (anything beyond static page content):
1. **Propose adding a test setup first** — Vitest + React Testing Library is the lightest Next.js fit. Get approval before adding deps.
2. Until then, validation = `npm run build` (catches TS + Next.js build errors) and visual review via `npm run dev`.
3. For pure presentational pages, build + visual review is sufficient.

---

## 5. Editing Rules

- **TypeScript strict** — no `any`.
- **App Router only** — no `pages/` directory routes; use `src/app/`.
- **Server Components by default**; add `"use client"` only when you need state, effects, or browser APIs.
- **No client-side data fetching for SEO content** — fetch in Server Components or use static rendering.
- **No comments in code.** Use meaningful names.
- Tailwind classes via `className` — no inline `style` props unless dynamic. Keep class lists readable: break long ones across lines with `clsx`/`cn` helpers if a helper already exists.
- All user-facing strings go through `next-intl` — never hardcode English in JSX. Add to **all 8** `messages/*.json` files; fall back to English in code but keep parity in JSON.
- Images: use `next/image` for everything in `public/` and `src/images/`. Provide explicit `width` and `height` or `fill` with a sized parent.
- **Brand name** in user-facing text is always **"Early Roots"** (root CLAUDE.md).

---

## 6. Privacy / Legal Page Rules

Privacy policy, terms, and account-deletion pages are **legally meaningful**:
- **Never edit copy on these pages without confirming with the user first.**
- Changes here may need to be mirrored in the mobile app's `legal/` directory and in store listings.
- Don't translate legal text with the translation script — legal copy needs human review per locale.

---

## 7. Evidence-Based Analysis

```
File: website/src/<relative path>
Lines X-Y:
    <exact snippet>
```
Unverified claims must be marked: **"⚠️ UNVERIFIED — Unable to confirm this claim in codebase"**.

---

## 8. Refactoring

- **Always ask** before deleting a page route — search engines may have it indexed.
- When renaming a route, add a redirect in `next.config.js` rather than letting the old URL 404.

---

## 9. Commits

```
<message>

References: colearn#<issue-number>
```
Never push or deploy without explicit permission.

---

## 10. Commands

```bash
# Install
npm install

# Dev server
npm run dev                # http://localhost:3000

# Production build (use this as the type-check + lint gate)
npm run build

# Lint
npm run lint               # next lint

# Start built site
npm run start
```

---

## 11. Out of Scope

- **Do not add mobile-app features here** (auth, paywall, etc.) — this is a marketing site.
- **Do not add analytics / advertising SDKs** without approval (root CLAUDE.md: no behavioural tracking).
- **Do not add Sentry to this site** without a separate consent + privacy review.
