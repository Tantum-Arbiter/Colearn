# Instrument Picker Redesign + Scene Backgrounds — Implementation Plan

Status: **rebased onto `origin/mvp`, one commit, not pushed** · Branch: `claude/ux-proposal-ui-adc37d` · Date: 2026-09-08

> **Sections 1-9 were written against `origin/main`, which turned out to be 251 commits
> behind `origin/mvp`. Read section 10 first — it records what survived the port and
> what did not.** Anything in sections 1-9 about teal gradients, placeholder instrument
> discs, or `assets/music/instruments/artwork/` describes the stale base, not the code.

Source of truth for the visual target: the landscape phone mock supplied in chat
(1816×904). Recovered attachments (originals, full resolution + alpha) are staged at:

```
/private/tmp/claude-501/-Users-cole-Workspace-Colearn--claude-worktrees-ux-proposal-ui-adc37d/8316b4d5-625d-455c-a4c1-9bb1dcf99a1d/scratchpad/attachments/
  img_01..06.webp   1254×1254 RGBA   instrument medallion discs
  img_07..11.webp   1086×1448 RGB    night-scene backgrounds
  img_12.webp       1816×904  RGB    the UX mock
```

---

## 1. What exists today (verified)

| Concern | File | Notes |
|---|---|---|
| Full-screen picker | `components/stories/instrument-picker-overlay.tsx` (672 lines) | 3D coverflow, pulsing white ring, `BlurView` 40 + `rgba(0,0,0,0.85)` backdrop, plain text title/subtitle, translucent-white confirm pill. **No panel.** |
| Inline picker | `components/music/instrument-carousel.tsx` (275 lines) | Same carousel maths, smaller radius, used by practise screen. |
| Instrument data | `services/music-asset-registry.ts` | `InstrumentDefinition { id, family, displayName, description, image, notes, noteLayout, noteCount }`. 6 instruments: flute, recorder, ocarina, trumpet, clarinet, saxophone. |
| Instrument art | `assets/music/instruments/*.png` | 6 files, 280×280 RGBA, transparent — **no disc behind them**. |
| Picker call sites | `story-book-reader.tsx:3485`, `freeplay-screen.tsx:468` | Reader passes `isRotated`; freeplay passes `hideBackdrop` + `hideArrows`. |
| Music screen backdrop | `freeplay-screen.tsx:328`, `practise-screen.tsx:410`, `learning/story-variation-picker.tsx:118` | `renderStoriesBackground()` — teal→blue→navy `LinearGradient` + `BearTopImage` + animated star field. **Duplicated three times.** |
| Copy | `locales/en/index.ts:1222-1224` | `music.chooseInstrument` / `swipeToExplore` / `useThisInstrument` already exist in all 14 locales. |
| Tests | `__tests__/components/instrument-picker-overlay.test.tsx` | Mocks the registry with 3 instruments and `image: 0`; asserts on **translation keys**, not English. |
| Sizing | `hooks/use-accessibility.ts` | `isTablet = min(w,h) >= 768`; `scaledFontSize` / `scaledButtonSize` / `scaledPadding`. |
| Fonts | `constants/theme.ts` | `Fonts.rounded` = iOS `ui-rounded`. **No custom fonts loaded anywhere in the app.** |

### Mock vs. current — the actual delta

1. **A card/panel** wrapping title → carousel → dots → CTA. Does not exist.
2. **Medallion discs** behind each instrument. Does not exist (instruments float on the backdrop).
3. **Gold glow ring** on the centred item, replacing the white pulsing ring.
4. **Gold gradient CTA** with a warm outer glow, replacing the translucent-white pill.
5. **Page dots**. Do not exist.
6. **Star + dot flourishes** either side of the title.
7. Back button and ◀ ▶ arrows sit **outside** the panel, at the screen edges, as
   periwinkle glass circles (currently `rgba(255,255,255,0.12)` and inside the row).
8. **Blurred scene backdrop** rather than a flat 85 % black wash.

Out of scope by explicit instruction: the **Touch / Blow** chips in the mock.

---

## 2. Decisions taken (confirmed with operator, 2026-09-08)

| Question | Decision |
|---|---|
| Where do the 5 scenes apply? | Behind the instrument picker **and** across all music screens (freeplay, practise, sleep selection). |
| Portrait art in tablet landscape | Centre-crop with `cover` (accepting the top/bottom loss); no landscape renders this pass. |
| Typography | Keep the system rounded face (`Fonts.rounded`). Fredoka is deferred to a separate app-wide typography pass. |
| Page dots | One dot per instrument in the current (possibly filtered) set — not a fixed 3. |

**Consequence to accept explicitly:** in the story reader the picker currently blurs the
*live story page*. Putting a scene behind it replaces that. The plan exposes this as a prop
(`backdrop="scene" | "blur"`) so it is a one-line flip if it reads worse in situ.

---

## 3. Design tokens (sampled from the mock, not guessed)

Sampled with Pillow over the mock's text/fill regions (99.5th-percentile luminance for
glyph colour, median for fills):

```
Panel fill          #313A70 @ ~0.90 alpha   (rgb 49,58,112 median)
Panel border        rgba(255,255,255,0.12)
Panel radius        ~36 (scaled)

Title cream         #FFF8EB
Subtitle periwinkle #CCD3FB
Centre name         #FBF4DD
Side name           #AAB0FD
Description         #BFC5E7

CTA gradient        #FFEFAE → #FBC55F (top→bottom)
CTA label           #4A3410
CTA glow            rgba(251,197,95,0.45), radius ~18

Glass circle fill   rgba(30,45,110,0.55)
Glass circle border rgba(200,212,255,0.55)
Glass circle icon   #FFFFFF

Dot active          #FCE680   (gold — not white)
Dot inactive        #5D51A7
Gold ring           #FFE9A8 + warm outer glow
```

Layout proportions from the mock: panel ≈ 70 % of screen width, centred, with the arrow
gutters outside it; medallion diameter ≈ 0.30 × panel width for the centred item and
≈ 0.78 × that for the neighbours; CTA fills the panel width minus its horizontal padding.

---

## 4. Asset preparation (Phase 0)

### 4.1 Medallions — **normalisation is required**

The six discs are *not* consistently sized inside their 1254² frames. Measured opaque
diameter as a fraction of frame width:

```
img_01 0.825   img_02 0.872   img_03 0.917
img_04 0.896   img_05 0.897   img_06 0.907
```

Dropped into a fixed box as-is, the discs would visibly change size as you swipe (~11 %
swing). Phase 0 must re-crop/pad each so the opaque disc is an identical fraction (target
**0.90**) of the output frame, then export at **512×512 WebP with alpha** (rendered at
~150 pt on tablet ≈ 450 px @3×, so 512 is the right budget).

Output: `assets/music/instruments/medallions/{id}.webp`

Proposed medallion → instrument mapping (one table, trivial to re-map):

| Instrument | Source | Rationale |
|---|---|---|
| `flute` (Magic Flute) | img_05 — pale music notes, leaves | Matches the mock's left item |
| `recorder` (Woodland Recorder) | img_01 — leaves, flowers, gold beads | Matches the mock's centre item exactly |
| `ocarina` (Enchanted Ocarina) | img_04 — galaxy, crescent moons, iridescent | Matches the mock's right item |
| `trumpet` (Golden Trumpet) | img_03 — gold music notes, warm | Brass = gold |
| `clarinet` | img_02 — full moon, wisps | Calm, woody |
| `saxophone` | img_06 — forest and lake | Warm, mellow |

### 4.2 Scene backgrounds

Five 1086×1448 (3:4 portrait) renders → `assets/images/scene-backgrounds/scene-{1..5}.webp`.

**Resolution caveat, stated up front:** iPad Pro 11" portrait native is 1668×2388, so the
source is upscaled ~1.6× at full-bleed. This is invisible where the art sits behind a
`BlurView` (the picker, freeplay, practise) and *will* be visible on any screen that shows
it sharp. Recommendation: keep every scene usage blurred or scrimmed this pass; if a sharp
usage is wanted later, re-render at ≥1668×2388.

---

## 5. Implementation phases

Each phase is independently shippable and TDD per `AGENTS.md` §2 — failing test first.

### Phase 0 — assets + registry

- Normalise + export the six medallions (Pillow script, kept in `scripts/`).
- Export the five scenes.
- `services/music-asset-registry.ts`: add `medallion: number` to `InstrumentDefinition`
  and a `require()` per instrument.
- Test: registry returns a non-zero `medallion` for every id in
  `getAvailableInstrumentIds()`; extend the existing registry test if one exists,
  otherwise a new `__tests__/services/music-asset-registry.test.ts`.

### Phase 1 — `SceneBackground`

New `constants/scene-backgrounds.ts`:
- `SCENE_BACKGROUNDS: number[]` (the five `require()`s).
- `pickSceneBackground(previousIndex?: number): number` — uniform random, never repeating
  the immediately previous index. Pure, so it is testable with `Math.random` mocked.

New `components/ui/scene-background.tsx`:
- Props: `blurIntensity?: number` (default 40), `scrimOpacity?: number` (default 0.35),
  `focalBias?: number` (default 0.42 — biases the crop slightly above centre so the moon
  survives a landscape crop), `source?: number` (test/override).
- Picks a scene **once per mount** (lazy `useState` initialiser, not on every render) so it
  is stable across orientation changes and re-renders.
- `<Image source resizeMode="cover" style={StyleSheet.absoluteFill}>` + dark scrim +
  `<BlurView tint="dark">`, all `pointerEvents="none"`.
- The `focalBias` is applied as a `translateY` on an over-sized image layer rather than
  fighting `resizeMode`, so it behaves identically in portrait and landscape.

Tests: stable pick across re-renders; distinct pick across mounts with `Math.random`
stubbed; no-repeat guarantee; renders at full-bleed with `cover`.

### Phase 2 — extract the medallion item

New `components/stories/instrument-medallion.tsx` — medallion disc + instrument image +
gold ring + lock badge, driven by a `focus: 0..1` value (0 = far side, 1 = centred), so the
overlay and `instrument-carousel.tsx` stop duplicating item rendering.

- Ring: gold `#FFE9A8`, `shadowColor` warm, opacity/scale driven by the existing pulse
  shared values, visible only above `focus > 0.85` (preserves current behaviour).
- Side items: medallion + instrument at reduced opacity/saturation, **no** ring.
- The medallion sits behind the instrument art; instrument art keeps its existing
  `resizeMode="contain"` and is inset to ~68 % of the disc so it never touches the gold rim.

Tests: renders the medallion for a centred item; ring is absent for non-centred; lock badge
still renders and `onLockedPress` still fires.

### Phase 3 — the panel

Rework `components/stories/instrument-picker-overlay.tsx`:

- New `<View style={panel}>` between the backdrop and the content: fill, border, radius,
  drop shadow, `maxWidth: Math.min(viewport * 0.86, 720)`, centred.
- Header: title with the star/dot flourishes (an `Ionicons`/inline `Text` pair, no new
  asset), subtitle beneath.
- Carousel unchanged mathematically; only the item rendering swaps to Phase 2.
- Name/description move to the panel's fixed label slot (as in the mock) rather than
  travelling with the item.
- New `<PageDots>` row: one dot per instrument in the current set, active = `#FCE680`.
- CTA: `LinearGradient` pill (`expo-linear-gradient` already a dependency), gold glow via
  `shadowColor`/`elevation`, `#4A3410` label, sparkle glyphs either side.
- Back button + ◀ ▶ arrows move outside the panel, absolutely positioned against the
  safe-area insets, restyled as periwinkle glass circles.
- `backdrop?: 'scene' | 'blur' | 'none'` prop replaces the boolean `hideBackdrop`
  (keep `hideBackdrop` as a deprecated alias so `freeplay-screen.tsx` keeps compiling until
  Phase 4 updates it).

Tests: extend `__tests__/components/instrument-picker-overlay.test.tsx` — panel testID
present; one dot per mocked instrument; CTA still calls `onSelect` with the centred id;
locked instrument still routes to `onLockedPress`; all existing assertions stay green.

### Phase 4 — wire the music screens

- `freeplay-screen.tsx`, `practise-screen.tsx`, `learning/story-variation-picker.tsx`:
  replace the three copies of `renderStoriesBackground()` with `<SceneBackground />`.
  Keep `BearTopImage` only where it is part of the screen's identity — decide per screen
  with a screenshot, do not delete it blind.
- `sleep-selection-screen.tsx`: swap its `LinearGradient` container for `SceneBackground`
  (it has a `skipBackground` prop already — honour it).
- `story-book-reader.tsx:3485`: pass `backdrop="scene"`.

### Phase 5 — orientation, tablet, verification

- **Portrait phone** (`min(w,h) < 768`): panel is nearly full width; medallion diameter
  driven by `scaledButtonSize`; the carousel radius already derives from viewport width.
- **Landscape phone**: the mock's case. `compactLayout` (`viewportHeight < 430`) already
  exists — extend it to tighten the panel's vertical padding rather than only its margins.
- **Tablet, both orientations**: panel capped at 720 pt so it does not stretch; the reader
  is orientation-unlocked, so the `isRotated` −90° transform path must be re-verified with
  the panel inside it (this is the highest-risk layout path in the change).
- Verify on simulator per the working agreement: iPhone 16 Pro `45F5A2AC-06A7-49B4-8517-26EAC693FD27`
  and iPad Pro 11 `02A6EC3A-9AD7-4E80-B5C8-E56BE20E4C8C`, portrait **and** landscape,
  screenshots attached to the PR.

---

## 6. Risks and gotchas

| Risk | Mitigation |
|---|---|
| **`node_modules` is missing in this worktree** — `npx jest` exits 0 with nothing run, faking a green baseline | `cp -Rc ../../../grow-with-freya/node_modules node_modules` (APFS clone) before any test run; always check for the `Test Suites:` summary line |
| Medallion discs differ by 11 % in frame occupancy | Normalisation step in Phase 0 (§4.1) |
| Medallion art already carries a gold rim; adding a gold ring doubles it | Ring is a *glow* outside the asset's rim, not a second border; tune against a screenshot |
| Landscape tablet crop loses the moon and foreground | `focalBias` default 0.42 + accepted per §2; revisit with landscape renders if it reads badly |
| Scene art below iPad native resolution | Keep every usage blurred/scrimmed this pass (§4.2) |
| `isRotated` −90° path in the reader | Explicit verification step in Phase 5; the panel must be sized from the *rotated* viewport, not the raw window |
| Changing three copies of `renderStoriesBackground()` touches unrelated screens | Phase 4 is separate and separately reviewable; screenshot each screen before/after |
| 14 locales | No new copy is strictly needed — existing keys cover title/subtitle/CTA. Any new a11y label (e.g. dot position) must land in all 14 locale files in the same commit |
| `expo-blur` + a gradient + a shadowed panel on Android | Android ignores `shadow*`; use `elevation` alongside. Verify Android before shipping |

---

## 7. Sequencing summary

```
Phase 0  assets + registry medallion field        (no visual change)
Phase 1  SceneBackground + constants              (no call sites yet)
Phase 2  InstrumentMedallion extraction           (behaviour-preserving refactor)
Phase 3  the panel redesign                        ← the visible change
Phase 4  wire music screens to SceneBackground
Phase 5  orientation/tablet pass + simulator verification
```

Phases 0–2 are safe to land ahead of design sign-off; Phase 3 is where the mock is judged.

---

## 8. Build log (2026-09-08)

All six phases are implemented and verified on device. Full suite: 52 suites,
1055 passed, 9 skipped; `tsc --noEmit` clean; no new lint errors.

### Deviations from the plan, and why

| Planned | Built | Why |
|---|---|---|
| Instrument art composited on the medallion | Also had to **cut the glyph out of its disc** (`scripts/cut-out-instrument-artwork.py` → `assets/music/instruments/artwork/`) | The existing instrument PNGs are flat coloured discs (opaque fraction 0.728, identical across all six), so they hid the medallion entirely. The originals are untouched; painted artwork drops into `artwork/` with no code change. |
| Focus ring outside the disc (`1.14`) | Ring at `0.96`, just outside the artwork's own rim | At 1.14 it read as a detached grey circle rather than a glowing rim. |
| Per-item name + description | Name per item, **description in a panel slot** for the centred instrument only | With 6 items the coverflow projects items at 60° and 120° to the *same* x, so two labels stacked on each side. Names are now band-limited to the two immediate neighbours and clipped to the neighbour pitch. |
| `hideBackdrop` boolean | `backdrop: 'scene' \| 'blur' \| 'none'`, `hideBackdrop` kept as a deprecated alias | Three backdrop modes were needed once scenes landed. |
| Freeplay keeps `hideArrows` | Arrows shown in freeplay | The mock has them, and a 6-item carousel benefits. One prop to revert. |
| `story-variation-picker.tsx` | Left on the old gradient | It is a learning screen, not a music screen. |

Also changed: `music.chooseInstrument` in `locales/en/index.ts` is now sentence case
("Choose your instrument") to match the mock. Other locales keep their own casing.

`SceneBackground` computes its centre crop from `useWindowDimensions()` rather than
`resizeMode="cover"` so `focalBias` can pull the crop above centre, and takes an optional
`viewport` override for the reader's rotated frame. Practise picks its scene once at the
screen level and passes it to all three phase branches, so the scene cannot change when
the phase does.

### Verified on device

| Surface | Result |
|---|---|
| iPhone 16 Pro portrait — freeplay picker | Panel, medallions, gold rim glow, dots, gold CTA, arrows, back button, blurred scene |
| iPhone 16 Pro portrait — practise carousel | Medallions, no label collisions, arrows clear of the discs, song cards legible over the scrimmed scene |
| iPhone 16 Pro — story reader (`isRotated`) | Rotated panel correct; scene backdrop stays unrotated and full-bleed |
| iPad Pro 11 landscape | Panel capped at 720 pt, scene centre-cropped, no stretching |
| iPad Pro 11 portrait | Full-bleed scene, panel proportions hold |

### Not done

- **Painted instrument artwork.** The mock's instruments are painted cut-outs that do
  not exist in the repo; the machine cut-outs are an interim (§8 deviations).
- **Touch / Blow chips** — excluded by instruction.
- Landscape-specific scene renders — the centre crop was the agreed approach.

---

## 9. Final artwork (2026-09-08, second pass)

The six **finished medallions** arrived: night sky, gold rim and the painted instrument
in one image, one per instrument. That is simpler than the plan assumed and removes a
whole layer.

### What changed

- `scripts/prepare-instrument-medallions.py` now maps the finished medallions and gained
  an **alpha rebuild** step. Five sources carried alpha; the trumpet arrived flattened
  onto black, which would have rendered as a black square. Its transparency is recovered
  from brightness and then clipped by a reference medallion's alpha so the outer glow
  fades identically. All six normalise from 0.954-0.971 to a 0.898-0.900 disc at 512².
- `InstrumentDefinition.image` is **gone**. Nothing consumed it once the medallion carried
  the instrument, so the field, its six `require()`s, and the interim cut-out pipeline
  (`scripts/cut-out-instrument-artwork.py`, `assets/music/instruments/artwork/`) were
  removed. The interim files were moved to the session scratchpad rather than deleted.
- `InstrumentMedallion` draws the medallion alone. Its "missing asset" fallback now keys
  on `medallion === 0` rather than `image === 0`, preserving the graceful degradation the
  picker tests already covered.
- **The focus ring became a focus glow.** The finished artwork has its own thick gold rim,
  so a ring outside it read as a distracting double circle with a dark gap between. It is
  now a filled gold circle at 0.88 of the medallion, sitting *under* the artwork's 0.90
  rim, so only its shadow escapes as a halo. The pulse animation drives **opacity only** —
  scaling the fill up would push it past the rim as a hard gold edge. Both carousels lost
  their `pulseScale` shared value accordingly.

The original placeholder discs at `assets/music/instruments/*.png` are now unreferenced.
They were left in place (they predate this branch) but can be removed.

### Android caveat, still unverified

The glow is a `shadowColor`/`shadowRadius` effect. Android ignores those and honours only
`elevation`, which renders a neutral grey shadow — the centred medallion will read as
lifted rather than glowing. Same applies to the CTA's warm glow. Worth a dedicated pass.

---

## 10. Ported to `origin/mvp` (2026-09-08)

The worktree was branched from `origin/main`. `origin/mvp` — the live line — was **251
commits ahead**, so every screenshot in sections 1-9 shows an app that no longer exists.
The work is now a single commit rebased onto `origin/mvp`.

### What `mvp` already had

| Area | On mvp |
|---|---|
| Night-sky styling | `SKY_GRADIENT_WORLD` / `NIGHT_DEEP` in `constants/night-palette.ts`, `EarthHorizon` |
| Ambient animation | `useAmbientLoop(active, …)` pauses star spin and pulses when a screen is inactive |
| Tutorials | `OwlGuide` replaced `LearningTipsOverlay` |
| Instrument art | Real `{id}.webp` thumbnails **plus** `{id}-body.webp` / `{id}-bell.webp` and an `artwork` field driving the landscape playing surface |
| Home / catalogue | Dashboard with streaks and achievements; themed catalogue replacing the old menu |

Two earlier findings were **artefacts of the stale base**, not real:

- "The instrument PNGs are flat placeholder discs" — true on `main`, already fixed on `mvp`.
- "Three copies of a teal-gradient `renderStoriesBackground`" — `mvp` had already unified
  these on the night-sky palette.

### What was kept in the port

- The panel redesign, medallions, focus glow, page dots, gold CTA, edge-mounted back and
  arrow buttons.
- `SceneBackground` + `constants/scene-backgrounds.ts`, wired to the picker's
  `backdrop="scene"` (used by the story reader).
- `medallion` added to `InstrumentDefinition` **alongside** mvp's `image` and `artwork`,
  which are still in use — the earlier removal of `image` was reverted.
- `InstrumentCarousel` keeps mvp's `active` prop and `useAmbientLoop` wiring; only the
  pulse-scale loop was dropped, because the glow must not scale.
- Freeplay's picker moved from `hideBackdrop` + `hideArrows` to `backdrop="none"` with
  arrows visible.

### What was dropped, pending a decision

**Scene backgrounds on freeplay, practise and sleep selection.** That was agreed when the
alternative was a flat teal gradient. On `mvp` those screens run a deliberate night-sky
system, and overriding it with photographic scenes is a different call than the one taken.
`freeplay-screen.tsx`, `practise-screen.tsx` and `sleep-selection-screen.tsx` are therefore
**unchanged from `mvp`** apart from freeplay's picker props.

### Verified after the port

`npx tsc --noEmit` clean; **189 suites, 3372 tests passing** (on `main` the same suite was
52 / 1055). The picker was re-checked on iPhone 16 Pro through the story reader's rotated
landscape path against the new base.

---

## 11. Layout pass to the second mock (2026-09-08)

| Ask | Change |
|---|---|
| Curve the title and caption | New `components/ui/arc-text.tsx` -- an SVG text path, so kerning survives. Curvature is measured from the reference: sagitta ≈ 1.6 % of the line's length. |
| Panel slightly transparent | Fill alpha 0.90 → 0.72, so the blurred scene reads through it. |
| Smaller confirm button | Hugs its label (`alignSelf: 'center'`) instead of spanning the panel; 18 → 16 pt label, tighter padding. |
| Narrower panel | `PANEL_MAX_WIDTH` 620 → 540, width factor 0.74 → 0.68. |
| Larger icons, three of them | Medallion 30 → 34 % of panel width, caps 168/118 → 200/150; items beyond the two neighbours fade out entirely, and the scale ramp starts at the neighbour depth so they read at 0.78 rather than nearly full size. |

### Two traps worth remembering

- **`textAnchor` has to be on `TextPath`, not just `Text`.** With it only on the parent
  the line renders hard against the left of the box. It looked centred at first only
  because the initial radius was so large the path was effectively straight.
- **Curve relative to the text, not the container.** The path spans the full width but
  the line sits in the middle of it, so a container-relative sagitta puts short text on
  the flattest stretch of the arc and it comes out looking straight. `ArcText` derives
  the radius from an estimated line length instead, and sizes its box from the text's
  own rise so the arc does not pad the header with dead space.

### Geometry is now tested rather than eyeballed

`computePickerLayout()` was extracted as a pure function and is checked across seven
viewports and instrument counts from 2 to 8: a neighbouring medallion and its label must
both stay inside the panel. That immediately caught two real bugs -- side medallions
overflowing on a portrait phone and on iPad after the size increase, and a four-instrument
carousel landing exactly on the panel edge (and tipping over it in floating point), which
is why `EDGE_CLEARANCE` exists. `arc-text.test.tsx` covers the arc maths the same way.

---

## 12. Third mock pass (2026-09-08)

| Ask | Change |
|---|---|
| Gold sparkles on the confirm button | They were being drawn in the label's dark brown. Now cream-gold `#FFF6D5`, sampled from the mock. |
| Card shape with a curvature | New `components/ui/blob-panel.tsx`: an SVG path whose four edges bow outwards, replacing `borderRadius`. Sized from `onLayout` because the height comes from the content. |
| Less tall | Panel padding 20/18 → 14/14 (compact 10), carousel slack 34/46 → 28/38, tighter label and dot margins. |
| More transparent | Fill alpha 0.72 → 0.62. |
| Stars beside the title | They were pinned to the panel edges. `estimateArcTextWidth()` is now exported from `ArcText` so the picker can place them from the line's own width, with the two specks the mock has -- and the right-hand cluster mirrors (`row-reverse`) so the star always sits nearest the text. |

`blobPath()` is pure and tested: the outline closes, every control point stays inside
the canvas the component draws on (a point outside it is silently clipped on device),
and the corner radius is clamped to half the shorter side so the outline cannot fold
back on itself.

### Trade-off taken

The bowed path replaces the panel's `borderRadius`, and with it the React Native drop
shadow -- a `shadow*`/`elevation` on the container would be cast from its rectangular
bounds, not the blob. The panel now separates from the backdrop with a light 1 px stroke
and the blur behind it instead. If the shadow is wanted back it needs an SVG filter
rather than the view shadow.

---

## 13. Rotated-frame alignment (2026-09-08)

The picker's rotated presentation (`isRotated`) draws its content turned -90 degrees
inside a window that is **still portrait** -- confirmed by the framebuffer coming back
1206x2622 while the content reads as landscape. Three things were wrong in that frame.

**Safe-area insets were read in the wrong basis.** `useSafeAreaInsets()` describes the
portrait window, but inside the rotated content the notch lies along what that content
calls its *left* edge, not its top. The back button and the left arrow were positioned
from `insets.left` (0) and sat right against the Dynamic Island. `rotateInsets()` cycles
each edge one step so it takes the inset of the window edge it now lies against; it is
pure and tested, including that four rotations return the original.

**The back button sat in the frame's corner, not level with the title.** It is now
aligned to the title band using the panel's measured `y` (`BlobPanel` forwards its
`onLayout`), falling back to the corner until the panel has been measured.

**The title was rendering off-centre.** It carried `fontFamily={Fonts.rounded}` --
`ui-rounded`, a platform alias the SVG text layer cannot resolve. It measured the line
in the fallback face while drawing it in another, so `textAnchor="middle"` centred the
wrong width and pushed the title ~110 pt left of the panel. The subtitle, which passes
no `fontFamily`, was centred correctly all along -- that contrast is what identified it.
`ArcText` now documents the trap.

### Still open: the rotated mode is hard-coded to -90 degrees

`music-challenge-ui.tsx:266` animates the instrument to a fixed `-90`, and the picker
matches it. Nothing in the app reads which way the phone was actually turned, so a child
who turns it the other way sees the whole rotated mode upside down -- picker, instrument
and controls alike. That is a product decision across the music feature rather than
something to change inside the picker, and the simulator has no accelerometer to test it
with, so it is flagged rather than fixed.

---

## 14. Squat instruments and arc decorations (2026-09-08)

**The ocarina sat against the left edge and ran off screen.** `layoutInstrumentSurface`
sizes the artwork as `min(usableWidth, usableHeight * aspectRatio)` and the surface is
anchored left. A long tube like the flute (aspect 8.36) is width-limited, so it fills the
region and the anchor never shows. A squat instrument like the ocarina is *height*-limited
and comes out far narrower than the region, so it hugged the left with all the slack piled
on the right. The layout now returns a `left` that centres the artwork in the space left
of the reserved strip, accounting for a bell that grows rightwards. Five tests cover it,
including that a width-limited instrument still reports `left: 0` -- the existing
left-anchor behaviour is unchanged for every instrument that filled its region before.

The artwork still sits a little left of dead centre, by half of
`reserveRight = insets.right + ARTWORK_EDGE_MARGIN`. That strip is deliberate, so it is
left alone.

**The stars beside the title now ride the arc.** They were pinned at a fixed height while
the line curved away from them. `arcPointAt(distance, radius)` returns how far a
decoration at that distance from the middle drops, and the tilt of the curve under it;
the picker applies both, mirrored per side. Tested against the line's own sagitta, so a
decoration at half the line length lands exactly on the text's end.

---

## 15. Backdrop blur (2026-09-08)

Scene blur behind the picker eased from `blurIntensity` 35 to 26. The scrim stays at
0.42, so the panel keeps its contrast while the forest and lantern glows behind it
read as a place rather than a wash.

---

## 16. Larger medallions (2026-09-08)

Caps raised to 224 / 172 compact (from 200 / 150) and the share of the panel to 0.38
(from 0.34). On a landscape phone the compact cap was the binding constraint, so the
medallion goes 150 -> 172 pt, about 15 % larger.

`RADIUS_RATIO` also drops 1.2 -> 1.12, drawing the neighbours in a little. That is what
lets the tablets grow: there the *panel* constraint binds, not the cap, and a tighter
radius means a larger medallion still fits inside the card. Measured clearance between
the centred medallion and its neighbours is 8-15 pt across every viewport, and the
containment tests still pass unchanged.

Carousel slack drops 28 -> 22 (compact) to pay for the extra height, keeping the panel
inside a 402 pt landscape phone.

---

## 17. Screen-time orb and daily-limit tips (2026-09-08)

Two changes outside the picker, reported while reviewing it.

**The orb's backplate is dropped once the limit is spent.** The dark disc
(`rgba(6,10,28,0.62)`) exists so a thin white dial does not vanish against the globe's
lime and blue -- the component's own comment says so. It was also being drawn behind the
spent state, which is a solid red circle with its own halo and needs no backing.

Worth recording for whoever picks this up: the murk in the reported screenshot was **not**
the backplate. Sampling the pixels, the ocean reads `(58,214,252)` and the disc
`(114,175,196)`; the backplate would composite to `(26,88,113)`, while the halo
`rgba(228,72,63,0.30)` composites to `(109,171,195)` -- the match. A 30 % red over
saturated cyan desaturates to grey-blue, and the halo is a flat `View` with a hard
circular edge, so it reads as a disc rather than a glow. Making it glow means a radial
falloff, but `exceededHalo` is deliberately shared with the glance's orb, which
interpolates it as a colour and must match the ring frame-for-frame at the handover. Left
for a decision rather than changed unilaterally.

**The daily-limit owl deals two tips, not ten.** `dealTips()` hands out `TIPS_PER_VISIT`
ideas the parent has not heard yet, carrying the heard list forward so a tip only comes
round again once the deck has been through, and holding back the hand just told so nothing
repeats across the seam. Eleven bubbles to page through at the end of a screen-time day
was a wall rather than help. Pure and tested, including that a hand never contains a
duplicate and that a pool smaller than a hand still works.
