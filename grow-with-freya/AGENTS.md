# Agent Operating Rules — `grow-with-freya` (Mobile App)

> Read this **after** the root `../CLAUDE.md` (project identity, principles, never-rules).
> This file covers **how to work**, not **what the product is**.

---

## 1. Communication

- Be concise. Don't over-explain. No "Great question!", "You're absolutely right!", "Excellent point!".
- Brief acknowledgements only when they add clarity: "Got it.", "I see the issue."
- Skip acknowledgements when you can just proceed.
- Wrap code excerpts shown to the user in `<augment_code_snippet>` XML tags (see root CLAUDE.md).

---

## 2. Test-Driven Development

### Workflow (non-negotiable)
1. Find or create a **failing test first**.
2. Match the style of surrounding tests: same file → same `__tests__/` subdir → same module.
3. Run the test, confirm it fails for the **right reason**.
4. Write the minimum code to make it pass.
5. Re-run, confirm green.
6. Refactor while tests stay green.
7. Run `npm run type-check` before moving on.

### Test Quality
- One behaviour per test. Test names describe behaviour, not implementation.
- Deterministic — no real timers, no real network, no real `Date.now()` without mocking.
- Prefer **`describe.each` / `it.each`** over duplicating tests with different inputs.
- Variable name for the unit under test: **`underTest`** (adopt going forward; don't retrofit existing tests).
- Use AAA structure (Arrange / Act / Assert) with blank lines between sections.

### Tooling
| Concern | Tool |
|---|---|
| Runner | Jest 29 |
| Assertions | `expect` (Jest) + `@testing-library/jest-native` matchers |
| Component testing | `@testing-library/react-native` |
| Mocks | `jest.mock()` + manual mocks in `__mocks__/` |
| Snapshots | Only for stable, intentional output — never for whole screens |
| Coverage | Jest built-in, `jest-junit` + `jest-html-reporters` in CI |

### React Native Specifics
- **Never import real native modules** in tests — they have manual mocks already (`expo-audio`, `expo-secure-store`, `react-native-reanimated`, etc.). If a new native dep is added, add a `__mocks__/` entry in the same PR.
- For Zustand stores: reset state in `beforeEach` via the store's `setState` — don't recreate the store.
- For `react-i18next`: use the existing mock in `__mocks__/react-i18next.js`; assert on translation **keys**, not English copy.
- For navigation: mock `expo-router` hooks; don't render the real router tree.
- Use `useAccessibility()` mock when testing layout-dependent components — covers phone/tablet branches.

---

## 3. Editing Rules

- **No comments in code.** Use meaningful names. Existing comments stay; don't add new ones unless asked.
- **TypeScript strict.** No `any` — use `unknown` + narrowing, or define the type properly.
- `const` > `let`; never `var`. `async/await` > raw `.then()` chains.
- Prefer **composition** over inheritance, **iteration** over recursion. Ask before recursing.
- **Never** add `@CrossOrigin`-equivalent leniency to fetch wrappers — go through the existing API client.
- Use **package managers only** for deps (`npm install <pkg>`, never hand-edit `package.json`).
- Match the surrounding file's import-grouping and quote style — Prettier handles formatting on commit via `lint-staged`.
- When making assumptions or deferring work, write them in a plan file — ask which file to use.

### React / Expo Conventions
- Functional components only. Hooks at top level, never inside conditionals.
- Co-locate styles with components via `StyleSheet.create` (no inline style objects in JSX unless dynamic).
- Memoise expensive children (`React.memo`, `useMemo`, `useCallback`) — but only when there's measured benefit.
- All async work must handle loading / error / empty states (root CLAUDE.md).
- Offline-first: every network call goes through a wrapper that gracefully degrades.

---

## 4. Evidence-Based Analysis

Every claim about the codebase includes:
```
File: grow-with-freya/<relative path>
Lines X-Y:
    <exact snippet>
```
If you can't verify: **"⚠️ UNVERIFIED — Unable to confirm this claim in codebase"**. No guessing — ask.

---

## 5. Bug Analysis (use this skeleton)

**Description** — expected vs actual; when it started; affected envs/users.
**Reproduction** — exact steps; reproducibility rate.
**Impact** — technical (components, similar bugs) / business (users, features) / downstream (dependent systems).
**Root cause** — entry point → data flow → failure point → why the assumption was wrong.
**Fix approach** — describe (don't implement unless asked); cite existing patterns; list downstream changes (tests, types, mocks, i18n strings, locale files).

---

## 6. Refactoring

- Migrate **all scenarios** in a test file before asking to delete the old one.
- **Always ask** before deleting a file.
- Use current language features: TS 5.9 satisfies, `const` assertions, template literal types, etc.
- React 19 is available — use new hooks (`use`, `useOptimistic`) where they fit; don't shoehorn.

---

## 7. Commits

```
<message>

References: colearn#<issue-number>
```
- Confirm all intended files are staged before committing.
- `Co-authored-by:` for pairing.
- **Never push or open PRs without explicit permission** (root CLAUDE.md).

---

## 8. Build Failure Analysis

1. **3-line summary** of the most likely cause.
2. **Failed jobs** table: `| Job | Started | Completed | Duration |`.
3. **Per-failure**: suggested fix · relevant logs (collapse > 10 lines in `<details>`) · confidence (high/med/low). Low-confidence items skip detail.

---

## 9. Commands

```bash
# Type check
npm run type-check                    # tsc --noEmit

# Lint
npm run lint                          # expo lint
npm run lint:fix                      # auto-fix

# Test
npm run test                          # all unit tests
npm run test -- <path>                # single file
npm run test -- -t "<name>"           # by test name
npm run test:unit                     # __tests__/unit/**
npm run test:integration              # __tests__/integration/**
npm run test:ci                       # with coverage, fails on no-tests

# Full local validation (run before pushing)
npm run validate                      # type-check + lint + test:ci

# Dev
npm run start:clear                   # Expo dev server, cleared cache
npm run ios                           # iOS build + run
npm run android                       # Android build + run
```
