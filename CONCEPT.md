# Family Calendar

Home Assistant Custom Dashboard (SPA Card)

## 1. Overview

A single-page application custom card embedded in Home Assistant via dashboard YAML.

Purpose:
- One shared household dashboard.
- Fixed layout, predictable behaviour.
- Optimised for wall display (primary) and mobile (secondary).
- Instant user feedback on all actions.

Scope is strictly limited to:
- Calendar.
- Important.
- Chores (Todoist).
- Shopping.
- Bins (Collections).
- Home (HA entities).
- Settings.

No additional integrations or views are permitted.

## 2. Architecture

### 2.1 App Model
- Single-page app.
- No routes.
- View switching via internal state only.

### 2.2 State Storage
Primary: Home Assistant persistent storage (where supported).

Secondary: localStorage (device-specific UI state).

Precedence:
1. In-memory (current session).
2. HA persistent state.
3. localStorage.
4. Defaults.

Last view persists per device.

### 2.3 Settings Scope
- All settings are per device.
- Person definitions are shared household state.

### 2.4 Offline Behaviour
- Cached rendering allowed where possible.
- Offline mode is a best-effort optimisation, not a guarantee.

## 3. Data Sync & Reliability

### 3.1 Interaction Model (Non-Negotiable)
- Optimistic UI updates.
- Immediate backend call.
- Fast reconciliation.
- No silent failures.

### 3.2 Failure Handling
If backend operation fails:
- UI state is reverted.
- Toast/snackbar is shown.
- Action is not silently discarded.

This applies to:
- Calendar events.
- Todo items.
- Shopping items.
- Edits, completions, deletions.

## 4. Layout (Always Visible Elements)

### 4.1 Sidebar
- Left-aligned.
- Fixed height.
- Icons only (always collapsed).
- Settings is the last nav item.

Menu items:
- Calendar.
- Important.
- Chores.
- Shopping.
- Home.
- Settings.

### 4.2 Header
Row 1:
- Left: Current time.
- Centre: View toggle (Schedule / Month).
- Right: Date control.
  - Left arrow.
  - Today.
  - Right arrow.
  - Add button (plus icon).
  - 3-dot menu (Sync option).

Row 2:
- Left / centre: People chips.
- Right: People chip wrap.

Sync button:
- Clears cached data.
- Re-fetches full active date range.
- Forced refresh of events, todos, and shopping.

Bin indicator:
- If a bin is due today or tomorrow, show its icon next to the time.

### 4.3 People Chips
- Max visible: 8.
- Max per row: 4.

If more people exist:
- Admin selects which are shown.
- Order is defined in Settings.

Chip content:
- Name.
- Role badge (kid / grownup).
- Calendar icon + count of today’s events.
- Todo icon + count of incomplete todos (incl. overdue).

Filtering:
- People chips filter all views.
- Toggle on/off is instant.

Counts:
- All-day events included.
- Multi-day events counted once.
- Todos include assigned + shared.
- Overdue included.

### 4.4 Add Button
- Located in the header next to Sync.
- Always visible.

Behaviour by view:
- Calendar -> create event (confirm required).
- Chores -> create todo (confirm required).
- Shopping -> create item (confirm required).
- Home -> add HA control (admin only).

Add modal includes a selector to switch between Event, Chore, Shopping, Home Control.

## 5. Views

### 5.1 Calendar View

Schedule View:
- 5-day rolling window.
- Default hours: 06:00–24:00.
- Time scale configurable in Settings.
- All-day events shown in top row.
- If more than one all-day event, show first title + “+N”.
- Click all-day row to open full list modal.
- All-day gutter is blank (no label).
- Day headers:
  - Per-person event pips for the day (same row as day label, right aligned).
  - Shows that events exist outside the visible scroll range.
- Overlapping events:
  - Side-by-side.
  - Max 2 visible.
  - “+n” indicator for overflow.
- Event cards:
  - Title/time anchored at top of the block.
  - Always visible while the event is in view.
- Now line:
  - Shows current event title if exactly one is active.
  - If multiple are active, shows “N events now”.
  - Visible across all day columns (grey), current day is thicker red.
- Persistence:
  - Selected date range persists across reloads.

Month View:
- Standard month grid.
- Each date shows colour pips per person.
- Only shown for people with events.

Interaction:
- Tap date -> switches to Schedule view.
- Focuses that specific day.

### 5.2 Important View
Layout:
- Two columns.
- Column 1: Today.
- Column 2: Tomorrow.

Content:
- Events list per column.
- Todo list per column (due date required).

Header:
- Shopping list count with shopping icon.

Filters:
- People chips filter Important content.

### 5.3 Chores View (Todoist)
Display:
- One list per visible person.
- Hidden when person chip is toggled off.

Supported Todoist features:
- Title.
- Description.
- Due date.
- Recurring.
- Subtasks.
- Comments.
- Priorities (configurable).
- Labels (configurable).

Multi-assigned tasks:
- Appear in all relevant lists.

Completion:
- Immediate strikethrough.
- Cleared on refresh or manual clear.

Repeat:
- Optional repeat cadence (daily, weekly, biweekly, monthly).
- Requires due date.

### 5.4 Shopping View
- Single shared household list.
- No due dates.
- No subtasks.

Features:
- Quantity support.
- Instant completion.
- Auto-clear 10 seconds after completion.
- Reverted if backend fails.

### 5.5 Home View
Controls:
- Admin-selected HA entities.

Displayed as:
- Label.
- Binary toggle only.

Entity rules:
- All HA entity types allowed.
- Non-binary entities exposed as on/off only.
- Admin users can add/remove controls.

### 5.6 Settings View (Admin Only)
Visibility:
- Admin users or PIN-unlocked devices only.

Admin detection:
- HA user role (preferred).
- Fallback: admin unlock protected by PIN.

Layout:
- Two columns, full-height, independently scrollable.

Left column:
- Sources (calendars, todos, people, shopping entity).
- People order (drag list, two rows).
- Admin access (PIN).
- Home controls.
- Shopping favourites.

Right column:
- Preferences (refresh interval, visible hours, time slots, default duration, defaults).
- Theme selection (currently Bright Light).
- Reset all defaults (double confirmation).

Rules:
- Calendar and Todo entity selectors only show existing entities.
- Each person must be linked to at least one calendar or todo list.
- Accent colours are controlled by the selected theme.

Bin collections:
- Up to 10 bins.
- Each bin has name, colour, mdi icon, enabled flag.
- Schedule types:
  - Simple repeat:
    - Per-bin weekday.
    - Every N weeks.
    - Anchor date (last collection).
  - Rotation:
    - One fixed weekday.
    - One anchor date (week 1).
    - Sequence of weeks with one or more bins per week.

## 6. Styling & UI Rules
- Follow supplied Light Mode Style Guide.
- No new colours without explicit declaration.
- No layout shift between days.
- No colour-only meaning.
- Touch targets ≥ 56 × 56 px.

## 7. Errors & Feedback
Default error surface:
- Toast/snackbar.

Rules:
- No silent failures.
- No blocking modals except destructive admin actions.
- Errors must be readable on wall display.

## 8. Constraints
- Max people: 8.

Target screens:
- Primary: 42″ TV.
- Minimum: iPhone.

- No new integrations.
- No scope expansion without spec update.

## 9. Definition of Done
- Same layout every day.
- Instant feedback on all actions.
- Failures are visible and reversible.
- Readable from across the room.
- Calm, predictable, boring (in a good way).

## 10. Open Source Intent & Support Commitment

### 10.1 Open Source Positioning
This project is intended to be open source.

- Source code will be public.
- Contributions are welcome.
- Transparency is a goal, not an afterthought.

However:
- Open source does not mean unstable.
- Open source does not mean “best effort”.
- Open source does not excuse poor support or broken releases.
- The project must be treated as a maintained product, not a personal experiment.

### 10.2 Release Readiness Criteria
A feature is considered “released” only when:
- It complies fully with this specification.
- It has defined behaviour.
- It has defined failure handling.
- It has defined UI rules.
- It does not break existing behaviour.
- It works without undocumented setup steps.

Incomplete or partially implemented features must remain:
- Hidden behind flags, or
- Explicitly marked as experimental.

### 10.3 Backwards Compatibility
Once released:
- Breaking changes must be avoided.
- If unavoidable, they must be:
  - Clearly documented.
  - Versioned.
  - Called out in release notes.
  - User configuration and data must not be silently invalidated.

### 10.4 Support Expectations
Once publicly released, the project must provide baseline support, even if run by a small team or a single maintainer.

At minimum:
- Clear README.
- Setup and configuration documentation.
- Known limitations documented.

Issue templates for:
- Bugs.
- Feature requests.

Bugs that cause:
- Data loss.
- Silent failure.
- Incorrect display of family data.

Are considered priority defects.

### 10.5 Scope Control (Critical)
To protect maintainability:
- New integrations are out of scope.

Feature requests that add:
- Complexity.
- Cognitive load.
- Inconsistent UI patterns.

Should be rejected by default.

This dashboard prioritises:
- Clarity.
- Predictability.
- Household reliability.

Over flexibility or extensibility.

### 10.6 Maintainer Rule
If a feature cannot realistically be:
- Documented.
- Supported.
- Debugged.

It should not be merged, regardless of how useful it seems.

Long-term stability beats short-term cleverness.
