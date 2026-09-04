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
| Settle | 260ms | 260ms | The floating book comes to rest and glides into its opening seat; the prompt's words and arrows fade. |
| Veil in | 220ms | – | A night-navy veil rises and the book dips into it. |
| Turn | ~300ms | – | The screen turns to landscape behind the veil, never on show. |
| Re-enter | 460ms | – | The veil lifts as the book rises into its seat, a touch small and low, growing to size. |
| Cover lift | 480ms | 480ms | The cover swings open on its spine and dissolves as it swings clear. The page beneath sits in its shadow, brightening as the cover clears; the cover's face darkens as it turns from the light. |
| Hold | 140ms | 140ms | A breath with the first page showing. The live reader mounts now, hidden. |
| Grow | 520ms | 520ms | The open book grows to fill the screen, decelerating into place. |
| Dissolve | 200ms | 200ms | The live reader dissolves in over the grown book; then the overlay is torn down. |

Total: about 1.6s on a tablet, about 2.6s on a phone including the turn.

## Tile to card

Tapping a tile does not fly anything. The shelf falls into shadow and a story card rises from
the bottom of the screen with the tapped book already on its cover; the title, meta and
buttons follow in turn. Closing it, the card sinks and the shadow lifts. The books on the shelf
are drawn as books (`components/stories/catalogue/book-frame.tsx`): a spine down the left, the
block of pages along the right, square corners against the spine and rounded at the fore-edge.

| From | What happens |
|---|---|
| 0ms | The shadow settles over the shelf (320ms) and the card rises into place (420ms). |
| 60ms / 120ms | Title, meta and chips, then the buttons, fade up in turn. |

The card (`constants/story-card.ts`) is anchored to the bottom safe area, the screen width
less a margin on a phone and capped at 520pt on a tablet, so a tablet gets a card too rather
than a page. Its body is a fixed height so the cover's position is known before the card
exists; larger type scrolls within the body, and on a short screen the cover gives up height
to stay clear of the status bar.

The carousel snaps one card at a time. The chosen card stands proud; the others sit back
lower, a little smaller and in shadow, following the finger continuously as the shelf is
swiped (`CARD_REST`). Settling on another book makes it the selected story.

Choosing a way to read -- Read Together, Play Along, Record -- is where the book animation
begins. The transition's own book has been waiting, hidden, on the very rect the card's cover
occupies; the card fades, the book is revealed there, and it is carried onwards: to the rotate
prompt on a phone held upright, straight into the opening otherwise.

## Orientation, by device

| | Phone | Tablet (iOS and Android) |
|---|---|---|
| Outside the reader | Locked portrait | Unlocked |
| Asked to turn before a story | Yes, when upright | Never |
| Turned by the app | Yes, behind the veil | Never |
| Held sideways mid-story | Stays landscape | Follows the child |
| On the way out | Portrait lock handed back | Nothing to give back |

`needsGuidedTurn` in `constants/story-opening.ts` is the single answer to "does this
device need the ritual". `applyDefaultOrientation` in `hooks/use-story-orientation.ts` is
the single answer to "what should this device be when no story is open". Anything that
locks orientation goes through one of those two, so a tablet is never locked anywhere.

## Rules

- **The reader mounts hidden.** The layout applies `readerRevealStyle` from the transition
  context to the reader's wrapper. The reader is mounted at the start of the hold so its cost
  overlaps the breath and the grow, and it is only revealed by the dissolve. Without this, the
  reader (which sits above the overlay) appeared the instant it had rendered and cut the grow
  short on any fast device.
- **The book never leaves the centre while the screen turns.** The prompt parks the book in the
  very seat the opening uses -- the exact centre of the screen (`seatTransform`) -- and the
  moment the window changes size mid-prompt the seat is recomputed for the new screen and
  applied at once, without animating. iOS turns the interface about the screen centre and
  blends the old layout into the new; with the book at the centre of both, it simply stays
  where it is while the screen turns around it. Filmed: within 2px of centre in every frame,
  the mid-rotation frame included.
- **A placement belongs to the screen that produced it** (`placementIsStale`). The offsets that
  centred the book on one screen point somewhere else on another, so if the screen has changed
  shape since the book was placed it is seated outright rather than glided from a position it
  never really occupied.
- **The turn is acted on only once the system has finished making it** (`TURN_SETTLE_MS`).
  iOS reports the new window size as it *starts* animating the interface round, not when it
  lands. Opening on that first report ran the whole book-opening on top of the system's own
  rotation and the two transforms compounded, giving a skewed, displaced book. The turn is now
  claimed immediately but acted on only after the window has held one size for 320ms.
- **The phone is unlocked while it is being asked to turn** (`allowTurnForPrompt`). Without
  this the prompt was deaf to the very thing it asked for: iOS held the interface in portrait,
  so nothing about turning the phone reached the app except raw accelerometer gravity, which a
  simulator never provides and which reads nothing at all from a device lying flat. Now iOS
  turns the interface, the screen visibly follows the child, and the dimension change opens the
  book. The portrait lock comes back on the way out of the prompt.
- **Only phones are asked to turn** (`needsGuidedTurn`). A phone is locked to portrait
  everywhere outside the reader, so its interface cannot follow the device: the pair have to be
  asked, and then the screen is turned for them behind the veil. The book goes into the veil and
  comes back out of it; it never jumps between positions.
- **Tablets are never asked, and never have their orientation taken away.** They are unlocked on
  both iOS and Android, so a child turns them whenever they like and the interface follows. A
  tablet goes straight from settle to cover lift and the book opens whichever way it is being
  held, portrait included. Nothing calls `lockAsync` on a tablet, so nothing has to be given back
  on the way out.
- **Eases decelerate into rest.** Motion that ends in a resting state (re-enter, grow, dissolve)
  uses `Easing.out`; the cover, which is pushed and then caught, uses `Easing.inOut(quad)` --
  cubic left the last third of the lift visually dead, which read as a pause before the hold.
- **The turn hides in navy.** The root view behind every React view is the same night navy as
  the veil (`backgroundColor` in `app.config.js`, and `expo-system-ui` at launch for dev
  clients), so the corners iOS reveals while it turns the screen are navy on navy, not black.
- **The page never moves while the cover opens.** The book opens from a centred seat at 46% of
  the screen width (`openingSeat`). The cover swings on its spine and, once past a right angle,
  dissolves as it swings clear, so what is left on screen is the page, exactly where the book was.
- **Closing is the same book in reverse.** The exit animation drives the same shared values
  (`pageFlipProgress`, `bookExpansion`) backwards, so the shading reads correctly both ways.
