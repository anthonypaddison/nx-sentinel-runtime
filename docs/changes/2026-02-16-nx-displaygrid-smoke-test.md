# 2026-02-16 nx-displaygrid smoke test checklist

## Scope
- Validate wizard/setup persistence, source CRUD persistence, empty-array merge behaviour, and dashboard reset across WS/local/IDB paths.

## Preconditions
- Open Home Assistant as an admin user.
- Open browser dev tools (Console + Application storage).
- Use a test dashboard/device profile if possible.

## Steps
1. First-load wizard gate
- Action: Open the `nx-displaygrid` dashboard with no stored config (or after Reset dashboard).
- Expected: `fb-setup-view` wizard renders immediately; no dummy calendars/people/todos appear as saved config.

2. Step 1 people validation
- Action: Try `Save & Continue` with zero people.
- Expected: Validation error blocks progress.
- Action: Add one person with a non-empty name and continue.
- Expected: Step persists and moves to Step 2.

3. Step 2 calendars CRUD
- Action: Add a calendar row and pick a `calendar.*` entity; continue.
- Expected: Step persists and moves to Step 3.
- Action: Go back, delete the calendar row, continue again.
- Expected: Persist succeeds with empty calendars array.

4. Step 3 integrations guidance
- Action: Verify guidance text shows Google Calendar/Todoist prerequisites and detected entity pickers for `calendar.*` and `todo.*`.
- Expected: User can skip this step.

5. Step 4 review + finish
- Action: Click Finish.
- Expected: Success toast; onboarding completes.

6. Hard refresh persistence
- Action: Hard refresh browser (`Cmd/Ctrl+Shift+R`) and reopen dashboard.
- Expected: Wizard does not show when onboarding complete and people exists; saved config remains.

7. Manage Sources add/delete persistence
- Action: Open Manage Sources, add a calendar, save, refresh.
- Expected: Added calendar remains.
- Action: Delete that calendar, save, refresh.
- Expected: Deleted calendar stays deleted.

8. Empty-array persistence regression
- Action: In Manage Sources, remove all people, calendars, and todos; save.
- Expected: Save succeeds.
- Action: Refresh dashboard.
- Expected: Arrays remain empty (no reappearance from defaults).

9. Reset dashboard action
- Action: Settings -> Reset dashboard -> confirm both prompts.
- Expected: Success toast (or warning toast if backend unavailable), card returns to wizard.

10. Storage verification
- Action: In Application tab, verify localStorage keys are removed then recreated as empty config after reset/save:
  - `nx-displaygrid:config:<userId>:<device>`
  - `nx-displaygrid:prefs:<userId>:<device>`
  - `nx-displaygrid:data:<userId>:<device>`
- Action: Verify IndexedDB DB `nx-displaygrid` stores `config`, `prefs`, `cache` no longer contain stale pre-reset entries.

11. WS path verification
- Action: Watch HA WS traffic while saving/resetting.
- Expected: `family_board/config/set` and `family_board/config/get` are attempted first; fallback to `nx_displaygrid/config/*` only if needed.
