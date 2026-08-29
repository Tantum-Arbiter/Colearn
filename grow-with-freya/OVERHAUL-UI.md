---
title: "Story catalogue UI overhaul — the world is the interface"
type: design
status: proposed
branch: mvp
updated: 2026-08-29
reference: design screenshot, Stories catalogue, 2026-08
---

# Story catalogue UI overhaul

> **Source of truth** for the Grow with Freya child-facing catalogue interface.
> The supplied reference screenshot is authoritative. This document turns it into an
> implementable build specification: tokens, components, dimensions, states, motion and
> acceptance criteria.
>
> This closes the gap left open in [`../PHASE-7-UI-OVERHAUL.md`](../PHASE-7-UI-OVERHAUL.md)
> surface 5 ("re-audit when a distinct design lands"). A distinct design has now landed.

---

## 0. Scope

**In scope:** the Stories catalogue screen, and the reusable visual language it establishes.

**Out of scope for the first build, but explicitly designed for:** Music, Learning, Feelings,
Puzzles, profile selection, parent controls. Every component below is built to be re-skinned
with a different content set, not rewritten.

**Not a redesign brief.** Do not simplify the reference into generic cards, substitute a
standard design system, or reinterpret the layout. Where the implementation diverges from the
reference, the fix is to adjust spacing, scale and proportion — **never** to add UI.

---

## 1. The governing principle

The current app builds screens as:

```
Background  →  Cards  →  Buttons
```

This design inverts that:

```
Environment  →  Activity artwork  →  Functional controls
```

The planet, the story covers, the stars and the atmospheric lighting **are** the interface.
Controls are deliberately secondary: they float over a world rather than sitting inside a
chrome shell. The child should feel they are looking into a story world that happens to be
operable, not at an app that happens to have pictures in it.

If a single sentence survives into implementation, it is this one.

This is the same grammar already argued for the home screen in
[`HOME-OVERHAUL.md`](HOME-OVERHAUL.md) ("a place, not a launcher") and the reader in
[`STORY-GARDEN.md`](STORY-GARDEN.md). The catalogue is the third surface to adopt it.

---

## 2. Art direction — three layers

### Layer 1 — Environment

Deep royal/navy illustrated sky with a **gentle vertical tonal change**, never one flat fill.

| Role | Value |
|---|---|
| Darkest navy (bottom) | `#071D54` |
| Primary deep blue (mid) | `#092E8E` |
| Brighter environmental blue (top) | `#1552B7` |
| Accents | occasional indigo/violet |

Stars are scattered sparingly: mostly tiny white points, some warm gold, with the occasional
four-point glowing star as an accent. The background must never become busy enough to compete
with text.

### Layer 2 — Illustrated world elements

A large illustrated Earth enters from **outside the top of the viewport** and is deliberately
cropped, so the UI reads as existing underneath a larger magical world.

| Property | Value |
|---|---|
| Horizontal position | centred |
| Width | 55–65% of screen width |
| Visible portion | lower curved section only |
| Vertical position | top edge above the viewport, extending behind the status bar |
| Treatment | painterly blue oceans, soft green land, warm highlights, soft atmospheric edge glow |

This is **environmental artwork, not a card**. It has no border, no surface, no press target.

Asset slot: `assets/images/ui-elements/home-earth-night.webp` already exists in the repo and is
the intended source; a higher-resolution crop may be substituted without changing the component
contract.

### Layer 3 — Functional UI

Controls float over the environment using translucent deep-blue surfaces, thin pale
blue/violet borders, large rounded corners, restrained internal glow and soft depth. Minimal
conventional drop shadows. Tactile, never glossy or toy-like.

---

## 3. Screen composition

Exact vertical order. No additional sections.

1. system / status area (artwork passes behind it)
2. floating planet
3. back and sound controls
4. page title
5. category filter row
6. section heading — *Bedtime Stories*
7. featured story card
8. secondary section heading — *More Stories*
9. story card row (3 visible)
10. persistent bottom navigation

The primary catalogue must be understandable **without scrolling** on a reference phone
viewport. Vertical compactness is a requirement, not a preference.

---

## 4. Design tokens

Centralise before writing any component. Hex values and arbitrary radii must not be scattered
through the implementation — that is precisely how the current screen drifted (see §14).

**File:** `constants/child-ui-theme.ts`

### Colour

| Token | Value | Usage |
|---|---|---|
| `BACKGROUND_DEEP` | `#071D54` | gradient stop — bottom |
| `BACKGROUND_PRIMARY` | `#092E8E` | gradient stop — mid, dominant screen colour |
| `BACKGROUND_BRIGHT` | `#1552B7` | gradient stop — top, atmospheric glow |
| `SURFACE_PRIMARY` | `rgba(80, 120, 200, 0.32)` | circular controls |
| `SURFACE_SECONDARY` | `rgba(63, 105, 184, 0.55)` | filter pills |
| `SURFACE_NAV` | `rgba(14, 43, 113, 0.82)` | bottom navigation container |
| `BORDER_DEFAULT` | `rgba(190, 215, 255, 0.38)` | every standard surface edge |
| `BORDER_ACTIVE` | `rgba(214, 230, 255, 0.62)` | selected / pressed surface edge |
| `TEXT_PRIMARY` | `#FFFFFF` | titles, labels, active nav |
| `TEXT_SECONDARY` | `rgba(255, 255, 255, 0.72)` | inactive nav labels |
| `ACCENT_GOLD` | `#E8B84B` | section stars, selected nav icon + label |
| `ACCENT_PURPLE` | `#6D5DF5` | play / Read buttons, selected nav panel |
| `ACCENT_BLUE` | `#1552B7` | selected nav panel gradient partner |
| `ACCENT_GREEN` | `#6FCF7F` | Calming filter icon |

`ACCENT_GOLD` and `ACCENT_PURPLE` intentionally reuse the values already exported from
`components/onboarding/onboarding-theme.ts`, so the catalogue does not introduce a second
brand gold or a second brand purple.

**Deliberate deviation from the brief:** the brief specifies `rgba(190,215,255,0.38)` for
circular-control borders and `rgba(180,210,255,0.40)` for pill borders. Those differ by under
2% and would violate the brief's own rule against unrelated blue shades per component. Both
collapse into `BORDER_DEFAULT`.

### Radius

Never assign a radius outside this family.

| Token | Value | Applies to |
|---|---|---|
| `RADIUS_SMALL` | `14` | small controls, grid-view toggle |
| `RADIUS_CONTROL` | `22` | filter pills |
| `RADIUS_CARD` | `22` | story cover cards |
| `RADIUS_LARGE` | `26` | featured story card |
| `RADIUS_NAV` | `30` | bottom navigation container |
| `RADIUS_NAV_ITEM` | `22` | selected navigation panel |
| — | `50%` | circular controls, play buttons |

### Spacing

| Token | Value |
|---|---|
| `SPACE_1` | `4` |
| `SPACE_2` | `8` |
| `SPACE_3` | `12` |
| `SPACE_4` | `16` |
| `SPACE_5` | `24` |
| `SPACE_6` | `32` |

### Content margin

The master alignment axis. Section headings, the featured card and the story row all align to it.

| Viewport | Margin |
|---|---|
| Phone | `22` |
| Tablet | `32` |

### Typography

Rounded, highly readable, warm, child-friendly. Not cartoonish, not geometric/technical.
Ship via `Fonts.primary` (`ui-rounded` on iOS) until the open typography decision in
[`../PHASE-7-UI-OVERHAUL.md`](../PHASE-7-UI-OVERHAUL.md) §Open decisions is resolved — that
decision is a prerequisite for freezing this section, and it affects every surface.

| Role | Phone | Tablet | Weight |
|---|---|---|---|
| Page title | 34 | 41 | 800 |
| Featured card title | 29 | 34 | 700 |
| Section heading | 23 | 26 | 700 |
| Story card title | 15 | 17 | 700 |
| Filter pill label | 15 | 16 | 600 |
| Nav label | 12 | 13 | 600 |

All sizes pass through `useAccessibility().scaledFontSize`. Layout must survive the largest
accessibility step without clipping or reflowing the filter row onto two lines (see §13.14).

---

## 5. Component architecture

**Directory:** `components/child-ui/` for the reusable language,
`components/stories/catalogue/` for the story-specific composition.

```
<StoryCatalogueScreen />          components/stories/catalogue/story-catalogue-screen.tsx

<CelestialBackground />           components/child-ui/celestial-background.tsx
<PlanetHeaderArtwork />           components/child-ui/planet-header-artwork.tsx
<CircleActionButton />            components/child-ui/circle-action-button.tsx
<PageTitle />                     components/child-ui/page-title.tsx
<SectionHeading />                components/child-ui/section-heading.tsx
<ChildBottomNavigation />         components/child-ui/child-bottom-navigation.tsx
<NavigationItem />                components/child-ui/navigation-item.tsx

<StoryFilterBar />                components/stories/catalogue/story-filter-bar.tsx
<StoryFilterPill />               components/stories/catalogue/story-filter-pill.tsx
<FeaturedStoryCard />             components/stories/catalogue/featured-story-card.tsx
<StoryCoverCard />                components/stories/catalogue/story-cover-card.tsx
<StoryPlayButton />               components/stories/catalogue/story-play-button.tsx
```

Everything under `components/child-ui/` is content-agnostic: it must render correctly for
Music, Learning, Feelings and Puzzles without modification.

`StoryCoverCard` and `FeaturedStoryCard` **accept data**. They are never custom-coded per book.

---

## 6. Component specifications

### 6.1 `CelestialBackground`

Full-bleed vertical gradient `BACKGROUND_BRIGHT → BACKGROUND_PRIMARY → BACKGROUND_DEEP`, with a
deterministic scattered star field above it.

| Prop | Type | Default |
|---|---|---|
| `starCount` | `number` | `28` |
| `goldStarRatio` | `number` | `0.25` |
| `accentStars` | `number` | `3` (four-point glowing) |
| `children` | `ReactNode` | — |

Star positions are generated once from a fixed seed and memoised. Stars never animate behind
text regions. Reuse the existing `generateStarPositions` helper from
`components/main-menu/utils` rather than writing a second generator.

### 6.2 `PlanetHeaderArtwork`

| Prop | Type | Default |
|---|---|---|
| `source` | `ImageSource` | `home-earth-night.webp` |
| `widthRatio` | `number` | `0.60` (clamped 0.55–0.65) |
| `topOffsetRatio` | `number` | `-0.34` (fraction of its own height above the viewport) |

`pointerEvents="none"`. Ignores safe-area insets by design — it must extend behind the status
bar. Renders below all Layer-3 content in z-order.

### 6.3 `CircleActionButton`

| Prop | Type |
|---|---|
| `type` | `'back' \| 'audio'` |
| `onPress` | `() => void` |
| `accessibilityLabel` | `string` |

| Property | Phone | Tablet |
|---|---|---|
| Diameter | `56` | `62` |

Background `SURFACE_PRIMARY`, border `1.5` `BORDER_DEFAULT`, radius 50%. Icon white, ~48% of
diameter — large and obvious enough for a child. Back sits top-left, audio top-right, both
inside the safe area at content margin.

There is **no app bar**. Do not reintroduce one.

### 6.4 `PageTitle`

Centre-aligned, `TEXT_PRIMARY`, sizes per §4. Vertically centred against the two circular
controls.

### 6.5 `StoryFilterBar` / `StoryFilterPill`

One row, always one line: three pills plus a trailing grid-view toggle.

| Property | Value |
|---|---|
| Pill height | `46` |
| Pill horizontal padding | `22` |
| Pill radius | `RADIUS_CONTROL` |
| Pill background | `SURFACE_SECONDARY` |
| Pill border | `1` `BORDER_DEFAULT` |
| Gap between pills | `SPACE_3` |
| Toggle | `46 × 46`, `RADIUS_SMALL`, same surface |

Icons are colourful; labels stay white. Selected pills brighten slightly and take
`BORDER_ACTIVE` — they do not change hue. Reference set: Calming (leaf, `ACCENT_GREEN`),
Bedtime (moon, `ACCENT_GOLD`), Adventure (rocket, `ACCENT_PURPLE`).

If the tag set grows beyond three, the row **paginates horizontally**; it never wraps to a
second line and never shrinks below the 44 dp touch minimum.

### 6.6 `SectionHeading`

Gold star icon (`20–24`) + label, on the background, never inside a card. Left edge defines the
content margin for everything beneath it.

### 6.7 `FeaturedStoryCard`

The most important element on the screen.

| Property | Value |
|---|---|
| Width | full content width |
| Aspect ratio | `1.8 : 1` (accept 1.75–1.9) |
| Radius | `RADIUS_LARGE` |
| Border | `1` `BORDER_DEFAULT` |

The story illustration fills the **entire** card. The card is never split into an image half
and a text half. A subtle dark tonal wash sits behind the title only where legibility requires
it — a soft left-to-right gradient, not a full-card scrim.

Title: upper-left, `24` inset, white, maximum two lines, sizes per §4.

The whole card is tappable, in addition to the Read button.

### 6.8 `StoryPlayButton`

| Variant | Diameter | Content |
|---|---|---|
| `featured` | `68` | play triangle + "Read" |
| `card` | `44` | play triangle |

Rich lavender/violet fill from `ACCENT_PURPLE` with a subtle radial highlight, gentle outer
glow, pale semi-transparent border. It must read as an invitation to open a book, not as a
video-player transport control.

Featured variant sits in the top-right of the featured artwork; card variant sits near the
bottom of a cover card, horizontally centred.

### 6.9 `StoryCoverCard`

| Property | Value |
|---|---|
| Layout | 3 columns |
| Aspect ratio (w : h) | `0.68` (accept 0.65–0.72) |
| Gap | `12` |
| Radius | `RADIUS_CARD` |
| Border | `1` `BORDER_DEFAULT` |

Full-card artwork. Title near the **top**, centred, white, max two lines. Play button near the
bottom. **The story cover is the card** — titles never sit underneath a thumbnail. This is the
single largest departure from the current implementation (§14).

### 6.10 Artwork treatment

Every cover must look like part of one shared universe: soft children's-book rendering,
painterly texture, rounded forms, expressive but calm characters, gentle cinematic lighting,
controlled saturation, magical environmental glow.

Avoid hard vector artwork, photorealism, visual noise, harsh contrast, generic stock
illustration.

**Commissioning rule:** cover compositions must reserve negative space where the title sits —
top-centre for cover cards, upper-left for featured artwork. This is a requirement on the
generation prompt, not a problem to solve with scrims later.

### 6.11 `ChildBottomNavigation` / `NavigationItem`

Persistent floating surface. Items: Home, Library, Progress, Parents — four equal areas.

| Property | Value |
|---|---|
| Height | `88` |
| Horizontal margin | content margin |
| Bottom margin | `14` + safe-area inset |
| Radius | `RADIUS_NAV` |
| Background | `SURFACE_NAV` |
| Border | `1` `BORDER_DEFAULT` |

**Selected state** is not a recolour. The selected item gets its own raised, tinted rounded
panel: linear blue gradient (`ACCENT_BLUE → ACCENT_PURPLE` at low opacity), `RADIUS_NAV_ITEM`,
with the icon and label in `ACCENT_GOLD`. Unselected icons and labels use `TEXT_SECONDARY`.
Current location must be legible to a pre-reader at a glance.

The navigation never overlaps catalogue content — the scroll container reserves its height plus
`SPACE_4`.

---

## 7. Data contract

Cards accept data. The catalogue grows without touching UI architecture.

```ts
interface CatalogueStory {
  id: string;
  title: LocalizedText;
  coverArtwork: ImageSource;
  category: StoryCategory;
  theme: StoryFilterTag[];
  progress: number | null;
  locked: boolean;
  audioAvailable: boolean;
  interactive: boolean;
}
```

This is a presentation-layer view model. It is derived from the existing `CatalogEntry` /
`Story` types in `types/story.ts` by a mapper — the existing domain types are **not** reshaped
to suit the UI, and the mapper is the only place that knows about both.

Locked, download and share-to-unlock affordances already implemented in
`components/stories/catalog-story-card.tsx` must be carried across; they are commercial
behaviour, not decoration.

---

## 8. Motion

Restrained microinteractions. The screen should not feel static, but must never feel busy.

| Interaction | Behaviour | Duration |
|---|---|---|
| Story card tap | scale `1.0 → 0.97 → 1.0`, then open preview | ~150 ms |
| Filter select | pill brightens, icon shifts 1–2 px, border → `BORDER_ACTIVE` | 180 ms ease-out |
| Read button press | slight shrink, inner highlight increases, optional light haptic | 150 ms |
| Nav selection | selected panel **slides** horizontally to the new item | 180–240 ms ease-out |

All timings live in `constants/child-ui-motion.ts` alongside the existing
`constants/story-garden-motion.ts` pattern. Motion respects the reduce-motion setting already
surfaced by `useAccessibility()`.

---

## 9. Story opening transition

When Read is tapped:

1. the selected card gently enlarges
2. the surrounding catalogue darkens
3. the card artwork moves toward screen centre
4. interface chrome fades
5. the device is allowed to rotate
6. the artwork expands into the landscape reader

The child should experience **"I opened the book"**, not "I navigated to another screen."

This is a UX principle for the whole app, not a one-screen flourish. The existing
`contexts/story-transition-context` and `components/stories/story-garden/book-opening-overlay.tsx`
already implement most of this choreography; extend them rather than writing a parallel path.

---

## 10. Responsive behaviour

Do not stretch the phone layout onto tablet.

| Viewport | Featured | More Stories |
|---|---|---|
| Phone portrait | 1 column, full content width | 3 cards visible |
| Tablet portrait | centred, **capped width**, larger side margins | 3–4 cards |
| Tablet landscape | two-zone: featured left, story grid right | grid |

Hierarchy is identical in all three. The featured card must not become excessively wide on
tablet — cap it and increase the margin instead.

Breakpoint: `width >= 768` is tablet, matching the existing convention in
`components/ui/page-header.tsx`.

---

## 11. Safe areas

Functional controls respect device safe areas. **Decorative artwork does not.** The planet
extends into and behind the status area deliberately — that is what makes the top of the screen
feel immersive rather than framed.

---

## 12. Prohibitions

Do not:

- use generic white cards
- create a conventional navigation header
- replace the illustrated background with a CSS/linear gradient alone
- place story names below thumbnails
- use small mobile controls
- add ratings, durations, page counts or any metadata to the child catalogue
- flatten artwork into rectangular thumbnails
- use Material/default platform components without significant visual adaptation
- use default React Native `Button` / `TouchableHighlight` styling
- increase information density
- use unrelated blue shades per component
- make it resemble Netflix, YouTube Kids or a streaming catalogue

---

## 13. Fidelity acceptance criteria

Compare against the reference at the same viewport before calling the work done.

1. Planet occupies approximately the same visual area.
2. "Stories" heading sits at approximately the same vertical position.
3. Back / audio buttons match the reference scale.
4. Filter row fits on one line.
5. Featured card occupies almost the full usable width.
6. Featured artwork is not incorrectly cropped.
7. Featured title retains the same visual prominence.
8. Three More Stories cards are simultaneously visible.
9. Bottom navigation does not overlap the catalogue.
10. Selected Home state is immediately visible.
11. Background remains predominantly deep royal blue.
12. Decorative stars never compete with text.
13. No default platform component visually breaks the art direction.
14. Text stays readable at the largest accessibility font size.
15. No touch target is smaller than 44 × 44 dp.

A noticeable difference is corrected by adjusting spacing, scale and proportion — **not** by
adding UI.

---

## 14. Current state — verified gap analysis

All references are to `mvp` at the time of writing.

| # | Gap | Evidence |
|---|---|---|
| 1 | **Titles sit below thumbnails**, the explicit §12 prohibition | `components/stories/story-selection-screen.tsx:329,380` render `styles.cardTitleContainer` as a sibling *after* the card; `:1492-1500` sets `paddingTop: 6` and a 12 pt title |
| 2 | **Cards are landscape, not portrait** | `components/stories/story-selection-screen.tsx:179-180` — `CARD_WIDTH = 176`, `CARD_HEIGHT = 132` (ratio 1.33, spec wants 0.68); `:188` grid cards are `width * 0.75` |
| 3 | **No featured story card exists** | no featured/hero concept anywhere in `components/stories/story-selection-screen.tsx` (1684 lines) |
| 4 | **Conventional header instead of floating controls** | `components/stories/story-selection-screen.tsx:1166` renders shared `PageHeader`; `components/ui/page-header.tsx` is an app-bar-shaped component |
| 5 | **No bottom navigation** | no tab bar component in the repo; `app/` contains only `_layout.tsx` and `index.tsx`. Already logged as the biggest work item in `../PHASE-7-UI-OVERHAUL.md` open decision 1 |
| 6 | **No design tokens** | `constants/theme.ts` exports only Expo-template `Colors` plus `Fonts`; the catalogue screen carries seven hardcoded hex values and radii of 16/18/20 |
| 7 | **No planet artwork layer** | assets exist (`assets/images/ui-elements/home-earth-night.webp`) but the catalogue screen does not render one |
| 8 | **Screen is monolithic** | `story-selection-screen.tsx` is 1684 lines and `catalog-story-card.tsx` 624; the component split in §5 is a decomposition, not a greenfield build |

---

## 15. Delivery phases

Each phase is independently shippable and independently testable.

| Phase | Contents | Depends on |
|---|---|---|
| **A — Tokens** | `constants/child-ui-theme.ts`, `constants/child-ui-motion.ts`; migrate the catalogue screen's hardcoded values onto them. No visual change intended | — |
| **B — Environment** | `CelestialBackground`, `PlanetHeaderArtwork`, `CircleActionButton`, `PageTitle`; retire `PageHeader` from this screen | A |
| **C — Cards** | `StoryCoverCard` (portrait, title-on-cover), `StoryPlayButton`, `FeaturedStoryCard`, the `CatalogueStory` mapper | A |
| **D — Filters** | `StoryFilterBar` / `StoryFilterPill` on the new pill spec, single-line guarantee | A |
| **E — Navigation** | `ChildBottomNavigation`; **blocked** on PHASE-7 open decision 1 | PHASE-7 §1 |
| **F — Motion** | §8 microinteractions and the §9 opening transition, extending the existing transition context | B, C |
| **G — Cleanup** | delete styles and components orphaned by B–F; fold the night palette consolidation into PHASE-7d | B–F |

Phases A–D and F deliver the screen. Phase E is the only externally blocked item, and the
screen ships with the existing navigation until it unblocks.

---

## 16. Testing requirements

Per [`AGENTS.md`](AGENTS.md) §2 the failing test comes first. For this work that means:

- One test file per new component under `__tests__/components/child-ui/` and
  `__tests__/components/stories/catalogue/`.
- Assert **behaviour and contract**, not pixel values: that `StoryCoverCard` renders its title
  above its play button in tree order, that `StoryFilterBar` renders one row for any tag count,
  that `CircleActionButton` exposes an accessibility label, that the nav marks exactly one item
  selected.
- No whole-screen snapshots.
- Use `it.each` for the phone/tablet branches via the `useAccessibility()` mock.
- Assert translation **keys**, not English copy; add the new keys across all 14 locales in the
  same change.
- `npm run type-check` and `npm run lint` clean before each phase is called done.

---

## 17. Open decisions

These block parts of the build and need sign-off.

1. **Two night palettes.** Onboarding, login and splash use a near-black navy
   (`NIGHT_BASE = '#0A0F2C'` in `components/onboarding/onboarding-theme.ts`). This design uses
   royal blue (`#092E8E`). Both are defensible; having both in one app is not. Decide whether
   the catalogue pulls the whole app toward royal blue, or the catalogue darkens toward the
   existing navy. **This decision precedes phase A**, because the tokens encode the answer.
2. **Typography** — unresolved from PHASE-7 open decision 3. Bundled brand face
   (Fredoka/Nunito, matching the website) versus `Fonts.primary` (SF Pro Rounded). Affects
   every size in §4.
3. **Bottom navigation** — PHASE-7 open decision 1. Adopting the four-tab bar means migrating
   the view-switching in `app/_layout.tsx`. Phase E is blocked until this lands.
4. **Featured story selection.** What makes a story "featured"? Editorial flag on the catalogue
   entry, most-recently-added, or resume-in-progress. Affects the backend catalogue schema, so
   decide before phase C freezes the mapper.
5. **Cover artwork backlog.** §6.10 requires reserved negative space in every cover. Existing
   covers were not commissioned to that rule; decide whether to re-generate the catalogue or
   accept a legibility scrim on legacy covers.
