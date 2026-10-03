---
title: "Asset and licence register — Early Roots app"
type: register
status: started — the island picture (§5) is the only row for something in the build; the plan's lock art (§6) is no longer drawn; the Otter Raft rows are for a game undone 2026-09-30
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
| `island-fall-*-streaks.webp`, `island-spray.webp`, `island-lit-windows.webp`, `island-lit-village-1…2.webp`, `island-lamp-glow.webp`, `island-lamp-beam.webp`, `island-lamp-pulse.webp`, `island-ring.webp` | Drawn by the same script: streaks, soft glows, beams and rings, not taken from any picture | Made for the app |
| `island-fall-*-cover.webp`, `island-pool-*-cover.webp` | Cut from `island.webp` by the same script | The painting round each waterfall and each pool, with a hole the shape of the water |
| The gulls | Drawn in code (`components/island/island-gulls.tsx`); the painted gulls are painted out of `island-base` | Made for the app |

| Question | Answer |
|---|---|
| Who made it, and with what | ⚠️ UNVERIFIED — the picture arrived with no record of its origin. It has the look of a generated image; the operator to say which service and account, or which artist |
| Terms for commercial use, and who owns it | ⚠️ UNVERIFIED — depends on the answer above |
| Checked by eye against well-known games and films | **Not yet done by a person.** An isometric cartoon island of this kind resembles the art of several well-known games in general style; that is not an infringement in itself, but it wants the operator's eye before go-live |
| The sun and moon drawn on it | The app's own `home-sun` and `home-moon` art, already in the build; their origin is not recorded either — ⚠️ UNVERIFIED |

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

