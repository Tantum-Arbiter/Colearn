# Story & Game — Asset Requirements

> What content is needed for every spelling/numbers story, where to put it, and naming conventions.

---

## Current State

The spelling game currently uses **one shared background image** for all activities:

```
assets/games/spelling/background.webp
```

Each activity needs its own **cover image** (shown in the learning menu card) and each of its **5 story variations** needs a unique **storybook illustration** (shown in the upper half of the game screen).

---

## Folder Structure

All learning game assets live under `assets/games/`. Organise by mode, then by activity ID, then by story ID:

```
assets/games/
├── reading/                          # Reading mode activities
│   ├── abc-animals/
│   │   ├── cover.webp                # Menu card image for "ABC Animals"
│   │   ├── ant-adventure.webp        # Story 1 illustration
│   │   ├── buzzy-bee.webp            # Story 2 illustration
│   │   ├── cat-nap.webp              # Story 3 illustration
│   │   ├── dog-park.webp             # Story 4 illustration
│   │   └── egg-nest.webp             # Story 5 illustration
│   ├── first-words/
│   │   ├── cover.webp
│   │   ├── sunny-day.webp
│   │   ├── tea-party.webp
│   │   ├── park-walk.webp
│   │   ├── rainy-morning.webp
│   │   └── bedtime-routine.webp
│   ├── colour-spelling/
│   │   ├── cover.webp
│   │   └── ... (5 story images)
│   ├── shape-names/
│   ├── my-name/
│   ├── wombat-spelling/
│   ├── animal-spelling/
│   ├── food-spelling/
│   ├── nature-words/
│   ├── garden-words/
│   ├── word-builder/
│   ├── sentence-speller/
│   ├── tricky-words/
│   └── story-spelling/
│
└── numbers/                          # Numbers mode activities
    ├── counting-fun/
    │   ├── cover.webp
    │   ├── star-count.webp
    │   ├── bubble-count.webp
    │   ├── ladybird-count.webp
    │   ├── shell-count.webp
    │   └── kite-count.webp
    ├── number-friends/
    ├── colour-counting/
    ├── shape-counting/
    ├── one-two-three/
    ├── wombat-word-placing/
    ├── animal-counting/
    ├── fruit-counting/
    ├── toy-counting/
    ├── garden-counting/
    ├── number-puzzles/
    ├── adding-fun/
    ├── number-stories/
    ├── number-patterns/
    └── subtraction-fun/
```

---

## File Naming Convention

| File | Format | Convention |
|---|---|---|
| Cover image | `cover.webp` | Always named `cover.webp` inside the activity folder |
| Story illustration | `{story-id}.webp` | Uses the story's `id` field from `spelling-stories.ts` / `numbers-stories.ts` |

**Example:** The story with `id: 'ant-adventure'` in activity `abc-animals` → `assets/games/reading/abc-animals/ant-adventure.webp`

---

## Image Specs

| Property | Requirement |
|---|---|
| **Format** | WebP (`.webp`) — matches existing asset convention |
| **Cover dimensions** | 400×300px minimum (displayed in menu cards, scales down) |
| **Story dimensions** | 800×600px minimum (displayed in upper half of game screen) |
| **Max file size** | ≤150KB per image (bundled in app, affects download size) |
| **Aspect ratio** | 4:3 landscape for story images; cover can be flexible |
| **Transparency** | Not required — images sit on gradient backgrounds |
| **Colour profile** | sRGB |

---

## Art Direction

Per project guidelines (CLAUDE.md):

- **Style:** Soft, warm, premium storybook illustrations
- **Inspiration:** Modern Pixar/Ghibli-inspired softness, painterly depth
- **Palette:** Space/night-sky inspired, moonlight, stars, gentle gradients
- **Forms:** Rounded, approachable, paper/storybook textures
- **Avoid:** Chaotic layouts, aggressive saturation, cheap children's app patterns
- **Readability:** Must be clear and recognisable at mobile phone sizes

---

## Content Per Story

Every story illustration should visually represent the story's theme. Below is the mapping:

### Reading Activities (14 activities × 5 stories = 70 images + 14 covers)

| Activity | Story ID | Image Theme |
|---|---|---|
| `abc-animals` | `ant-adventure` | A small ant exploring blades of grass |
| | `buzzy-bee` | A bee landing on a colourful flower |
| `wombat-spelling` | `burrow-adventure` | A wombat peeking out of a cosy burrow |
| | `river-wombat` | A wombat crossing stepping stones in a river |
| | `hilltop-wombat` | A wombat watching sunset from a hilltop |
| | `rainy-wombat` | A wombat sheltering under a big leaf in rain |
| | `starry-wombat` | A wombat gazing up at a starry sky |
| `animal-spelling` | `rabbit-meadow` | A rabbit hopping through a wildflower meadow |
| | `tiger-jungle` | A tiger resting in dappled jungle light |
| | `parrot-rain` | A colourful parrot in a lush rainforest |
| | `monkey-canopy` | A monkey swinging through a leafy canopy |
| | `turtle-beach` | A turtle walking on a warm sandy beach |
| `food-spelling` | `muffin-kitchen` | Muffins cooling on a kitchen counter |
| | `cheese-picnic` | A cheese board on a picnic blanket |
| | `pasta-pot` | Pasta bubbling in a big pot |
| | `cookie-jar` | A cookie jar on a shelf with steam wafting |
| | `salad-garden` | A fresh salad bowl in a garden |
| `nature-words` | `river-walk` | A gentle river winding through a forest |
| | `ocean-waves` | Soft ocean waves on a sandy shore |
| | `desert-dunes` | Golden sand dunes under a blue sky |
| | `meadow-bloom` | A meadow full of wildflowers |
| | `canyon-sunset` | A canyon glowing in sunset light |
| `garden-words` | `petal-breeze` | Flower petals drifting on a gentle breeze |
| | `sprout-morning` | A tiny green sprout emerging from soil |
| | `trowel-dig` | A garden trowel in freshly turned soil |
| | `ivy-fence` | A wooden fence covered in climbing ivy |
| | `mulch-bed` | A garden bed with rich dark mulch |
| `word-builder` | `castle-build` | Building blocks forming a castle |
| | `rocket-build` | A colourful rocket being assembled |
| | `treehouse-build` | A treehouse under construction in a big tree |
| | `bridge-build` | A wooden bridge stretching over a stream |
| | `windmill-build` | A windmill on a green hill |
| `sentence-speller` | `kitten-day` | A kitten exploring a sunny garden |
| | `rainy-afternoon` | A child looking out a rainy window |
| | `beach-trip` | Sandcastles and seashells on a beach |
| | `snow-morning` | A snowy garden with footprints |
| | `market-visit` | A colourful farmers' market stall |
| `tricky-words` | `knight-quest` | A friendly knight on a moonlit quest |
| | `gnome-garden` | A gnome tending a tiny garden |
| | `wreath-craft` | Hands crafting a leafy wreath |
| | `autumn-walk` | Autumn leaves falling on a path |
| | `island-adventure` | A small island with a palm tree |
| `story-spelling` | `enchanted-castle` | A glowing castle in an enchanted forest |
| | `dragon-library` | A dragon reading books in a library |
| | `moonlit-path` | A moonlit forest path with fireflies |
| | `pirate-cove` | A pirate ship anchored in a hidden cove |
| | `robot-garden` | A friendly robot tending a garden |

### Numbers Activities (15 activities × 5 stories = 75 images + 15 covers)

| Activity | Story ID | Image Theme |
|---|---|---|
| `counting-fun` | `cf1` | Stars twinkling in a night sky |
| | `cf2` | Bubbles floating in sunlight |
| | `cf3` | Ladybirds on green leaves |
| | `cf4` | Shells scattered on a beach |
| | `cf5` | Colourful kites flying in the wind |
| `number-friends` | `nf1` | Ducks swimming on a calm pond |
| | `nf2` | Bunnies hopping through a meadow |
| | `nf3` | Fish swimming in a coral reef |
| | `nf4` | Birds sitting in a tree nest |
| | `nf5` | Frogs sitting on lily pads |
| `colour-counting` | `cc1` | Red berries on a bush |
| | `cc2` | Blue gems sparkling in a cave |
| | `cc3` | Green leaves on a big tree |
| | `cc4` | Yellow sunflowers in a field |
| | `cc5` | Purple plums on a branch |
| `shape-counting` | `sc1` | Round suns and circles |
| | `sc2` | Square boxes stacked up |
| | `sc3` | Mountain peaks as triangles |
| | `sc4` | Heart shapes in pink and red |
| | `sc5` | Sparkling diamond shapes |
| `one-two-three` | `ot1` | A single tree on a gentle hill |
| | `ot2` | Fluffy clouds in a blue sky |
| | `ot3` | Bees buzzing around flowers |
| | `ot4` | Autumn leaves falling from a tree |
| | `ot5` | Rain puddles with ripples |
| `wombat-word-placing` | `wp1` | A forest with trees and mushrooms |
| | `wp2` | Stars twinkling in a line |
| | `wp3` | Fish on both sides of a river |
| | `wp4` | Clouds rolling across the sky |
| | `wp5` | Moonbeams lighting a path at night |
| `animal-counting` | `ac1` | Panda and safari animals |
| | `ac2` | A tiger lounging in jungle shade |
| | `ac3` | Frogs and dragonflies by a pond |
| | `ac4` | Chicks hatching in a barn |
| | `ac5` | Animals at the zoo |
| `fruit-counting` | `fc1` | Apples on a tree in an orchard |
| | `fc2` | Grapes at a market stall |
| | `fc3` | A watermelon centrepiece at a picnic |
| | `fc4` | Mixed fruit growing in a garden |
| | `fc5` | Fruit being blended into a smoothie |
| `toy-counting` | `tc1` | Building blocks on a shelf |
| | `tc2` | A toy train circling a track |
| | `tc3` | Toys marching in a parade |
| | `tc4` | Toys being tidied into a box |
| | `tc5` | Toy cars racing on a track |
| `garden-counting` | `gc1` | Flowers blooming in a garden |
| | `gc2` | Dandelion seeds floating in the breeze |
| | `gc3` | Plant pots on a windowsill |
| | `gc4` | Seedlings popping up after rain |
| | `gc5` | Rows of flowers in a garden |
| `number-puzzles` | `np1` | A puzzle door with a keyhole |
| | `np2` | A twisting maze with numbered paths |
| | `np3` | Gems lighting up a locked door |
| | `np4` | A magic clock with glowing numbers |
| | `np5` | A combination lock on a treasure chest |
| `adding-fun` | `af1` | Addition symbols floating in the air |
| | `af2` | Doubling clouds in the sky |
| | `af3` | Pebbles in a shallow river |
| | `af4` | Stars adding up in the night sky |
| | `af5` | Moonbeam glow at night |
| `number-stories` | `ns1` | A dragon in a number-filled lair |
| | `ns2` | Fairies dancing in a glowing ring |
| | `ns3` | Pirate treasure chests on a beach |
| | `ns4` | Robots powering up in a lab |
| | `ns5` | A wizard's spell book with glowing pages |
| `number-patterns` | `npa1` | Coloured stripes in a repeating pattern |
| | `npa2` | Beads on a necklace chain |
| | `npa3` | Tessellating tiles on a floor |
| | `npa4` | A spiral star pattern |
| | `npa5` | Rhythmic waves on a shore |
| `subtraction-fun` | `sf1` | Cookies being taken from a plate |
| | `sf2` | Balloons popping in the sky |
| | `sf3` | Apples falling from a tree |
| | `sf4` | Stars falling from the night sky |
| | `sf5` | Sand being scooped from a bucket |

---

## Totals

| Type | Count |
|---|---|
| Reading cover images | 14 |
| Reading story illustrations | 70 |
| Numbers cover images | 15 |
| Numbers story illustrations | 75 |
| **Total images needed** | **174** |

---

## How to Wire Up Images

Currently `spelling-game-screen.tsx` loads a single hardcoded image:

```typescript
const WOMBAT_IMAGE = require('@/assets/games/spelling/background.webp');
```

Once assets are created, this should be replaced with per-story image loading. The `SpellingStory` type can be extended with an optional `image` field, or images can be resolved by convention using the story ID:

```typescript
// Option A: Add to SpellingStory type
export interface SpellingStory {
  // ... existing fields
  image?: ImageSourcePropType;
}

// Option B: Resolve by convention
function getStoryImage(mode: 'reading' | 'numbers', activityId: string, storyId: string) {
  // Map to require() calls or dynamic asset loading
}
```

The cover image for each activity card in the learning menu can be loaded similarly in `learning-screen.tsx`.
