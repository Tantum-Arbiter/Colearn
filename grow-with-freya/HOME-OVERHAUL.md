---
title: "Home screen overhaul — a place, not a launcher"
type: design
status: proposed
branch: mvp
updated: 2026-07-29
---

# Home screen overhaul

## What it is today

Three destinations — Stories, Learning, Instruments — presented as icons in a 3D coverflow
carousel, over a sky with **12 infinite `withRepeat` animations**: drifting clouds, rotating
stars, floating rockets, pulsing icons. Drift positions are persisted in the store
(`backgroundAnimationState`) so motion resumes where it left off.

The original brief already flagged this: *"individually these are gentle, but together they can
create continuous background activity that competes with the books."*

## The actual problem

**It moves constantly and responds to almost nothing.** Twelve things animate on their own; the
child can do exactly one thing — tap an icon to navigate. That is backwards for this age group,
and it is the same failure as the old catalogue: an adult app-launcher pattern wearing soft
colours.

## The principle

**Interactive is not the same as animated.** Invert the current arrangement:

> The scene is still until it is touched. Then it responds — once, softly, and only where the
> child touched.

This is the same grammar as the reader's pause-and-notice rhythm. A child who learns "touch a
thing, the thing answers" on the home screen already knows how to read a story here.

---

## The design — a windowsill at three times of day

One illustrated scene: a windowsill or nook, the bear already in the asset set, the night sky the
brand is built on. The three destinations are **objects in the world**, not icons in a row:

| Destination | Object | Touch response |
|---|---|---|
| **Stories** | a small stack of books on the sill | the stack leans, the top book lifts a finger's width |
| **Instruments** | a flute resting on a cushion | one soft note sounds, the flute rocks once |
| **Learning** | letter and number blocks | the top block turns to show a different face |

The object acknowledges, then opens after ~400 ms. The books leaning into the Story Garden is
deliberate continuity — the same object the child touches here is the shelf they arrive at.

### Time of day, not motion

The scene changes with the clock, reusing `getTimeOfDay()` already written for the greeting:

- **morning** — low warm light, sky pale, blanket folded back
- **afternoon** — bright, curtain drawn aside, dust in the light
- **evening** — moonlit, the palette the brand already owns, bear tucked in

Returning at bedtime *looks* different from returning after breakfast. That is what makes the
screen feel alive — not perpetual drift.

### Things that answer but lead nowhere

The heart of "interactive". A handful of details respond to touch and do nothing else:

- a star **twinkles once**
- the moon **brightens and settles**
- the curtain **sways once**
- the bear **shifts and resettles**
- a cloud **drifts a little further, then stops**

No score, no counter, no confetti, no unlockables. The reward is that the world noticed. This is
curiosity practice for a two-year-old, and it teaches the exact touch grammar the stories use.

### Motion budget

At most **one** slow ambient element for the whole screen — a single cloud, or the moonlight
breathing, never both. Everything else waits to be touched. Under reduced motion, ambient stops
entirely and touch responses become cross-fades.

---

## What changes

**Remove**
- the 3D coverflow carousel
- 12 `withRepeat` loops (clouds, stars, rockets, icon pulses)
- `backgroundAnimationState` from the store — persisting drift positions stops being meaningful
  when nothing drifts unprompted

**Keep**
- the three destinations, unchanged
- the bear, the palette, the night-sky direction
- screen-time provider and the parents-only gate
- every navigation target — this is a presentation change, not a routing change

**Add**
- `hooks/use-touch-response.ts` — one-shot, non-repeating responses, sharing the rhythm grammar
- `components/home/home-scene.tsx` + a small set of touchable scene objects
- time-of-day scene selection, reusing `getTimeOfDay()`

## Cost and risk

Roughly **400–500 lines**, most of it new files. The routing is untouched, so the risk is
confined to presentation. It can sit behind the same `useStoryGarden` flag, or its own, and be
switched on independently.

The real cost is **artwork**: three time-of-day scenes with separable touchable objects. That is
an illustration commission, not a code task, and it is the long pole. A first pass can ship with
the existing bear-and-sky assets composed differently, to prove the interaction before committing
to new art.

## Open question

Does the home screen need **Continue reading** on it? It would get a child back into a part-read
book in one tap instead of two. I have left it out: the Story Garden already carries it, and the
home screen's job is choosing *what kind of thing to do*, not which book. Worth revisiting once
you see how often a session is a resumed story rather than a new one.
