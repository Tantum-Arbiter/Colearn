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

## State that has to survive

The reminders flow is not self-contained; it feeds the dashboard's save bar.

| Concern | Carried by |
|---|---|
| Unsaved-change detection | `onReminderChange` bumps `reminderChangeCounter`, which re-runs the `hasUnsavedChanges` effect |
| Discard on back | `reminderService.revertChanges()` from the dashboard's existing discard path |
| Commit / backend sync | The dashboard's save button, unchanged |
| List refresh after create | `CreateReminderContent.onSuccess` returns to the list and bumps the counter |
| Visibility gating | `isActive` on `CustomRemindersContent` — it only loads when shown, so it is passed `visible && page === 'list'` |

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
