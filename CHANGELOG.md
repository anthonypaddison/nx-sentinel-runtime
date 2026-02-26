# Changelog

## 2026-02-26

- Improved Food view layout on smaller screens by widening/reflowing weekly meal-plan rows and consolidating per-day actions into a responsive action group.
- Added a dedicated `Favourites` tab in Food with a top toggle for:
  - favourite meals (average rating >= 3 stars),
  - favourite shopping items (starred shopping entries).
- Split Food concerns so shopping list management and favourites are separated, and moved saved shopping-list bundles into the Shopping tab context.
- Updated topbar person chips (schedule/chores/important contexts) to:
  - fixed 4-up equal-width layout,
  - stacked counts under names,
  - ellipsis clipping for long names to prevent chip distortion.
- Added mobile-specific person-chip mode: circular chips showing first-letter initials while preserving active-toggle colour highlighting.
- Updated mobile person-chip initials to disambiguate duplicates (e.g. use two-letter badges when first initials collide).
- Aligned shopping star state so only explicitly starred items render as starred (common/history items no longer appear starred unless starred).
- Removed the embedded `Favourites` side panel from Food `Shopping List` (it now shows only the shopping list there); favourites remain in the dedicated `Favourites` tab and standalone `Shopping` screen.
- Removed per-person event/chore counts from topbar people chips and left-aligned chip names for a cleaner layout.
- Updated Food `Favourites -> Favourite shopping` to use the same combined shopping quick-add list (`favourites + common`) that was previously visible in the Shopping tab side panel.
- Restyled Food `Favourites -> Favourite shopping` rows to match the previous shopping-favourites look (pill rows, inline plus marker, and star icon state) instead of plain text-action rows.
- Added `deploy/rsync-restart-logcheck.sh` to run staged rsync, HA restart, 5-minute wait, and remote log fetch/scan from a single terminal command.
- Bumped Lovelace resource cache-bust query string to `/local/nx-displaygrid/nx-displaygrid.js?v=20260226-120816`.

## 2026-02-25

- Follow-up `NX - Family Dashboard` polish:
  - Family mode no longer exposes standalone `Admin`/`Audit` navigation entries; admin/audit are now surfaced as tab panels inside `Settings`.
  - Family/Ambient navigation tiles now route directly to `Schedule`, `Chores`, `Shopping`, and `Home` (house mode) screens.
  - Ambient bin row no longer wraps icon in a circle and avoids duplicated `Bin day` label text.
  - Ambient `Heating`, `Lighting`, and `Screensaver` controls are rendered as a three-button equal-width bottom action row.
  - Food view removed the `In the house` tab and added recipe-builder `+` flows for ingredients and cooking steps with default `quantity` unit.
  - Added meal-plan driven cooking sessions: `Begin cooking` starts a temporary `Cooking` tab with step checkboxes and `Finish cooking` hides the tab again.
  - Added two-step destructive confirmation flow for shopping favourites reset/clear actions, with the second-step button order intentionally changed.
  - Strengthened month-view today-events scrolling behavior by forcing the events list to use a flexed vertical scroller.
- Added calendar-create success toast (`Event saved`) in add-event flows and kept date picker input full-width.
- Bumped Lovelace resource cache-bust query string to `/local/nx-displaygrid/nx-displaygrid.js?v=20260225-235900`.

- Added a new Lovelace sidebar dashboard entry `NX - Family Dashboard` backed by `config/lovelace/nx-family-dashboard.yaml`.
- Added family-mode navigation constraints for that dashboard: sidebar now prioritizes Calendar, Chores, Food, Family Dashboard, and Ambient, with admin items gated to admins and configurable via Settings.
- Reworked Ambient view for family mode with:
  - Bin-day single-line status messaging (including put-out-day context),
  - Home-control collection buttons (`Heating`, `Lighting`) that open toggle modals,
  - A focus/landscape ambient mode (hides topbar/sidebar, exits on double tap/double click),
  - Important todo countdown rows.
- Expanded Food workflows to include meal search, a dedicated Recipes tab, editable ingredients/instructions, per-user 1-5 star ratings, add-single-ingredient, add-full-recipe, and a pre-add selection modal when pushing meal items to shopping.
- Updated shopping merge behavior to consolidate same-name items across differing quantity notations and sum quantities with unit-aware normalization where possible.
- Added configurable food quantity units in Settings (`food_v2.units`) and retained compatibility with existing food data.
- Added all-day event creation support in add-event dialogs and replaced fragile date/time input handling with Safari/Chrome-safe date/time picker rows.
- Fixed month-view “today events” list scrolling with an internal scroll container.
- Bumped Lovelace resource cache-bust query string to `/local/nx-displaygrid/nx-displaygrid.js?v=20260225-214500`.

## 2026-02-24

- Hardened `nx_displaygrid` websocket config writes with HA admin-only access checks and payload validation/size limits.
- Hardened `nx-displaygrid` admin PIN handling by hashing stored values, migrating legacy plaintext on successful unlock, and omitting PINs from YAML exports by default.
- Added a service-version inventory audit script and runbook for comparing HA/media services against official stable release channels.
- Deduplicated shared `nx-displaygrid` Lovelace card config blocks across the v1/v2 dashboards using reusable YAML include fragments.
- Centralized `nx-sentinel-watchtower` alert notifier service usage behind a script helper to reduce notify-service drift across automations.
- Fixed Lovelace YAML compatibility by inlining dashboard layout tuning keys instead of using a merge-key `<<: !include` pattern rejected by Home Assistant's YAML loader.
- Fixed a `settings.view.js` template-string syntax error in V2 Settings and bumped the Lovelace resource cache-bust version so browsers load the corrected frontend code.
- Fixed V2 sidebar navigation being immediately overridden back to the adaptive/recommended screen after manual menu clicks by honoring a short manual-navigation lock even during forced adaptive ticks, and added a regression test.
- Fixed a follow-up V2 sidebar bounce case where periodic forced adaptive refresh ticks could still override manual navigation after a few seconds, by honoring the full adaptive idle timeout before any auto-screen switch.
- Fixed current `yamllint` line-length errors in `home_infra` disk-alert templates/messages with YAML-safe wrapping/text tweaks (no logic changes).
- Removed `home_infra` queue-stuck automation YAML merge-key overrides that produced duplicate-key warnings in HA logs, using explicit automation blocks for clean startup parsing.
- Hardened `disk_free.sh` SSH host-key handling by pinning SSH to a persisted `/config/ssh/known_hosts` file (and ignoring global known-hosts state), reducing breakage from container/root SSH state drift.
- Reworked `home_infra` TCP port checks to send a lightweight HTTP `HEAD` probe with an explicit response match, eliminating repeated timeouts caused by sending an empty payload to HTTP services.
- Updated the V2 sidebar to avoid internal scrolling by collapsing overflowed items into a bottom burger menu that reveals hidden navigation entries.
- Updated the V2 sidebar overflow burger menu to close when clicking outside the sidebar/menu area.
- Fixed the V2 sidebar overflow burger-menu item icon/text contrast so menu entries remain visible against the menu background.
- Fixed the V2 sidebar overflow burger menu popup positioning so it opens on-screen to the right of the collapsed sidebar instead of rendering off the left viewport edge.

## 2026-02-23

- Added deploy-time backup/export tooling for Home Assistant runtime config and `nx-displaygrid` setup snapshots.
- Enabled configurable pre-deploy backups by default in deploy scripts to harden rollbacks during schema/data changes.
- Added a local `scripts/check.sh` workflow wrapper for tests and optional lint/config checks.
- Removed stale legacy CI/tooling config files and simplified ESLint config to match the current repo.
- Cleaned documentation drift (README, contributing guide, release checklist, architecture notes, and AGENTS.md duplicates).
- Expanded `config/secrets.yaml.template` to include currently referenced secret keys.
- Deduplicated frontend scoped storage key/migration/local JSON helpers across prefs/persistence/refresh modules.
- Centralized `nx-displaygrid` websocket command names in frontend/backend constants and added protocol stability tests.
- Began tracking the `nx_displaygrid` custom component backend in-repo for reproducible deployments (excluding Python cache files).
- Deduplicated repeated Lit `repeat` fallback lambdas across views and shared timed-event sorting logic for schedule layout.
- Hardened Home Controls validation/add flow to reject hidden or non-controllable entities before persisting config.
- Centralized runtime `nx-displaygrid` default card values to reduce drift across stub config, setup, settings fallbacks, and YAML export helpers.
- Reduced retry timer duplication in the refresh pipeline by extracting shared retry schedule/clear helpers for calendar/todo/shopping refresh paths.
- Reduced `settings.view.js` render-method complexity by extracting shared render-state helpers and static options into file-local helpers/constants.
- Consolidated duplicated `nx-displaygrid` YAML export/clipboard serialization into a shared utility with tests to keep editor/manage-sources outputs aligned.
- Added refresh retry/queue characterization tests to lock retry timer caps, flags, and pending-refresh behavior before deeper refresh simplification.
- Continued `settings.view.js` decomposition by extracting admin-locked and footer dialog rendering into class helpers without changing settings behavior.
- Added shared source-validation utility helpers (`configHasSources`, `configHasSourceData`) and reused them in startup checks/manage-sources code paths.
- Added a restore runbook (`docs/RESTORE.md`) for full `/config` rollbacks vs focused `nx-displaygrid` restores using the new backup/export scripts.
- Further reduced `settings.view.js` render complexity by extracting the Preferences debug/cache-status subsection and added tests for Home Controls entity eligibility checks.
- Added a separate `nx-displaygrid-v2` YAML dashboard entry/file that mirrors the current dashboard config while enabling isolated V2 feature flags.
- Added V2-only `Important` view shopping-count header and Chores metadata badges (priority/labels/subtasks/comments/recurring when available).
- Added V2-only date-context persistence (schedule/month offsets) and broader Home Controls eligibility using HA service-registry checks.
- Bumped Lovelace resource cache-bust query string after V2/frontend JS changes.
- Added a V2 `Food` view (weekly menu + in-house pantry/fridge inventory) with saved shopping lists and meal-to-shopping helpers.
- Added V2 extended event details in the event dialog (location/description) with calendar update support for those fields.
- Added a V2 Settings person wizard UI for add/edit flows with step navigation, cancel, and confirm.
- Added V2 `Intent` and `Ambient` views, including adaptive action prioritization based on time/house mode/recent board state.
- Added Phase 2 V2 adaptive presentation: explicit house-mode scaffolding, dynamic theme switching, and automatic screen recommendations/switching (time/occupancy/events/error aware).
- Added Phase 3 V2 timed reminder banners with countdown/optional sound and Settings reminder management/test-sound actions.
- Added Phase 3 V2 state-aware phone notification policy scaffolding (severity thresholds, context/reasons, and dashboard-visibility suppression).
- Added V2 `Family` and `Admin` dashboards as dedicated views (family daily-summary/actions surface and admin operations/health/recovery surface).
- Added V2 Admin backup freshness/status support (configurable backup timestamp entity, stale threshold warning, and manual `Snapshot now` service action).
- Added V2 house health/drift status lists (lights left on, windows open, heating conflicts, unreachable devices) for Admin/Family dashboards with configurable watch lists.
- Added V2 presence-confidence scaffolding (confidence entity + threshold) to drive adaptive theme/screen behavior, Intent UI cues, and notification gating for uncertain presence states.
- Added V2 audit/explainability foundation with local timeline storage plus event capture hooks (errors, notification suppression/sends, mode changes, reminders, sync/admin maintenance actions).
- Added V2 admin-only `Audit` timeline dashboard view with filters, local summary rollups, and timeline event browsing/clearing.

## 2026-02-19

- Fixed Home Controls tile overlap by switching to an auto-fit responsive grid and adding shrink-safe tile sizing so controls do not collide across viewport widths.
- Hardened Home Controls tile containment (`position: relative`, `overflow: hidden`, shrink-safe content column) to prevent visual stacking from overflowing inner content.
- Removed the legacy Settings "People wizard" path to avoid conflicting onboarding UX and keep people/source setup in the first-run wizard.
- Bumped Lovelace resource version for `/local/nx-displaygrid/nx-displaygrid.js` to force frontend cache refresh.
- Added a non-destructive Settings action to open the first-run setup wizard on demand, without requiring dashboard reset.
- Updated onboarding wizard Step 1 colour selection to named options with existing selections prepopulated.
- Restricted onboarding calendar/todo selectors to Google Calendar and Todoist entities, while preserving existing selected mappings in edit mode.
- Added wizard cancel for edit mode and prevented mid-wizard partial saves from overwriting existing completed setups.
- Improved mobile navigation usability by adding screen navigation actions to the topbar overflow menu (Schedule/Important/Chores/Shopping/Home/Settings).

## 2026-02-16

- Renamed the Home Assistant dashboard/custom card surface from `family-board` to `nx-displaygrid` across Lovelace config, resources, card type, and frontend assets.
- Fixed Home Infra package schema issues that caused `tcp.binary_sensor`, `rest.sensor`, and `command_line` setup failures.
- Renamed Home Infra sensor and automation naming to `nx-sentinel-watchtower` with service checks aligned to container naming conventions.
- Hardened YAML serialization escaping, date parsing validation, and dialog draft hydration/reset behavior.
- Added broader regression tests for service parsing, calendar normalization, discovery mapping, YAML escaping, and utility behavior.
- Fixed config merge persistence to honour explicit empty `people`, `calendars`, `todos`, and `home_controls` arrays.
- Added persistence merge regression tests to lock behaviour for empty-array overrides and missing-key fallback.
- Replaced first-load setup with a 4-step wizard (People, Calendars, Integrations, Review) including step save/continue and finish flow.
- Added onboarding gating flags (`onboardingComplete`, `schemaVersion`) to persisted shared config and used them to decide setup visibility.
- Added a destructive Settings action `Reset dashboard` that clears local config/prefs/cache keys, resets stored dashboard config, and returns users to onboarding.
- Hardened websocket persistence calls to prefer the implemented backend namespace (`family_board/config/*`) before compatibility fallback (`nx_displaygrid/config/*`) to reduce silent first-attempt failures.
- Reduced websocket config noise by removing duplicate GET retries during config load and showing a one-time fallback toast when backend config endpoints are unavailable.
- Switched config/prefs/data persistence keys to user-scoped storage with one-time migration from legacy device-scoped keys and reset cleanup for both key formats.
