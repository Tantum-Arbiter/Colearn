---
title: "Asset and licence register — Early Roots app"
type: register
status: started — the two island pictures (§5 tablets, §5a phones) are the only rows for something in the build; the plan's lock art (§6) is no longer drawn; the Otter Raft rows are for a game undone 2026-09-30
covers: PHASE-4-PROD-READINESS.md §9.9 B (asset and licence register; generated art has a licence trail)
updated: 2026-11-12
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
| The story reader's buttons: exit, menu, sound, back, next and the finishing tick, as painted coins (the operator's pictures, 2026-11-11) | Registered below, §5f — origin and licence ⚠️ UNVERIFIED |
| The clouds behind every book's words, one with faces and one with instruments for music books (the operator's pictures, 2026-11-11) | Registered below, §5g — origin and licence ⚠️ UNVERIFIED |
| The Play button on a book's music pages (the operator's picture, 2026-11-11) | Registered below, §5h — origin and licence ⚠️ UNVERIFIED |
| The reader's menu: its painted panel, row icons and row arrow (the operator's pictures, 2026-11-11) | Registered below, §5i — origin and licence ⚠️ UNVERIFIED |
| The reader's Compare Languages and Change Language panels: the painted frame (the operator's picture, 2026-11-12) | Registered below, §5j — origin and licence ⚠️ UNVERIFIED |
| The Audio Settings panel, opened from every sound button: its painted frame and the three button icons (the operator's pictures, 2026-11-12) | Registered below, §5k — origin and licence ⚠️ UNVERIFIED |
| The nine pages a Little Fox Meets a Friend choice leads to (pages 4, 8 and 11, rendered by ai-tools 2026-11-12) | Registered below, §5l — rendered by the operator's ai-tools story factory through ChatGPT; terms ⚠️ UNVERIFIED. The rest of the book's art (pages, covers, choice cards) is not yet registered |
| The two pages a choice in The Lantern Bridge leads to (page 10, page 11 until 2026-11-14, rendered by ai-tools 2026-11-12) | Registered below, §5m — rendered by the operator's ai-tools story factory through ChatGPT; terms ⚠️ UNVERIFIED. The rest of the book's art (pages, covers, choice cards) is not yet registered |
| The Lantern Bridge's pages 6 to 11, drawn again on 2026-11-12 so that only page 5 happens on the bridge, and page 11 to fix Toby's paws | Registered below, §5n — rendered by the operator's ai-tools story factory through ChatGPT; terms ⚠️ UNVERIFIED. The book's other pages and covers are not yet registered |
| The Lantern Bridge without its old tin page, and pages 3, 4 and 6 to 9 drawn again (2026-11-14) | Registered below, §5o — rendered by the operator's ai-tools story factory through ChatGPT; terms ⚠️ UNVERIFIED |
| The Lantern Bridge told again from page 6: a bag of lanterns on the last post, pages 7 to 14 and page 10's choice pages drawn (2026-11-16) | Registered below, §5p — rendered by the operator's ai-tools story factory through ChatGPT; terms ⚠️ UNVERIFIED |
| The lock on the island's learning-plan checkpoints | Registered below, §6 — the supplied picture is not drawn since 2026-10-03 (a padlock drawn in code replaced it); the file remains, origin ⚠️ UNVERIFIED |
| Everything else — avatars, story illustrations, instrument art, music, fonts, voices (the feelings game's art and the spelling game's art left with those games on 2026-10-16; the nine bear and animal faces the badges draw stay in `assets/images/emotions/`) | **Not registered.** Origin is not recorded anywhere in the repository — ⚠️ UNVERIFIED |

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

## 5f. The story reader's coins

| File (under `grow-with-freya/assets/images/reader-coins/`) | Where from | What was changed |
|---|---|---|
| `source/menu.webp`, `source/sound.png`, `source/next.webp`, `source/back.webp` (each 1254×1254, with a clear ground; SHA-256 `3866e80cc48c8f30c0f4c3578bf385d8447f4e1bf8b370ef1b639b0a9c037f74`, `60c41dccdd6bf6044cc3fbfc7ec0bc587d7881fa20bc7fe687565e9457532f23`, `1aa6d19bb225a1ff1484921085d64d45d3e9f561485161dc612da6c2e7c46e9c`, `267e1d555890ef5ee243e8f9d561b1d6c7ccaaf956f31054508baa0d6758110d`) | Supplied by the operator, pasted into the working session on 2026-11-11: four cream coins with gold rims, three brown bars, a brown speaker, a purple > and a purple < | Stored as sent. Not required by the app, so not bundled |
| `coin-menu.webp`, `coin-sound.webp`, `coin-next.webp`, `coin-back.webp` (300×300) | Cut from the four sources by `grow-with-freya/scripts/prepare-reader-coins.py` | Each squared on its disc with a quarter of the disc's width round it for the painted shadow, and made smaller. Nothing else changed |
| `coin-done.webp`, `coin-exit.webp` (300×300) | Made by the same script from `source/next.webp` | The purple > painted out of the face (filled from the face round it, with paper grain taken from a clean patch of the same face), then a tick in the >'s purple, or an arrow in the bars' brown, drawn on. The arrow follows a 74×68 picture of an exit coin the operator pasted the same day, too small to ship; it is not stored |
| The page pill beside the exit coin (book, page and length) and the slash across the muted sound coin | Drawn by the app (`components/stories/page-pill.tsx`, `components/child-ui/reader-coin.tsx`) after a 133×56 picture of the pill the operator pasted the same day, which is not stored | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the pictures arrived with no record of their origin. They have the look of generated images; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person.** Cream-and-gold round buttons with simple glyphs are a common game-interface look |
| Quality | A coin is drawn 50 points across on a phone (150 pixels at 3×) and up to about 75 on a tablet with large buttons (225 pixels); the 300-pixel files hold the disc at 240 pixels, so they are never enlarged |

## 5g. The story text clouds

| File (under `grow-with-freya/assets/images/story-cloud/`) | Where from | What was changed |
|---|---|---|
| `source/stories.webp` (2000×667, clear ground, SHA-256 `49c267c555a976f639a9de5dbbad2ccf41d74674f3ad326926a91e30ec044804`) | Supplied by the operator, pasted into the working session on 2026-11-11: a cream cloud with a gold rim, a small gold sun on top and a smiling face at each end | Stored as sent. Not required by the app, so not bundled |
| `source/music.webp` (2000×667, clear ground, SHA-256 `063852a503554c1068a40a2d1c998ca69f1a440d0553517225745fa6308e3e66`) | Supplied by the operator the same day: the same cloud with a flute and notes at the left end and a trumpet and notes at the right, for music books | Stored as sent. Not required by the app, so not bundled |
| `stories-*.webp` and `music-*.webp` (`left`, `stretch-left`, `crown`, `stretch-right`, `right`; each 667 tall) | Cut from the sources by `grow-with-freya/scripts/prepare-story-cloud.py`: at x = 430, 880, 1120 and 1570 for the stories cloud, and at 1550 instead of 1570 for the music cloud, so the trumpet lies wholly in its end | Cut into five upright strips and saved as WebP at quality 92. Nothing else changed; the app widens the two plain strips to fit the box (`components/stories/story-cloud.tsx`), so the ends and the sun keep their drawn shape |

| Question | Answer |
|---|---|
| Who made them, and with what | ⚠️ UNVERIFIED — the pictures arrived with no record of their origin. They have the look of generated images; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns them | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person.** A scalloped cloud panel is a common storybook frame |
| Quality | A cloud's body is 521 pixels tall; the phone's two-line box is about 78 points (234 pixels at 3×), a tablet's about 108 (324), so it is drawn smaller, never enlarged, except for the two plain strips, which are widened about two to three times on a phone |

## 5h. The Play button on music pages

| File (under `grow-with-freya/assets/images/play-pill/`) | Where from | What was changed |
|---|---|---|
| `source/play-pill.webp` (2000×667, clear ground, SHA-256 `4cb82a928d89800f2daa6cc6216e6a688a6d7c050dba99ace1ce43c56eec4556`) | Supplied by the operator, pasted into the working session on 2026-11-11: a cream pill with a gold rim, a flute and leaves at the left, a trumpet and leaves at the right, and three gold drops below its middle | Stored as sent. Not required by the app, so not bundled |
| `play-pill.webp` (1000×334) | Made from the source by `grow-with-freya/scripts/prepare-play-pill.py` | Halved in size and saved as WebP at quality 92. Nothing else changed |
| The purple play triangle and the word on the button | Drawn by the app (`components/stories/play-pill.tsx`) after a 75×82 picture of the triangle the operator pasted the same day, which is not stored; the word is `reader.play` in each language | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the picture arrived with no record of its origin; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| Quality | The pill's body is 206 pixels tall in the stored file and is drawn 50 points tall on a phone (150 pixels at 3×), about 58 on a tablet (173), so it is never enlarged |

## 5i. The reader's menu

| File (under `grow-with-freya/assets/images/reader-menu/`) | Where from | What was changed |
|---|---|---|
| `source/leaves.webp`, `source/mushrooms.webp` (each 1448×1086, clear ground; SHA-256 `f6bd0580efd48158a8fdf1a9dd043d79ee3263a88afb2ce991e5783deebd7811`, `c56790333a3979c0f4d6e6eec8aec96d0c520bcb3e020669f37e2fd36e327977`) | Supplied by the operator, pasted into the working session on 2026-11-11: a corner of gold band with a leafy sprig across it, and a corner of gold band with two red mushrooms and grass | Stored as sent. Not required by the app, so not bundled |
| `source/menu-mock.webp` (1116×1410, SHA-256 `1d7f8f073a04e61164cf93a87d660be8e1144d493dcbed1520bfbba0776bcc90`) | Supplied by the operator the same day: a mock-up of the reader with the menu open | Stored as sent; only a small patch of its plain panel face is used, as paper grain. Not bundled |
| `panel-top.webp` (920×174), `panel-middle.webp` (920×30), `panel-bottom.webp` (920×186) | Composed by `grow-with-freya/scripts/prepare-reader-menu.py` | The leaf corner (at 70%) is the panel's top-left and the mushroom corner (at 62%, so the two bands match) its bottom-left, both used as sent, cut where their bands run straight. The rest of the rim (the top, the right side, the rounded right corners, the bottom and the pointer, a short horn out of the top-right corner) is the band's own cross-section, read from the two pieces where they are cut and swept along the panel's outline, the left side easing into the mushroom corner's lean; the face is a plain cream with paper grain from the mock-up. Made smaller to 920 wide and cut into a top (pointer and leaves), a straight middle the app stretches to the rows' height, and a bottom (mushrooms). Nothing from outside the operator's pictures is added |
| `source/page-preview.webp`, `font-size.webp`, `language.webp`, `compare.webp`, `tips.webp`, `arrow.webp` (each 1254×1254, clear ground; SHA-256 `ac7dcce45eedd2de3017732c1fed67468b86a1a8b3dbf49c908bfd9b8597ec93`, `79de48276fbfef065ba8b35902e6afd16f46e3a5823844728de4db9ef82d7d4f`, `542590b960f9503e8bcf0fd7064fc6fa7dd82101fb98b85c9dfd29e7d54f298f`, `de76df520e27ff4847057a92aeabf151afb3b3cbb2d7a5b6bf46b41fa425574e`, `163301d72a56f8530ec5feadaf8ae3717be1d93f1226a192e1572738d733258b`, `af30f70db3393fc0ca00ee795a7a5d7dfda20667d36303b5cfb9dcfa12a14c0f`) | Supplied by the operator the same day: five icon tiles (an open book, "Aa", a globe, "A" and "文", a lightbulb) and a gold row arrow | Stored as sent. Not required by the app, so not bundled |
| `icon-*.webp` (192×192), `arrow.webp` (120×120) | Made from those by the same script | Squared on each picture's own tile and made smaller. Nothing else changed |
| The tiles for Auto-Play and Change Instrument | Drawn by the app (`components/stories/reader-menu.tsx`): a cream rounded square with a play triangle or musical notes in the icons' orange | Made for the app, until the operator sends pictures for them |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the pictures arrived with no record of their origin. They have the look of generated images; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| Quality | The panel is composed at 3700 pixels wide from the full-size corner pieces and stored at 920; it is drawn 276 points wide on a phone (828 pixels at 3×) and about 317 on a tablet with larger buttons (951), so it is enlarged slightly there; the icons are drawn 32 points (96 pixels) from 192 |

## 5j. The reader's language panels

| File (under `grow-with-freya/assets/images/reader-languages/`) | Where from | What was changed |
|---|---|---|
| `source/frame.webp` (1672×941, clear ground; SHA-256 `fdd277562f098522d6ef92e7775f2260e4b7bfa0ccc7cfaba618f6d8fd45d537`) | Supplied by the operator, pasted into the working session on 2026-11-12: the empty panel on its own (gold rim, leaf sprig, orange crest, mushrooms and grass, plain cream face), sent to replace the frame first cut from the mock-up below, whose cut edges showed | Stored as sent. Not required by the app, so not bundled |
| `source/compare-mock.webp` (1353×769, SHA-256 `d192c9ed11347dd4db98c32b6a892a1d3b3d89cb904aacd2d871914bf10abf50`) | Supplied by the operator the same day: a mock-up of the Compare Languages panel over a dimmed reader page | Stored as sent. No picture in the app comes from it any more; it is the drawing the layout and the buttons' colours were taken from. Not bundled |
| `panel-top.webp` (1544×319), `panel-middle.webp` (1544×352), `panel-bottom.webp` (1544×233) | `source/frame.webp`, sliced by `grow-with-freya/scripts/prepare-language-panel.py` | Trimmed to the panel and cut into a top, a middle the app stretches to the list, and a bottom, at the picture's own size and with its own soft edge. Two housekeeping changes only: a haze of all-but-clear pixels round the outside (8 parts in 255 or less) is made fully clear, and the panel's all-but-solid inside (245 or more) fully solid. Nothing is redrawn, recoloured or added |
| `panel-fade.webp` (1397×32), `panel-fade-top.webp` (1397×14) | Strips of the same panel's face, from the foot and the head of the list area, by the same script | Made see-through along a ramp, so the list fades under them |
| The heading, hint, switch, close coin, language buttons, ticks and Done | Drawn by the app (`components/stories/language-panel.tsx`) in colours sampled from the mock-up; the flags are the system's emoji, not the mock-up's painted flags (it shows nine languages, the app has fourteen) | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the pictures arrived with no record of their origin. They have the look of generated images; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| Quality | The panel is 1544 pixels wide as stored. It is drawn about 580 points wide on a phone on its side (1740 pixels at 3×) and up to 780 points on a tablet (1560 at 2×, more with larger text), so it is enlarged about 1.1× on a phone and hardly at all on a tablet |

## 5k. The reader's audio settings panel

| File (under `grow-with-freya/assets/images/reader-audio/`) | Where from | What was changed |
|---|---|---|
| `source/frame.webp` (1448×1086, on a dark forest photograph, no clear ground; SHA-256 `8e1768e84c457ac8dda16f586536b3912b9773644c6d63a16bcd9777f205074f`) | Supplied by the operator, pasted into the working session on 2026-11-12: the empty audio panel with nothing inside it (gold rim, leaf sprig, orange crest, mushrooms, faint embossed marks at the head and foot), sent to replace the first frame below | Stored as sent. Not bundled |
| `source/cards.webp` (1448×1086, on a dark photograph; SHA-256 `d464c3bc85fd17ff92f148e018b8a6e695c7eb4f7399acbb0bea62eabbe3f244`) | Supplied by the operator earlier the same day: the first audio panel, with three cards, an embossed round slot on each and faint marks inside them | Stored as sent. The operator asked for its cards, slots and marks to be kept on the new frame; nothing else of it is used. Not bundled |
| `source/icons.png` (104×336; SHA-256 `d3c7eac0d37b15f4b68e0abe4bf79ca7da0c59fc90a9ec1ad97b69f74a82d7c4`) | Supplied by the operator the same day: three round buttons with a purple speaker, note and microphone | Stored as sent. Not bundled |
| `source/mock.webp` (1471×1069; SHA-256 `c99d39ca625e443b4549c2770c7d19006b73966963ee238332c76b7fd6f56d96`) | Supplied by the operator the same day: a mock-up of the finished panel | Stored as sent. No picture in the app comes from it; the layout, the gold knob and the colours were taken from it. Not bundled |
| `panel.webp` (1387×1028) | `source/frame.webp`, with the three cards of `source/cards.webp`, put together by `grow-with-freya/scripts/prepare-audio-panel.py` | Both pictures are lifted off their photographs: the largest bright shape (brighter than 100 of 255) with its holes filled, a two-pixel soft edge graded on brightness, and the edge's colour taken from the panel just inside, so no dark fringe is left. Each card is cut from the first panel with its own rounded outline and a feathered edge, enlarged by the ratio of the two frames' widths, tinted from the first panel's cream to the new one's, and laid on the new frame exactly on its centre line, the three evenly spaced between the title and Done. Nothing is redrawn |
| `icon-master.webp`, `icon-music.webp`, `icon-voice.webp` (168, 156, 168 pixels square) | `source/icons.png`, one third each, by the same script | Only the purple ink is kept, its soft edge taken from how far each pixel sits between the button's cream and the ink, and its colour unmixed from the cream; enlarged three times with a light sharpen. The round buttons themselves are the frame's own slots |
| The heading, labels, levels, sliders and their gold knobs, the off stroke on a muted button, and Done | Drawn by the app (`components/ui/audio-settings-panel.tsx`, `components/ui/painted-slider.tsx`, and the shared pieces in `components/stories/language-panel.tsx`) | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the pictures arrived with no record of their origin. They have the look of generated images; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person** |
| Quality | The panel is drawn up to 780 points wide (about 1560 pixels at 2×), so it is enlarged up to 1.1×. The icons are the weak point: about 52 pixels of ink each in the operator's picture, drawn up to about 50 points (100–150 pixels), so they are enlarged two to three times and look soft up close; a larger export of the three icons would fix it |

## 5l. Little Fox Meets a Friend: the page each choice leads to

Nine whole pages, one for each choice on the book's three Choose games, shown in place of the page's
painting once the child has chosen, until the page is turned. Each is ai-tools' `final.webp` for that
option, copied byte for byte, under `grow-with-freya/assets/stories/little-fox-meets-a-friend/` (4.4 MB
in all).

| File | What it shows |
|---|---|
| `page-4/outcomes/finn-says-sorry.webp` (1448×1086, SHA-256 `00eabea9d5a91a1900c38fe1f86ca934afbf9a59c6efeaa72c2aac793b05b285`) | Finn bows his head and says sorry; Bramble’s nose peeps out |
| `page-4/outcomes/finn-talks-softly.webp` (1448×1086, SHA-256 `23888c198e4937d52c0ac1a2c7ad423e7283d4c0178fd171e6b2e0fcdd1a38dd`) | Finn crouches and whispers; Bramble’s nose peeps out |
| `page-4/outcomes/finn-stays-still.webp` (1448×1086, SHA-256 `ec3ace6953da7f5d854b1a62e1c98817b2b01d93e03a4158ad20d31a890bd57d`) | Finn stands calm and still; Bramble’s nose peeps out |
| `page-8/outcomes/finn-steps-back.webp` (1448×1086, SHA-256 `ad34f88657ba396fd163bd26593d4898223b9dc3546175871cf5140222d53c33`) | Finn has stepped off the track, leaving it clear |
| `page-8/outcomes/finn-waits-nearby.webp` (1448×1086, SHA-256 `9f61c16aef272c63bd880c58dd5489d6d11f7ed9680e18d4aa1db2617b6791b9`) | Finn sits beside the track playing with a daisy |
| `page-8/outcomes/finn-leaves-a-berry.webp` (1448×1086, SHA-256 `4dd35a07389aae1a05a9b76fc0cd0d9fe55b9eb9874ced75050cabed92ded364`) | Finn has left a pinecone on the track as a gift (the item id says berry; the card the child taps shows a pinecone, so the page does too) |
| `page-11/outcomes/say-hello.webp` (1448×1086, SHA-256 `261b77cbc9b9d521a2e9f6acccd71a0d5b8ca320896ae70c89dd87da16178302`) | Finn gives a small wave and a soft hello |
| `page-11/outcomes/ask-to-play.webp` (1448×1086, SHA-256 `f9fea11f76bc065b2fefb14f47ee1f69e152767bd661ceae3a7a5e25d0103986`) | Finn bends lower with open paws, asking softly |
| `page-11/outcomes/say-ill-wait.webp` (1448×1086, SHA-256 `d819ac67abb4bd27c0691f6c1b03d503ba58343e1f699b8abc0070de99264f37`) | Finn sits by the willow to wait, smiling |

| Question | Answer |
|---|---|
| Who made it, and with what | Rendered on 2026-11-12 by the operator's story factory (`~/Workspace/ai-tools/gpt-image-generator-browser`, stage `alternative_page_illustration`, provider `gpt`) driving ChatGPT's image generation in the operator's signed-in browser, from the scene written for each option in the book's brief (`stories/gwf-75/2-4/little-fox-meets-a-friend/book.json`, `choice.options[].scene`). Each was drawn from four references: Finn's and Bramble's character sheets, the location sheet and that page's own rendered master, all from the same book's render of 2026-11-09. Prompts, reference hashes and output hashes are in the factory's `output/little-fox-meets-a-friend/provenance/`. The first three page 11 renders carried page 8's dock leaf over and were drawn again; the rejected three are not shipped |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — as for the rest of the book: depends on the ChatGPT plan and account used, which the repository does not record |
| Checked by eye against well-known games and films | **Not yet done by a person.** The characters are the book's own Finn and Bramble |
| Quality | 1448×1086, the book's own page size, drawn the same way as its pages |

## 7. Wombat's Picnic Count (the first game pack)

Made 2026-10-17 by `grow-with-freya/scripts/prepare-pack-art.py --pack wombat-picnic`, entirely
from the book *Snuggle Little Wombat* the app already ships and from shapes drawn in code. Nothing
from outside the app is added. Everything ships under `grow-with-freya/assets/packs/wombat-picnic/`,
0.23 MB of art and sound in all.

| File | Where from | What was changed |
|---|---|---|
| `art/tablet/sky.webp` (1448×1086), `art/phone/sky.webp` (1086×1448) | The book's cover, `assets/stories/snuggle-little-wombat/cover/cover-large.webp` (2732×2048), whole for the tablet and its middle 1536 columns for the phone | The sleeping wombat and the title painted out, each row of the hill and of the sky given the colour the same row has beside the gap, then softened and given the paper's grain back; the stars lifted out (below); a soft shadow painted on the hill under the leaf and under the wombat; scaled and re-encoded as WebP, quality 82 |
| `art/*/stars-1.webp`, `stars-2.webp` | The cover's own stars, found as small bright spots in the sky and cut with their glow as their transparency | Shared out alternately between two sheets, so the app can make them twinkle in turn; nothing redrawn |
| `art/*/wombat.webp` | The wombat walking on page 4, `assets/stories/snuggle-little-wombat/page-4/background.webp`, cut from the grass by the colour of his fur, with the rim's colour borrowed inward so no green rides along the edge | Scaled up about 1.6× for the painting; nothing redrawn |
| `art/*/leaf.webp`, `leaf-glow.webp`, `berry.webp`, `nut.webp`, `petal.webp` | Drawn in code by the script (a pointed leaf with a midrib and veins and a shadow beneath; the same leaf in a warm halo; a round berry lit from the top left with a calyx; an acorn with a cap and stalk; a pink petal with a crease) | Made for the app |
| `cover.webp` (724×543) | The tablet layers composed at rest | The plan card's picture |
| `sounds/pop.m4a`, `bloop.m4a`, `hum.m4a`, `chime.m4a`, `tada.m4a` | Synthesised by the script (short sine sweeps, a hummed chord with vibrato, bell tones and a three-note bell phrase), mono AAC at 64 kb/s, none longer than 2.6 s | Made for the app |
| The words (the wombat's prompts, the aim, the grown-up's line, the bridge tips) | Written in the 14 locale files under `packs.wombatPicnic`, `experience` and `bridges.counting` | Made for the app |

| Question | Answer |
|---|---|
| Who made the book's pictures, and with what | As for the book itself: see the story's own entry; the cover and page 4 are the book's bundled art, used as they ship |
| Terms for commercial use, and who owns it | As for the book |
| Checked by eye against well-known games | **Not yet done by a person.** Berries counted onto a leaf is a common nursery mechanic; the drawn shapes are generic |
| Source hashes | `cover-large.webp` SHA-256 `2311c38d52395524b87320ab6a51da033582971f5a4ce293341d40982dd2bce4`; `page-4/background.webp` SHA-256 `544a086de47c7453f3d4f6140749e39c8c477f87a7d9dc4cb80be34caa768878`, as bundled on 2026-10-17 |

## 5m. The Lantern Bridge: the page each choice leads to

Two whole pages, one for each way Nori can welcome Toby in the book's Choose game on page 10 (page 11 until 2026-11-14, §5o), shown in
place of the page's painting once the child has chosen, until the page is turned. Each is ai-tools'
`final.webp` for that option, copied byte for byte, under
`grow-with-freya/assets/stories/the-lantern-bridge/` (1.0 MB in all). The book's two counting games,
pages 4 and 7, keep their painting (operator, 2026-11-12). Both pages were drawn again for the retold book on
2026-11-15 (§5p); these two are no longer shipped.

| File | What it shows |
|---|---|
| `page-10/outcomes/offer-a-paw.webp` (1448×1086, SHA-256 `32d5bb73bbb1ccd2a3f7bcd22d25d99090772ce4dcd231704a13393353fbbbd8`) | Toby has stepped in and holds Nori's paw; Nori still holds his one lantern low |
| `page-10/outcomes/share-the-lamp.webp` (1448×1086, SHA-256 `397d8e6380292340f2b703112326017b94d2944658bbdf7bccd5647a62bcd25d`) | Nori holds his one lantern up between them, and Toby stands close in its light |

| Question | Answer |
|---|---|
| Who made it, and with what | Rendered on 2026-11-12 by the operator's story factory (`~/Workspace/ai-tools/gpt-image-generator-browser`, stage `alternative_page_illustration`, provider `gpt`) driving ChatGPT's image generation in the operator's signed-in browser, from the scene written for each option in the book's brief (`stories/gwf-75/2-4/the-lantern-bridge/book.json`, `choice.options[].scene`). Each was drawn from the book's character sheets for Nori and Toby, its location sheet and page 11's own rendered master. Prompts, reference hashes and output hashes are in the factory's `output/the-lantern-bridge/provenance/`. Both were drawn again later on 2026-11-12 from the redrawn page 11 (§5n), because the first pair copied its mistake in Toby's paws; the first pair is kept in the factory's `output/the-lantern-bridge-superseded-2026-11-12/pages/page-11-alternatives/` and is not shipped |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — as for the rest of the book: depends on the ChatGPT plan and account used, which the repository does not record |
| Checked by eye against well-known games and films | **Not yet done by a person.** The characters are the book's own Nori and Toby |
| Quality | 1448×1086, the book's own page size, drawn the same way as its pages |

## 5n. The Lantern Bridge: pages 6 to 11 drawn again

The operator found the bridge drawn differently from page to page and an arm growing from Toby's chest on page 11 (2026-11-12).
They chose to have only page 5 happen on the bridge: pages 6 to 10 were drawn again on the riverbank at its foot, with page 8's
three hooks on three lamp posts by the river, and the words of pages 6 and 10 changed to match. Page 11 was drawn again with
Toby's two forepaws at his shoulders. Each file is ai-tools' `final.webp` for that page, copied byte for byte, under
`grow-with-freya/assets/stories/the-lantern-bridge/` (3.8 MB in all, with §5m's two pages). The pictures they replace are kept in
the factory's `output/the-lantern-bridge-superseded-2026-11-12/`, with every try that was not chosen; none of those ship.
The table records these files as they shipped on 2026-11-12, under the page numbers of that day. On 2026-11-14 page 6 was
removed and the pages after it moved up by one, and several were drawn again; §5o lists what ships now.

| File | What it shows |
|---|---|
| `page-6/background.webp` (1448×1086, SHA-256 `60c15b97f2f7f328cabab005221c9dfd1b46d7436bb31082334d7ef37d38e006`) | Nori on the riverbank with his old tin, looking at the dark bridge beyond his two lanterns |
| `page-7/background.webp` (1448×1086, SHA-256 `159f2432910688a56c717bfa272f9bb5c50fe030264394986b018858496a3d8f`) | Nori on the riverbank, a paw at his nose, looking up at the dark arch |
| `page-8/background.webp` (1448×1086, SHA-256 `7f9c55146411d03b11f9f6ba7e44b7a506cfdf53bdc75ad72dc5787156829fcd`) | Nori pointing at three lamp posts by the river, each with one empty hook (the counting game's tap spots were measured again on this picture) |
| `page-9/background.webp` (1448×1086, SHA-256 `76d937949a22f1c08448947ada2cf08bb81c379698e6c51e0011c082500bb1bc`) | Nori on tiptoe at the last lamp post, holding the blue lantern just below its hook |
| `page-10/background.webp` (1448×1086, SHA-256 `5ff1686fcf253698903fa737d85a7eac17b37a95f365e606c17f3dc5f61c3f54`) | Nori on the path looking down at the broken, dark blue lantern in the mud by the stream; a few small pieces of glass lie beside it |
| `page-11/background.webp` (1448×1086, SHA-256 `5403f1b25a75b0f94962e68643786703cfadc2bfce4e28e6173017a915a3389b`) | Nori offers his paw and his lantern to Toby, whose forepaws are at his sides |

| Question | Answer |
|---|---|
| Who made it, and with what | Rendered on 2026-11-12 by the operator's story factory (`~/Workspace/ai-tools/gpt-image-generator-browser`, stage `final_page_illustration`, provider `gpt`) driving ChatGPT's image generation in the operator's signed-in browser, from each page's scene in the book's brief (`stories/gwf-75/2-4/the-lantern-bridge/book.json`), with Nori's and Toby's character and pose sheets, the bridge location sheet, the storyboard and page 1 as references. Prompts and hashes are in the factory's `output/the-lantern-bridge/provenance/`. No other page or cover was drawn again |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — as for the rest of the book: depends on the ChatGPT plan and account used, which the repository does not record |
| Checked by eye against well-known games and films | **Not yet done by a person.** The characters are the book's own Nori and Toby. The operator noted on 2026-11-12 that Nori is drawn a little differently from page to page; that is not yet addressed |
| Quality | 1448×1086, the book's own page size, drawn the same way as its pages |

## 5o. The Lantern Bridge: the old tin page removed, and pages drawn again (2026-11-14)

The operator asked for page 6, Nori on the riverbank shaking his old tin, to be removed with its words
(2026-11-14). The book now has 14 pages: what were pages 7 to 15 are pages 6 to 14, in folders renamed to
match, so the counting games are on pages 4 and 7 and the Choose game on page 10. The removed picture is
not shipped. The same day the operator's complaints about pages 3, 4 and 7 to 10 (old numbers) were
redrawn with ai-tools' `image_gen_browser.regenerate_page`, one page per run, and each new `final.webp`
copied byte for byte. The tap spots of both counting games were measured again on the new pictures. The
earlier versions are kept in each page's `history/` folder in the factory's `output/the-lantern-bridge/pages/`.
These redraws were put into the app for the operator to check; they have not yet been approved.
Pages 12 and 14 (factory pages 13 and 15) were drawn again by the factory's renderer on 2026-11-13 and
copied into the app on 2026-11-15; they too wait for the operator's approval.

| File | What it shows |
|---|---|
| `page-3/background.webp` (1448×1086, SHA-256 `168facece30fa8eefaaa43cc589cd4a854f8e47c18bddc47b060fb4f6994adc7`) | Nori by a tall, narrow shed with logs stacked against its side, as on page 2 |
| `page-4/background.webp` (1447×1087, SHA-256 `a813b3df9cd85fe3b7df878671ba75c77e8fe3482958af06430f385733a75f7b`) | Nori pointing at two dot cards on the grass beside one red and one yellow lantern at the foot of the bridge |
| `page-6/background.webp` (1448×1086, SHA-256 `8eb4dbda2b6fff90020fb70ef7fb4659bd067ee2dc0cd7f003344843d3c31599`) | Page 6's old riverbank scene with no lantern hanging; Nori scratches his nose, his tin on the grass (page 7 until 2026-11-14) |
| `page-7/background.webp` (1448×1086, SHA-256 `e390e6a844d8ca571d2516ebae7636e66ce4ccf65780b106b2cd7cac50f449f0`) | Nori on the stream path pointing at three posts, each with one empty hook; no bridge in view (page 8 until 2026-11-14) |
| `page-8/background.webp` (1447×1087, SHA-256 `a74053d190cf99779c77c8494303f5702b3d76b21375a89bfb4ad1fb2b1744f8`) | Nori at the last post on the stream path, the lantern handle clear of its hook (page 9 until 2026-11-14) |
| `page-9/background.webp` (1446×1087, SHA-256 `77eeda9cd60959e8ed89210af606ca3d68476723b0d730989673a48146ae58cc`) | The broken, dark lantern in the mud by the stream, the posts as tall as on pages 7 and 8 (page 10 until 2026-11-14) |
| `page-10/background.webp` (1448×1086, SHA-256 `5403f1b25a75b0f94962e68643786703cfadc2bfce4e28e6173017a915a3389b`) | Unchanged from §5n's page 11: Nori offers his paw and his lantern to Toby |
| `page-12/background.webp` (1448×1086, SHA-256 `e5a6a14acd9d51b2ec58e854f044b482d173bd738455af5f862fdbde6c92c224`) | Nori and Toby in the meadow, Toby waving towards the lit bridge (factory page 13, drawn 2026-11-13) |
| `page-14/background.webp` (1448×1086, SHA-256 `da16fdb3507e51873c4c0981de79b25dcafa8ddbab864692c1165ff58292e575`) | Nori and Toby at the round table under the hanging lantern, with crumpets and tea (factory page 15, drawn 2026-11-13) |

| Question | Answer |
|---|---|
| Who made it, and with what | Redrawn on 2026-11-14 by the operator's story factory (`~/Workspace/ai-tools/gpt-image-generator-browser`, `image_gen_browser.regenerate_page`, provider `gpt`) driving ChatGPT's image generation in the operator's signed-in debug Chrome, from each page's current picture, its brief in `output/the-lantern-bridge/book.json` and a written correction. Prompts and hashes are in the factory's `output/the-lantern-bridge/provenance/` |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — as for the rest of the book: depends on the ChatGPT plan and account used, which the repository does not record |
| Checked by eye against well-known games and films | **Not yet done by a person.** The characters are the book's own Nori and Toby |
| Quality | About 1448×1086, the book's own page size, drawn the same way as its pages |

The table records these files as they shipped on 2026-11-14 and 2026-11-15, under the page numbers of those days. On
2026-11-16 the book was told again from page 6 and has 15 pages; §5p lists what ships now.

## 5p. The Lantern Bridge: told again from page 6, a bag of lanterns lights the bridge (2026-11-16)

The operator asked for the page where Nori scratches his nose to be removed, and for Nori to find a bag hanging on the
last post, with the rest of the book told again to follow it (2026-11-15). In the new story the bag holds lanterns: the
child helps Nori hang one on each of the three hooks (the counting game, now page 7), Nori hangs the rest along the
bridge, and the whole bridge is lit when Toby arrives. The book has 15 pages again; the games are on pages 4, 7 and 10.
The scratched-nose picture and the old pages 8, 9 and 11 to 13 are not shipped; they are kept outside the repository with
the factory's earlier output in `output/the-lantern-bridge-superseded-2026-11-15/`. Pages 7 to 14 and page 10's two
choice pages were drawn by the factory from the retold brief; pages 9, 11 and 12 (iron hooks left hanging off the bridge)
and 13 (posts drawn as curved street lamps) were drawn once more with `image_gen_browser.regenerate_page`, the earlier
versions kept in each page's `history/` folder. Each file is ai-tools' `final.webp` for that page or option, copied byte
for byte, under `grow-with-freya/assets/stories/the-lantern-bridge/` (5.2 MB for the new files). Page 10's two choice
cards (`page-10/challenge/`) are unchanged. These were put into the app for the operator to check; they have not yet been
approved.

| File | What it shows |
|---|---|
| `page-3/background.webp` (1448×1086, SHA-256 `56fce63bc6aad3631bb1b305529fa1f6a2b021467a6500b174b390abadfbce00`) | Nori chasing the rolling yellow lantern along the garden path, the other lanterns scattered round him, with no building in the picture: where the cottage and the shed stood there is the big tree, bushes with red berries, grasses and the dusk sky. Drawn again on 2026-11-18 at the operator's request ("page 3 should not have the house in the background or the shed"); Nori, the lanterns, the path and the far bridge are as before. Replaces §5o's `168facec…`, no longer shipped |
| `page-6/background.webp` (1448×1086, SHA-256 `19379526ac3a50c55d54f7ef31f1011cad56d311f22a3d505fa4c17fb72c02e9`) | Nori walking along the stream path from the bridge, his two lanterns glowing at its start, past three posts with empty hooks; the bag hangs from a peg on the last post. Drawn later on 2026-11-16, when the operator replaced the counting page with a walk; it replaces §5o's page 7 picture (SHA-256 `e390e6a8…`), which is no longer shipped |
| `page-7/background.webp` (1448×1086, SHA-256 `7805b7a6e16b2f7142fe87caa829a406d29fb03fbab466111a01af9701954a62`) | Page 6's setting unchanged (the same three posts, hooks, bridge and path), with Nori in front of the last post holding the old brown bag he has lifted down, lanterns peeping out; the three hooks are empty (the counting game's tap spots were measured on this picture). Drawn again later on 2026-11-16 so its posts match page 6; replaces `33289a1a…`, no longer shipped |
| `page-7/outcomes/first-hook.webp` (225×241, SHA-256 `c216d012e1fea77473eb573e25bb598d4dfea978e1ce956c94dd7f23288d3591`), `second-hook.webp` (221×235, SHA-256 `150c6866c6b3dfaaa1967b233423054e988dd4b88ed1922ce828beb0100ef3ef`), `third-hook.webp` (152×196, SHA-256 `9fb110fe030e4e60c006d6ef5285d830846ef44d3f5c55b189c22b57429dde41`) | The three lanterns of page 8, each cut out with its glow and a transparent surround, hung on page 7's hooks one by one as the child presses them (2026-11-17). Not new art: cut in this repository's working copy from `page-8/background.webp` with a difference matte against `page-6/background.webp` (the same posts with empty hooks), so they carry page 8's provenance and terms. The third is a tight silhouette because it hangs in front of Nori's ear on page 7 |
| `page-8/background.webp` (1448×1086, SHA-256 `4b7e2603e3f66d063a32c730d1f16d18476d287857b119132cb310bb932cfb33`) | Page 7's picture with a glowing lantern on each of the three hooks, Nori grinning into the bag, still full. Drawn again later on 2026-11-16 so its posts match pages 6 and 7; replaces `3184fe68…`, no longer shipped |
| `page-9/background.webp` (1446×1087, SHA-256 `b71ba72295f50ed709d8b46257f0d0ed72550010ab23d469edb02a21f70c2cf8`) | Nori at the foot of the lit bridge, looking up at it: only the near half of the bridge is in the picture, rising from the stone steps and running out of the right-hand edge before its crest, a lantern on every post and yellow and red flags along both rope rails. Drawn again on 2026-11-17 at the operator's request, because the whole bridge read wrongly (posts standing in the middle of the deck, a far half too squashed to follow); replaces `0a1703c9…`, no longer shipped |
| `page-10/background.webp` (1448×1086, SHA-256 `1c374c851aa8706fc142334c27180bd88b28d1073732f9eaf4ef8d17f61211db`) | Toby arrives on the far bank, the lit bridge behind; the Choose game's page |
| `page-10/outcomes/offer-a-paw.webp` (1448×1086, SHA-256 `b04f36ef3a0a3dc9c4fc622adfe628f6dd05ab8e6ba02f6bbb7fbe41fe5a8733`) | Nori offers Toby his paw by the lit bridge (replaces §5m's). Corrected on 2026-11-17 at the operator's request: Toby's reaching paw was a shapeless fist that swallowed Nori's paw, and now wraps round Nori's small paw, thumb over the top. Only the joined paws changed: the factory drew the picture again from itself (kept as `redraw-candidate.webp`, SHA-256 `ec4c14db…`, not shipped), and the paws alone were laid from that redraw into the earlier picture through a soft-edged ellipse, saved as WebP at quality 92; replaces `ab6fd9d5…`, no longer shipped |
| `page-10/outcomes/share-the-lamp.webp` (1448×1086, SHA-256 `4eb27fb0727b9284afc6a6c3a8eccc3ccd107bf0d9eba33436e1e5b92855cc09`) | Nori holds a lantern up between them by the lit bridge (replaces §5m's). Corrected on 2026-11-17 at the operator's request: Toby's raised forepaw lay flat on his chest with no arm behind it, and now both his arms hang from his shoulders, a paw at each side, as he stands on page 10. Only Toby's left side changed: the factory drew the picture again from itself (kept as `redraw-candidate.webp`, SHA-256 `a5914736…`, not shipped), and his lowered arm, shoulder and chest alone were laid from that redraw into the earlier picture through a soft-edged rounded box, saved as WebP at quality 92. A first redraw that kept the paw raised drew the arm growing out of his chest and was rejected (`rejected-candidate-1.webp`, SHA-256 `0ea5c30f…`, not shipped); replaces `f9be2442…`, no longer shipped |
| `page-11/background.webp` (1448×1086, SHA-256 `ba49bb72314773e3457e3bf29cec504e95d5b855051ed507a5ebb2f6d6df3458`) | Nori and Toby crossing the lit bridge, holding paws; the walkway and railings carry on out of the bottom and sides of the picture. Drawn again later on 2026-11-16 because the bridge looked as if it stopped at a front edge above the arch; replaces `8eeaa5d6…`, no longer shipped |
| `page-12/background.webp` (1448×1086, SHA-256 `ce985d31d68196a81f30ef6303299eda3375ba2c1337c905060e14fcae1940f8`) | Toby on the riverbank pointing up at the lights, Nori giggling; to their right, clear of them, a simple side-on bridge like the one on pages 6 to 8: one low wooden arch landing on both banks, one deck, two rope railings running its full length on paired, evenly spaced posts, one lantern on each post. Drawn again five times later on 2026-11-16 (from page 9's picture; to separate overlapping lantern rows; side-on; smaller and further right so no post hides behind the mole; then with both railings run the full length and the stone steps removed); replaces `50597c9b…`, `b1ef953e…`, `378811c1…` and `ed886c35…`, none shipped |
| `page-13/background.webp` (1448×1086, SHA-256 `b2b0b0432376c3c4bb5d9f3101161c44dd30ead8f9925e3d0e11a4e85ffa258a`) | The two friends walking past the three lit posts towards Nori's cottage |
| `page-14/background.webp` (1447×1087, SHA-256 `22a96e5339937e2949548f933f53a8f7f04d55d88c6e783a2d9d4e5e5d38c476`) | The hug on the welcome mat; past the garden only the stream, stones and trees. Drawn again later on 2026-11-16 to take the bridge out of the background; replaces `2353ab5d…`, no longer shipped |
| `page-15/background.webp` (1448×1086, SHA-256 `da16fdb3507e51873c4c0981de79b25dcafa8ddbab864692c1165ff58292e575`) | Unchanged from §5o's page 14: the round table with crumpets and tea |

| Question | Answer |
|---|---|
| Who made it, and with what | Rendered on 2026-11-15 by the operator's story factory (`~/Workspace/ai-tools/gpt-image-generator-browser`, `render-book` stages `final_page_illustration` and `alternative_page_illustration`, then `image_gen_browser.regenerate_page` for pages 9, 11, 12 and 13, provider `gpt`; page 6 rendered again by `render-book` later the same day; pages 7 and 8 then drawn again with `regenerate_page`, each starting from the page before it, so the three posts are the same on pages 6, 7 and 8; page 11 drawn again so its walkway runs on out of the picture, page 12 drawn again starting from page 9 so its bridge matches, and page 14 drawn again without the bridge; on 2026-11-17 page 9 drawn again with `regenerate_page` to show only the near half of the bridge, and the joined paws of `offer-a-paw`, then Toby's arm in `share-the-lamp`, drawn again by the same routine run over a scratch copy of the book with that picture standing in as page 10; on 2026-11-18 page 3 drawn again with `regenerate_page` to take the cottage and the shed out of its background) driving ChatGPT's image generation in the operator's signed-in debug Chrome, from the retold brief in `output/the-lantern-bridge/book.json`, with the book's character, pose and location sheets as references. Prompts and hashes are in the factory's `output/the-lantern-bridge/provenance/` |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — as for the rest of the book: depends on the ChatGPT plan and account used, which the repository does not record |
| Checked by eye against well-known games and films | **Not yet done by a person.** The characters are the book's own Nori and Toby |
| Quality | About 1448×1086, the book's own page size, drawn the same way as its pages. Page 13's posts carry taller hook arms than those on pages 6 to 8 |

## 6. The lock on the learning-plan checkpoints

**No longer drawn, since 2026-10-03.** The checkpoints now wear the operator's later mock: a
white padlock with a navy keyhole, drawn in code in the middle of the disc
(`components/island/plan-checkpoint.tsx`, made for the app, no outside art). The earlier
`lock.webp` (256×256, cut from a glossy blue padlock picture the operator pasted into the
working session on 2026-10-03, origin never established) was never bundled or committed, and
the operator had it deleted from the working copy on 2026-11-09. No third-party art remains
in this feature.

| Question | Answer |
|---|---|
| The dotted trail and the checkpoint discs | Drawn in code (`components/island/plan-trail.tsx`, `plan-checkpoint.tsx`) from the operator's style guide (a picture of a white dotted path over the island, not shipped). Made for the app |

