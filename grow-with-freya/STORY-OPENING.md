# Opening a Story

> How a tapped book becomes the reader. Owned by `contexts/story-transition-context.tsx`;
> timings live in `constants/story-opening.ts` and are tested in `__tests__/constants/story-opening.test.ts`.

## Why this exists

The previous opening was a chain of cuts: the floating book snapped still, an opaque mask
faded in, the OS turned the screen, the book reappeared somewhere else, the cover flipped
in 200ms, and the live reader popped on top the moment it had mounted, usually mid-way
through the grow. It read as rigid because nothing carried through from one step to the
next.

## The ritual

Every step hands the book to the next one. Nothing appears or vanishes in a single frame.

| Step | Phone | Tablet | What a child sees |
|---|---|---|---|
| Settle | 260ms | 260ms | The floating book comes to rest; the prompt's words and arrows fade. |
| Veil in | 220ms | – | A night-navy veil rises and the book dips into it. |
| Turn | ~300ms | – | The screen turns to landscape behind the veil, never on show. |
| Re-enter | 460ms | – | The veil lifts as the book rises into its seat, a touch small and low, growing to size. |
| Cover lift | 480ms | 480ms | The cover swings open on its spine. The page beneath sits in its shadow, brightening as the cover clears; the cover's face darkens as it turns from the light. |
| Hold | 140ms | 140ms | A breath with the first page showing. The live reader mounts now, hidden. |
| Grow | 520ms | 520ms | The open book grows to fill the screen, decelerating into place. |
| Dissolve | 200ms | 200ms | The live reader dissolves in over the grown book; then the overlay is torn down. |

Total: about 1.6s on a tablet, about 2.6s on a phone including the turn.

## Rules

- **The reader mounts hidden.** The layout applies `readerRevealStyle` from the transition
  context to the reader's wrapper. The reader is mounted at the start of the hold so its cost
  overlaps the breath and the grow, and it is only revealed by the dissolve. Without this, the
  reader (which sits above the overlay) appeared the instant it had rendered and cut the grow
  short on any fast device.
- **The turn is never on show.** Phones are portrait-locked outside the reader, so the OS snap
  to landscape is hidden by the veil. The book goes into the veil and comes back out of it; it
  does not jump between positions.
- **Tablets skip the turn.** Their interface is unlocked and already sideways by the time the
  book opens (`hooks/use-turn-to-landscape.ts` opens the book as soon as the screen is
  sideways), so they go straight from settle to cover lift.
- **Eases decelerate into rest.** Motion that ends in a resting state (re-enter, grow, dissolve)
  uses `Easing.out`; the cover, which is pushed and then caught, uses `Easing.inOut(quad)` --
  cubic left the last third of the lift visually dead, which read as a pause before the hold.
- **The turn hides in navy.** The root view behind every React view is the same night navy as
  the veil (`backgroundColor` in `app.config.js`, and `expo-system-ui` at launch for dev
  clients), so the corners iOS reveals while it turns the screen are navy on navy, not black.
- **Closing is the same book in reverse.** The exit animation drives the same shared values
  (`pageFlipProgress`, `bookExpansion`) backwards, so the shading reads correctly both ways.
