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
| The story reader's buttons: exit, menu, sound, back, next and the finishing tick, as painted coins (the operator's pictures, 2026-11-11) | Registered below, §5f — origin and licence ⚠️ UNVERIFIED |
| The clouds behind every book's words, one with faces and one with instruments for music books (the operator's pictures, 2026-11-11) | Registered below, §5g — origin and licence ⚠️ UNVERIFIED |
| The Play button on a book's music pages (the operator's picture, 2026-11-11) | Registered below, §5h — origin and licence ⚠️ UNVERIFIED |
| The reader's menu: its painted panel, row icons and row arrow (the operator's pictures, 2026-11-11) | Registered below, §5i — origin and licence ⚠️ UNVERIFIED |
| The reader's Compare Languages and Change Language panels: the painted frame (the operator's picture, 2026-11-12) | Registered below, §5j — origin and licence ⚠️ UNVERIFIED |
| The Audio Settings panel, opened from every sound button: its painted frame and the three button icons (the operator's pictures, 2026-11-12) | Registered below, §5k — origin and licence ⚠️ UNVERIFIED |
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

