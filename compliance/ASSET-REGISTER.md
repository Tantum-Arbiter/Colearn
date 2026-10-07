---
title: "Asset and licence register — Early Roots app"
type: register
status: started — the two island pictures (§5 tablets, §5a phones) are the only rows for something in the build; the plan's lock art (§6) is no longer drawn; the Otter Raft rows are for a game undone 2026-09-30
covers: PHASE-4-PROD-READINESS.md §9.9 B (asset and licence register; generated art has a licence trail)
updated: 2026-10-03
---

# Asset and licence register

One row for every image, sound, voice, font and piece of music in the build: where it came
from, who made it, under what licence, and proof. **Nothing ships that has no row.** This is
a record for the operator and a qualified adviser to complete; it is not legal advice.
Anything that could not be checked from the repository or the story factory's output is
marked **⚠️ UNVERIFIED**.

## 1. What is registered, and what is not

| Part of the app | State |
|---|---|
| Otter Raft game art and sound | Registered below, §2–§4, on 2026-09-29. **The game was undone on 2026-09-30** and its files are gone; the rows stand as the shape a row should take, and §2.1 and §2.3 still describe the sources and licence questions of the book *Hold On, Juni*, which is in the app |
| The island picture behind the Your Learning Journey screen | Registered below, §5 — origin and licence ⚠️ UNVERIFIED |
| The island picture shown on phones (a second painting of the same island, for a tall screen) | Registered below, §5a — origin and licence ⚠️ UNVERIFIED |
| The island illustration on the home screen's Your Learning Journey card (cut from the operator's mock of the card) | Registered below, §5b — origin and licence ⚠️ UNVERIFIED |
| The planet at the edge of every page, and the ring of cloud between pages while they slide (cut from the operator's painting of a planet in cloud) | Registered below, §5c — origin and licence ⚠️ UNVERIFIED |
| The three stat orbs on the home screen: the streak, Continue reading and the badges unlocked (cut from the operator's picture of them) | Registered below, §5d — origin and licence ⚠️ UNVERIFIED |
| The road map shown once the week on the island is done: a bear before a glowing portal, with three dated panels (one painting for phones and upright tablets, one 4:3 for tablets on their side) | Registered below, §5e — origin and licence ⚠️ UNVERIFIED |
| The lock on the island's learning-plan checkpoints | Registered below, §6 — the supplied picture is not drawn since 2026-10-03 (a padlock drawn in code replaced it); the file remains, origin ⚠️ UNVERIFIED |
| Everything else — avatars, feelings animals, story illustrations, instrument art, music, fonts, voices | **Not registered.** Origin is not recorded anywhere in the repository — ⚠️ UNVERIFIED |

## 2. Otter Raft — pictures

Nothing was drawn or generated for the game. Every picture is cut from artwork already made
for the book *Hold On, Juni* by the operator's story factory
(`~/Workspace/ai-tools/gpt-image-generator-browser`), by
`grow-with-freya/scripts/prepare-otter-raft-art.py`. The script is deterministic: run again
on the same sources it writes the same files.

### 2.1 Sources

Each source has a provenance record beside it in the story factory's output
(`output/hold-on-juni/provenance/<record>.json`) holding the prompt, the reference images,
the stage and a SHA-256 of the result. The hashes below were taken from the files on
2026-09-29 and **match their records**.

| Source (under `output/hold-on-juni/`) | Made | Provenance record | SHA-256 |
|---|---|---|---|
| `characters/papa/sheet.webp` | 2026-09-15 | `363bc9574c2a46c68e31c5be09839b33` | `55531c687c0610a84f9d674613f14599ef75a0538e847ff7a27aa16cc3ba7927` |
| `characters/juni/sheet.webp` | 2026-09-15 | `4c33e17f604442bb94069e12c28f32b0` | `248a00dfa587387c18c5180876bf6d5cdcbd1aa1a8de48dabe8c1cb15126b159` |
| `characters/bean/sheet.webp` | 2026-09-15 | `ff0f1a0cf3ed4eeaa842f7ede84d16c7` | `99ff183d402338364d251b352ed90d9f32e6ce0a6e5f88cc26476e91497f44fe` |
| `locations/the-open-bay/sheet.webp` | 2026-09-15 | `61af5cd0969f42a9bcd0f26df715c4fd` | `5088b337a8992ab7f621af881a44f7582e6de18a43d3ec8867150f9e8c7ce2ce` |
| `pages/page-10/final.webp` | 2026-09-16 | `f772552f3c1c401eb059ae8200e91caa` | `db4483a3f0fea1272667ca89f2191b25c3f9842a60be9f85f4345375da3ce48f` |

"Made" is the file's modification date; the provenance records carry no date of their own.

### 2.2 What ships

| File (under `grow-with-freya/assets/games/otter-raft/`) | Cut from | What a person or the script changed |
|---|---|---|
| `papa-calm`, `papa-happy`, `papa-surprised`, `papa-asleep` `.webp` | Papa's sheet, the row of faces | Lifted off the cream paper; rim colour taken from the fur beside it; foot faded to sit in water; scaled to 480 px |
| `juni-calm`, `juni-happy`, `juni-surprised`, `juni-asleep` `.webp` | Juni's sheet, the row of faces | As above |
| `bean-calm`, `bean-happy`, `bean-surprised`, `bean-asleep` `.webp` | Bean's sheet, the row of faces | As above |
| `gift-shell.webp`, `gift-stone.webp` | The open bay's sheet, the props | Taken as the solid shape, without its painted shadow; scaled to 300 px |
| `gift-kelp.webp` | The open bay's sheet, the props | **Only the first curl of the ribbon**, rounded off where it turns over, so it can be seen at the size of the others |
| `bay-night.webp` | Page 10, the right-hand third, where there are no otters | Carried on to the right by its own mirror image so a tablet has enough of it |
| `together.webp` | Page 10, whole | Nothing |

### 2.3 Licence

| Question | Answer |
|---|---|
| Who made it | The operator, with an image model, through the story factory |
| Which model, and which account | ⚠️ UNVERIFIED — the provenance records name no model. The tool's name says it drives an image generator in a browser; the operator to confirm the service, the plan and the account |
| Terms for commercial use | ⚠️ UNVERIFIED — to be read from the service's terms **as they stood on the dates above**, and a copy kept |
| Who owns the result | ⚠️ UNVERIFIED — depends on those terms. Separately, whether a picture made by a model attracts copyright at all is unsettled in the UK; for the adviser |
| Checked by eye against well-known characters | **Not yet done by a person.** The otters are drawn as ordinary sea otters; this needs the operator's eye before go-live |
| Prompts kept | Yes, in each provenance record |

## 3. Otter Raft — sound

| What | Where from | Licence |
|---|---|---|
| A soft chime when an otter joins or is given something: five notes of the ocarina, at 35% volume | The app's own instrument samples, through `getInstrument('ocarina')` in `grow-with-freya/services/music-asset-registry.ts`. No new audio file was added | ⚠️ UNVERIFIED — the origin of the instrument samples is not recorded in the repository |
| Voice | None. The captions are for the grown-up to read aloud | — |

## 4. Otter Raft — words and name

| What | State |
|---|---|
| Captions, in fourteen languages | Written for the game. English by hand; thirteen are machine-assisted translations and want a native speaker's check |
| The closing line, "Hold on," said Juni… | From the book *Hold On, Juni*, the operator's own |
| The name "Otter Raft" | **Not cleared.** No search of the UKIPO or USPTO registers or the app stores has been made (go-live gate, §9.9 B) |

## 5. The island (Your Learning Journey screen)

| File (under `grow-with-freya/assets/images/island/`) | Where from | What was changed |
|---|---|---|
| `island.webp` (1122×1402, SHA-256 `26310d7750f6bf923f57abe781b67e92eb4e6657c76c1e8288713f76b75658ef`) | Supplied by the operator, pasted into the working session on 2026-10-02 | Nothing; stored byte for byte |
| `island-base.webp`, `island-land.webp`, `island-cloud-*.webp`, `island-billow-*.webp`, `island-tree-*.webp` (34 files) | Cut from `island.webp` by `grow-with-freya/scripts/prepare-island-art.py`, so that each can move (2026-10-02) | `island-base` is the painting with the moving clouds, the gulls and the swaying trees painted out by blurring in what lies round them. `island-land` is the band round the horizon (rows 226 to 492) with sky, cloud and water cut out, so the sun and the horizon cloud can be drawn behind it. The horizon cloud is filled out with four copies of the painting's own cloud bank, set behind the painted cloud. Nothing from outside the painting is added |
| `island-water-1…3.webp` | Drawn by the same script: pale wave strokes, not taken from any picture | Made for the app |
| `island-fall-*-streaks.webp`, `island-spray.webp`, `island-lit-windows.webp`, `island-lit-village-1…2.webp`, `island-lamp-glow.webp`, `island-lamp-beam.webp`, `island-lamp-pulse.webp`, `island-ring.webp`, `island-stars-1…3.webp` | Drawn by the same script: streaks, soft glows, beams, rings and stars, not taken from any picture | Made for the app |
| `island-fall-*-cover.webp`, `island-pool-*-cover.webp` | Cut from `island.webp` by the same script | The painting round each waterfall and each pool, with a hole the shape of the water |
| The gulls | Drawn in code (`components/island/island-gulls.tsx`); the painted gulls are painted out of `island-base` | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the picture arrived with no record of its origin. It has the look of a generated image; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person.** An isometric cartoon island of this kind resembles the art of several well-known games in general style; that is not an infringement in itself, but it wants the operator's eye before go-live |
| The sun and moon drawn on it | The app's own `home-sun` and `home-moon` art, already in the build; their origin is not recorded either — ⚠️ UNVERIFIED |

## 5a. The island on phones

Phones show a second painting of the same island, made for a tall screen; tablets keep §5's.

| File (under `grow-with-freya/assets/images/island-phone/`) | Where from | What was changed |
|---|---|---|
| `island.webp` (941×1672, SHA-256 `518408fce8ec20557f64c6ee26206178e79d2d25224fb561931d32879aafc29e`) | Supplied by the operator, pasted into the working session on 2026-10-03 | Nothing; stored byte for byte |
| `island-base.webp`, `island-land.webp`, `island-cloud-*.webp`, `island-tree-*.webp`, `island-fall-1-cover.webp`, `island-pool-1-cover.webp` | Cut from this `island.webp` by `grow-with-freya/scripts/prepare-island-art.py --art phone` (2026-10-03) | As in §5: the moving clouds, gulls and swaying trees painted out of `island-base` by blurring in what lies round them; `island-land` is the band round the horizon (rows 518 to 720) with sky, cloud and water cut out. The horizon cloud is filled out with four copies of the painting's own low cloud bank, set behind the painted cloud. One small cloud by the mountain peak is painted out and not drawn (operator, 2026-10-03). Nothing from outside the painting is added |
| `island-water-1…3.webp`, `island-fall-1-streaks.webp`, `island-spray.webp`, `island-lit-*.webp`, `island-lamp-*.webp`, `island-ring.webp`, `island-stars-1…3.webp` | Drawn by the same script | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — as §5. A second operator-supplied picture of the same island, with the look of a generated image |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person**, as §5 |

A third picture of the island (1024×1536) was offered the same day and not used: on current
iPhones it lost a third of its width, the lighthouse included, so it is not in the repository.

## 5b. The island on the home screen's Your Learning Journey card

| File (under `grow-with-freya/assets/images/home-journey/`) | Where from | What was changed |
|---|---|---|
| `journey-card-mock.webp` (746×610, SHA-256 `a11cf44e37bd483c78d3375f60d14ea46140744c4a2dc7cd08b6b075eedb26a2`) | Supplied by the operator, pasted into the working session on 2026-10-03: a mock of the home screen with the redrawn card | Nothing; stored byte for byte. Not required by the app, so not bundled |
| `journey-island.webp` (622×472) | Cut from the mock by `grow-with-freya/scripts/prepare-journey-art.py` (2026-10-03, narrowed 2026-10-04): the card's right-hand part from a little way into the island's forest, where its island illustration is | The mock's own lettering painted out of the cut (two small boxes of blue sky, blurred in from what lies round them), its left edge faded to nothing so it lies over the card's fill, enlarged twice and sharpened a little. Nothing from outside the mock is added |
| The step tokens, the gold button, the glows | Drawn in code (`components/home/achievement-card.tsx`), with Ionicons glyphs already in the build | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the mock arrived with no record of its origin. It has the look of a generated image, and its island is a third picture of the island in §5; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person**, as §5 |
| Quality | The illustration exists only inside a small mock (the card is 608 pixels wide in it), so it is shown about 1.8 times enlarged on a phone. If the operator has the illustration itself, it should replace the cut |

A second mock (434×306, same day) showed the card's step tokens and a compass, and a third
(688×302, 2026-10-04) the layout the card now has. Nothing of either is in the repository: the
tokens, compass, step line and button are drawn in code from them, and the operator chose to keep
the first mock's island over the third mock's.

## 5c. The planet at the edge of every page

| File (under `grow-with-freya/assets/images/home-planet/`) | Where from | What was changed |
|---|---|---|
| `planet-painting.webp` (941×1672, SHA-256 `3ff5cc8e92224e91404c74a99bb77f68cc5affd1d7456913ff937a02afad88ba`) | Supplied by the operator, pasted into the working session on 2026-10-03: a night sky with a band of galaxy, and a large planet rising out of cloud at its foot | Nothing; stored byte for byte. Not required by the app, so not bundled |
| `planet-horizon.webp` (1882×1324) | Cut from the painting by `grow-with-freya/scripts/prepare-planet-art.py` (2026-10-03): rows 1010 to the bottom | The sky taken out, leaving the planet, the clouds round it and the glow of its air; enlarged twice and sharpened a little. The app draws it the right way up at the foot of the home page and the splash, and upside down at the top of the pages below. Nothing from outside the painting is added |
| `planet-cloud-ring.webp` (2464×526) | Made by the same script from the painting's own two cloud banks (rows 1500 to the bottom) | The banks joined into one band (a mirrored copy of each set lower between them, the cut edges rounded into puffs, a thin wisp over the sea left out), given an underside from a turned copy, bent into the front and back of a ring seen almost edge on, and made 15% see-through. Drawn only while the pages slide, round the waist of the world the two planet halves make between them. Nothing from outside the painting is added |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the painting arrived with no record of its origin. It has the look of a generated image; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| Quality | The painting is 941 pixels wide, so on a phone it is shown about 1.3 times enlarged and on a tablet between 1.8 and 3 times (most on a large tablet on its side). A larger original would be sharper, most of all on tablets |

An earlier painting of the same planet (941×1672, SHA-256
`278dd1229709f1ffc4ab5ea9878acb23da38b49c074234be384e84214dc3f991`), supplied the same day, stood
at the foot of the home page for about an hour and was replaced by this one; it is not in the
repository. Its sky (stars and a band of galaxy) was cut as `galaxy-glow.webp` and laid over the
app's sky; the operator found it too much, the file was deleted, and nothing of either painting's
sky is in the app. A band of this painting's cloud, `planet-cloud-band.webp`, was laid along
the edge of the screen for a while the same day; the operator had it taken off and that file was
deleted. The same cloud, bent into `planet-cloud-ring.webp`, now shows only while the pages
slide.

`ui-elements/shared-earth.webp`, the older globe, is no longer drawn or preloaded: nothing
requires it. The file is still in the repository until the operator says whether to delete it.
Its cloud banks, `night-cloud-left.webp` and `night-cloud-right.webp`, are still used by the
sign-in sky, the owl and the badge art.

## 5d. The stat orbs on the home screen

| File (under `grow-with-freya/assets/images/home-stats/`) | Where from | What was changed |
|---|---|---|
| `stat-orbs-mock.webp` (868×302, SHA-256 `69d447947618cb4512ab77b14c1439ef74c4d3306908a3f72b3a4b0c4fecb6c5`) | Supplied by the operator, pasted into the working session on 2026-10-04 as a PNG: three glass orbs on a blue sky -- a flame, an open book and a trophy -- each with a number and words drawn into it, stars round it and clouds at its foot | Re-encoded as lossless WebP; every pixel is the same as the PNG's (checked when it was stored). Not required by the app, so not bundled |
| `orb-streak.webp` (468×468), `orb-continue.webp` (480×480), `orb-badges.webp` (471×471) | Cut from the mock by `grow-with-freya/scripts/prepare-stat-orbs.py` (2026-10-04): one orb each, centred in a square 1.3 times as wide as the orb | The mock's sky taken out (the glow at the rim, the clouds and the stars kept); the mock's own number and words painted out of the glass (replaced by the colours round them, smoothed inwards) so the app writes the live ones; from the middle orb its open book painted out the same way; enlarged by half. Nothing from outside the mock is added. `orb-reading.webp`, the middle orb with its book, was cut and then replaced the same day; it is not in the repository |
| `orb-continue-front.webp` (480×480) | Made from `orb-continue.webp` by the same script (`--front-only`, 2026-10-04) | The glass inside the rim cleared to transparent, keeping the rim, its glow, the sparkles outside it and the clouds and stars at its foot; drawn over a story's cover when the Continue reading orb opens into its pill. Nothing added |
| The numbers and words in the orbs, and the bookmark in the middle one | Written and drawn by the app (`components/home/stat-orbs.tsx`): the words in the system's rounded face, the bookmark as a vector shape in the trophy's colours | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the picture arrived with no record of its origin. It has the look of a generated image; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| Quality | An orb is about 240 pixels across in the mock and is shown about 97 points across on a phone (291 pixels at 3×), so it is enlarged about 1.2 times; more on a tablet (up to 132 points). The orbs themselves, at size and without the lettering, would be sharper and would not need the lettering painted out |

## 5e. The road map after the island

| File (under `grow-with-freya/assets/images/roadmap/`) | Where from | What was changed |
|---|---|---|
| `roadmap-phone.webp` (941×1672, SHA-256 `2ad04dbb8d79a7d0dcd35482cb37f98d42e05289fd7d3f73fd0df4900f8b0811`) | Supplied by the operator, pasted into the working session on 2026-10-05 as a WebP (SHA-256 `d433609cf64ccdc652541d2a7de6af61efc3e0911ca8ba8ea6d461f08778dfe7`): a bear with a backpack on a cliff before a glowing portal to a spring valley, and three hanging panels, "Q2 2027 Japan and New Zealand", "Q3 2027 France and Italy", "Q4 2027 Lapland" | The place names painted out of the three panels by biharmonic inpainting from the panel round them, inside three rectangles below each "Q… 2027" line (operator, 2026-10-05: keep the quarters, write the places in the app in each language). The quarters, icons, frames and flowers are untouched. Re-encoded as WebP, quality 90. Nothing from outside the painting is added |
| `roadmap-tablet.webp` (1448×1086, SHA-256 `53323eae0b9a153f12bf7e0e7f3f13d1a22fcc69b2757f73b4287ec257f52843`) | Supplied the same day (SHA-256 `29a95f1b20b70de238c069efe271587583531697054bb2c95783edd3564cb41d`): the same scene, 4:3 | The same, for its own three panels |
| The place names on the panels | Written by the app (`components/island/roadmap-scene.tsx`) in the system's serif face, from `roadmap.stops` in the 14 locales | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — both pictures arrived with no record of their origin. They have the look of generated images; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| The dates on the panels | Painted into the art. If the plan moves, the art has to be repainted or the quarters painted out and written by the app as the places are |

## 6. The lock on the learning-plan checkpoints

**No longer drawn, since 2026-10-03.** The checkpoints now wear the operator's later mock: a
white padlock with a navy keyhole, drawn in code in the middle of the disc
(`components/island/plan-checkpoint.tsx`, made for the app, no outside art). Nothing
requires `lock.webp`, so it is not bundled, and it was kept out of the commit: it sits in the
working copy until the operator decides whether to delete it. The rows below stand for the file
as it is.

| File (under `grow-with-freya/assets/images/plan/`) | Where from | What was changed |
|---|---|---|
| `lock.webp` (256×256) | Cut from a 1254×1254 picture of a glossy blue padlock the operator pasted into the working session on 2026-10-03 | The padlock's own bounding box (345,349)–(908,907) cut out, scaled to 256 px, saved as WebP with its transparency; nothing redrawn |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the picture arrived with no record of its origin. It has the look of a generated icon; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known icon sets | **Not yet done by a person.** A glossy blue padlock is a common shape; it wants the operator's eye before go-live |
| The dotted trail and the checkpoint discs | Drawn in code (`components/island/plan-trail.tsx`, `plan-checkpoint.tsx`) from the operator's style guide (a picture of a white dotted path over the island, not shipped). Made for the app |

