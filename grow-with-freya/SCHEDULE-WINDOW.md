# Schedule Window

How "Create My Schedule" works on the Screen Time dashboard, and what is left to do.

## Why

The schedule section used to be a heading, a paragraph of instructions and a flat
green `+ Create Custom Reminders` button. It described a chore rather than
offering anything, and pressing it replaced the whole dashboard with a different
screen — the parent lost the usage they had just been reading.

Two changes:

1. **A callout that earns the tap.** One card that leads with what the parent
   gets — a gentle nudge at the moments they choose — and reflects live state
   once reminders exist, rather than repeating the same instruction forever.
2. **A window, not a departure.** Reminders open as a sheet over the dashboard.
   The usage the parent was reading stays behind it, and closing returns them to
   exactly where they were.

## Shape

```
ScreenTimeScreen / ScreenTimeContent   (dashboard, unchanged behind the sheet)
  └── ScheduleCallout          value-forward card, opens the window
  └── ScheduleWindow           slide-up sheet, owns its own page state
        ├── CustomRemindersContent   list  ── onCreateNew ──▶ create
        └── CreateReminderContent    create ── onBack ──────▶ list
```

`ScheduleWindow` uses the `*Content` variants — the header-less ones the account
screen already renders — so the sheet supplies the single header for both pages.
The `*Screen` variants stay for any host that still wants a full page.

The animation language matches `screen-time-warning-modal.tsx`: 300ms slide from
the bottom on `Easing.out(Easing.cubic)`, a fading backdrop, light haptics on
open and close. The card language matches `usage-overview.tsx`: `CARD_BG`,
`CARD_BORDER`, radius 20, `Fonts.rounded`.

### Why it renders through `Modal`

`ScheduleWindow`'s root is React Native's `Modal` (`transparent`, own reanimated
slide inside it, `animationType="none"`), not a plain absolutely-positioned
`View`. The first version used a plain `View` with a high `zIndex`, which
worked in the standalone `ScreenTimeScreen` but rendered invisibly — the sheet's
own header, grabber and close button all present in the tree, none of them
visible — once opened from Account → Screen Time. `zIndex` in React Native only
orders siblings within the same stacking context; nested inside
`account-screen.tsx`'s `overlayPage` wrapper (`zIndex: 10`), no `zIndex` on the
sheet itself could out-rank `PageHeader`'s absolutely-positioned parts
(`zIndex: 20–30`), which live outside that wrapper entirely. `Modal` sidesteps
the whole question — it is its own native layer, immune to any host's stacking
context — and matches the precedent already in this codebase
(`components/home/screen-time-glance.tsx` wraps `ScreenTimeContent` in one for
exactly this reason). Caught by opening the window from Account → Screen Time
in the simulator, not by a test — see the testing note below for why.

Android's hardware back key is `Modal`'s own `onRequestClose`, not a manual
`BackHandler` listener — steps the sheet back a page before it reaches the
host, same as before, just via the platform-provided hook instead of a
hand-rolled one.

## State that has to survive

The reminders flow is not self-contained; it feeds the dashboard's save bar.

| Concern | Carried by |
|---|---|
| Unsaved-change detection | `onReminderChange` bumps `reminderChangeCounter`, which re-runs the `hasUnsavedChanges` effect |
| Discard on back | `reminderService.revertChanges()` from the dashboard's existing discard path |
| Commit / backend sync | The dashboard's save button, unchanged. Account screen's own exit-commit re-reads `reminderService.hasUnsavedChanges()` live rather than trusting the cached component state, and only syncs to the backend when `ApiClient.isAuthenticated()` |
| List refresh after create | `CreateReminderContent.onSuccess` returns to the list and bumps the counter |
| Visibility gating | `Modal`'s own `visible` prop — it does not mount `CustomRemindersContent` / `CreateReminderContent` at all while closed, so no separate `isActive` wiring is needed |

## Phases

All three are done.

- **Phase 1.** `ScheduleCallout`, `ScheduleWindow`, wired into the standalone
  `ScreenTimeScreen`. The `currentPage` page-swap is gone.
- **Phase 2.** `ScreenTimeContent` opens the same window. The account screen's
  `custom-reminders` / `create-reminder` slides, their shared values and
  animated styles, the header `+` action and the two back-handler branches are
  gone with them; `onNavigateToReminders` became `onReminderChange`, which is
  what keeps the account screen's auto-save-on-exit honest.
- **Phase 3.** Reduced motion places the sheet instead of sliding it; Android's
  back key steps through the sheet before it reaches the host; on a tablet the
  sheet stops at `contentMaxWidth` and sits centred.

`ScreenTimeTipsOverlay` was left alone deliberately: its steps are centred cards
rather than callouts anchored to a control, and the `custom_reminders` step's
copy still describes what the window does.

There is a third host: `components/home/screen-time-glance.tsx` renders
`ScreenTimeContent` inside its own `Modal` for the home screen's quick-glance
view. It never wired the old `onNavigateToReminders` prop, so before this
change the schedule section was invisible there entirely. It is unconditional
now, matching the other two hosts, and reaching it is no worse than the
pre-existing behaviour of that screen's own settings toggles — neither has a
save step of its own; both rely on whatever the parent does next (typically a
visit to Account → Screen Time) to actually persist. Nested `Modal`s are a
known-supported RN pattern and this one is exercised in the simulator without
issue.

## Testing note: `Modal` under this repo's Jest setup

React Native's real `Modal`, when `visible`, throws inside this repo's test
environment — deep in react-test-renderer's ref handling, unrelated to
anything `ScheduleWindow` does. `jest.mock('react-native', factory)` does not
fix it: registering it per-test-file silently loses to the suite-wide
`react-native` mock already in `jest.setup.js` (confirmed with a
`console.log` inside the factory that never fired). The fix that works is
direct mutation of the already-resolved module object:

```ts
import * as RN from 'react-native';
const RealModal = RN.Modal;
beforeAll(() => { (RN as any).Modal = MockModal; });
afterAll(() => { (RN as any).Modal = RealModal; });
```

Every test file that renders `ScheduleWindow` (`schedule-window.test.tsx`,
`screen-time-screen.test.tsx`) does this. `MockModal`'s own element still
carries whatever `testID` was passed to it even while `visible={false}` (the
prop belongs to the element, not to what it renders), so a `testID` query has
to exclude `MockModal`'s own fiber explicitly or "closed" will read as "found".

## What went with them

Four styles (`createScheduleButton`, `createScheduleButtonText`,
`scheduleIntro`, `scheduleIntroText`) and four translation keys across all
fourteen locales (`screenTime.createCustomReminders`, `screenTime.scheduleIntro`,
`screenTime.scheduleIntroShort`, `account.customReminders`) had nothing left
pointing at them once the flat button and the reminders slides were gone.

## Copy

Nine new keys in the `screenTime` block. The empty state sells; the active state
reports. Existing translated keys are reused rather than duplicated —
`createMySchedule` is the empty CTA, `customReminders` is the window title,
`reminders.createTitle` is the new-reminder action.

The three benefit chips are deliberately calm: they name what the parent gets,
not a streak or a score. Per the product principles, no gamification.
