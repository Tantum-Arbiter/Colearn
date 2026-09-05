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
| Cover lift | 480ms | 480ms | The cover swings open on its spine and stays open. The page beneath sits in its shadow, brightening as the cover clears; the cover's face darkens as it turns from the light. |
| Hold | 140ms | 140ms | A breath with the first page showing. The live reader mounts now, hidden. |
| Grow | 520ms | 520ms | The open book grows until its left and right edges meet the sides of the screen, decelerating into place. |
| Dissolve | 200ms | 200ms | The live reader dissolves in over the grown book; then the overlay is torn down. |

Total: about 1.6s on a tablet, about 2.6s on a phone including the turn.

## Tile to card

Tapping a book does not fly anything, and the book stays on the shelf behind. The shelf falls
into shadow and a story card rises from the bottom of the screen with that book's cover across
its top; the title, meta and buttons follow in turn. Closing it, the card sinks and the shadow
lifts. The books on the shelf, and the one that opens, are drawn as books
(`components/stories/catalogue/book-frame.tsx`): landscape, a spine down the left, the block
of pages along the right, square corners against the spine and rounded at the fore-edge. There
are no play buttons; the book is the button.

| From | What happens |
|---|---|
| 0ms | The shadow settles over the shelf (320ms) and the card rises into place (420ms). |
| 60ms / 120ms | Title, meta and chips, then the buttons, fade up in turn. |

The card (`constants/story-card.ts`) is anchored to the bottom safe area, the screen width
less a margin on a phone and capped at 520pt on a tablet, so a tablet gets a card too rather
than a page. The margin is wide enough that the neighbouring cards plainly show either side --
what shows of each is the margin less the gap, 34pt -- because a swipe should be an invitation
the child can see, and at 16pt it was not. Its body is a fixed height, sized to what it holds
at the default type size -- on a phone, where four chips wrap to a second row, that is two rows
of chips and three buttons, Record a button like the other two rather than a footnote under a
rule -- so the cover's position is known before the card exists; larger type scrolls within the
body, and on a short screen the cover gives up height to stay clear of the status bar.

The carousel snaps one card at a time. The chosen card stands proud; the others sit back
lower, a little smaller and in shadow, following the finger continuously as the shelf is
swiped (`CARD_REST`). Settling on another book makes it the selected story.

Choosing a way to read -- Read Together, Play Along, Record -- is where the book animation
begins. The card sinks and the book is sketched at its seat, the centre of the screen: its
outline is drawn as a single line, the cover appears inside it, and the drawn line fades as
the cover's own edges take over. From there it opens -- via the rotate prompt on a phone held
upright, straight into the opening otherwise.

## Card to book

The sketch borrows the screen-time glance's trick of drawing a frame before filling it
(`components/home/screen-time-glance.tsx`). The line is a dash-offset sweep along one path
(`bookOutlinePath` in `constants/story-opening.ts`): the spine is drawn first, upward, on an
otherwise empty screen -- the one mark that says "book" rather than "card" -- and the pen then
runs clockwise round the cover and closes exactly where the spine began. The path is worked
out in screen coordinates from the seat the book will occupy, the radius the book keeps at any
scale, and the shelf spine scaled with it, so the line sits exactly on the cover's edge and the
handover is invisible. Timings live in `STORY_SKETCH` and `storySketchTimeline`.

| From | What happens |
|---|---|
| 0ms | The card sinks (280ms) and the shelf behind goes fully dark. |
| 280ms | The card is gone. The screen holds, empty, for a beat (`afterCardMs`). |
| 530ms | The outline draws itself on the clear screen (480ms). |
| 1010ms | The cover appears inside the outline (300ms). The book is seated outright; nothing glides. |
| 1160ms | The drawn line fades over the cover's own edge (240ms). |
| ~1.4s | On a phone, the rotate prompt's words and arrows fade up around the book. On a tablet, the opening's settle and cover lift begin. |

The pen waits for an empty screen rather than drawing over a sheet still on its way out. Filmed
on an iPad, the card's last sliver leaves at 230ms -- a touch before its 280ms exit nominally
ends, since it eases out fastest at the finish -- so the screen is actually clear for about
300ms before the first mark.

### Two things the drawing got wrong

Both were found by filming the iPad and measuring the frames, not by watching it.

**The pen lurched.** The draw ran on `Easing.inOut(Easing.cubic)`, copied from the glance's
border. That curve peaks at nearly three times its average pace, and over a draw this short one
frame put down 39% of the whole outline: the line crawled, leapt across the top and right edges
together, then glided to a halt. `STORY_SKETCH.drawCurve` holds within 19% of its average
instead, starting at four fifths of cruising pace rather than creeping into motion and settling
at a third rather than stopping dead. Measured again on the device, the line now advances by an
even 103--120 pixels a frame where it used to jump by 3,473.

**The line showed all at once, before it was drawn.** Twice. The path's dash offset defaults to
zero, which shows the whole outline, so a static offset was added to hide it until the animated
one arrived. That held until the outline's length came from a value captured in the provider's
render: the animated prop's *first* value is worked out before the outline exists, with the
length still zero -- an offset of zero, fully visible -- and an animated prop overrides the
static one. Filmed on an iPad, the whole outline stood over the card for three frames at the
tap, vanished, and was drawn 300ms later. The length now lives in a shared value set before the
phase changes, and the line's opacity is zero until the instant the draw starts, so no dash
state can show early whatever the first value is.

**The pen doubled back.** The spine used to be the last stroke, which sent the pen straight back
down a line one spine's width from the left edge it had just drawn, travelling the opposite way.
It read as a mistake. Drawing the spine first separates the two by the whole loop and gives the
closing stroke a point to land on.

The seat is the same point on both devices -- `seatTransform` for the prompt and `openingSeat`
for the lift both centre the book at 46% of the screen width -- which is what lets the book be
drawn in place rather than carried. With reduced motion on, nothing is drawn: the book is
simply there, and the prompt or the opening follows at once.

Going back from the prompt runs the handover the other way: the prompt's words fade, the book
scrolls off the bottom of the screen the way the card left (`sheetSinkMs`), and the card the
child chose from comes back in over it while it is still on its way out (`cardReturnsAt`).
The book used to glide back onto the card's cover and wait there to be covered, which read as
the book returning to a card that had not yet arrived.

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
- **The book never leaves the centre while the screen turns.** While it is being sketched and
  while the phone is being asked to turn, the book is not carried to its seat by a transform at
  all: it is `SeatedBook`, a view Yoga centres in the overlay, 46% of the screen wide with the
  card's proportions. iOS turns the interface about the screen centre and blends the old layout
  into the new, and a view Yoga centres in both stays at the centre through the blend. The
  transform-driven book cannot: its new layout is drawn with the old offset for the first
  frames, until the JS listener catches up, and filmed on an iPhone it jumped 240px away in the
  first frame of the turn and swung back over eight, landing 15pt off before gliding home --
  while a flex-centred probe square in the same frames sat half a pixel from the centre. The
  transform-driven book takes over at the opening, snapped to the seat the settled window
  gives, at the same size and place, so the swap is invisible. The block of page edges lives
  inside `SeatedBook`, which is why it floats with the cover.
- **A placement belongs to the screen that produced it.** The offsets that centred the book on
  one screen point somewhere else on another. The opening no longer glides the transform-driven
  book into its seat at all: the seat is worked out from the window as it is at that moment and
  snapped to, so there is no placement from an earlier screen to glide from. `placementIsStale`
  has no caller left in the app; it and its tests can go.
- **The turn is acted on only once the system has finished making it** (`TURN_SETTLE_MS`).
  iOS reports the new window size as it *starts* animating the interface round, not when it
  lands. Opening on that first report ran the whole book-opening on top of the system's own
  rotation and the two transforms compounded, giving a skewed, displaced book. The turn is now
  claimed immediately but acted on only after the window has held one size for 320ms -- on
  every path, including a screen that is *already* sideways when the prompt mounts. That case
  used to open at once; it is exactly what a phone turned while the book was still being drawn
  looks like, and it was still mid-turn. A phone turned during the draw is not shown the prompt
  at all (it is already sideways), but `carryOn` waits for the window to hold still
  (`waitForWindowToSettle`) before the opening begins.
- **The pages float with the book.** While the phone is being asked to turn, the book rises and
  falls (`levitationY`). The block of pages beside the cover used to be drawn by the prompt from
  the static `bookRect`, outside the book's own view, and sat dead still while the cover and
  spine bobbed -- which read as only part of the book floating. It is part of `SeatedBook` now.
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
  shows its back rather than its printed face (`coverFaceOpacity`) -- and then holds. It used to
  dissolve away over the last stretch of the lift, which left the page alone on screen before the
  grow had even started; the book now holds open and zooms in still wearing its cover.
- **The book grows to the width of the screen, not past it** (`openBookGrowScale`). The grow used
  to take the larger of the two ratios and carry on until the book covered the screen entirely,
  which meant cropping it: the top and bottom of the spread were pushed out of view while the
  child was still watching the book, before the reader had arrived to cover them. It now takes the
  smaller ratio, so the whole spread stays on screen; on a portrait tablet the width is what binds
  and the book lands spanning the view, night navy above and below, and only then does the reader
  dissolve in. Filmed: the grown book measures 834px across on an 834px screen.
- **Closing is the same book in reverse.** The exit animation drives the same shared values
  (`pageFlipProgress`, `bookExpansion`) backwards, so the shading reads correctly both ways.
