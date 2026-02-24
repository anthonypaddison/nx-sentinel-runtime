# Changelog

## 2026-02-24

- Hardened `nx_displaygrid` websocket config writes with HA admin-only access checks and payload validation/size limits.
- Hardened `nx-displaygrid` admin PIN handling by hashing stored values, migrating legacy plaintext on successful unlock, and omitting PINs from YAML exports by default.
- Added a service-version inventory audit script and runbook for comparing HA/media services against official stable release channels.
- Deduplicated shared `nx-displaygrid` Lovelace card config blocks across the v1/v2 dashboards using reusable YAML include fragments.
- Centralized `nx-sentinel-watchtower` alert notifier service usage behind a script helper to reduce notify-service drift across automations.
- Fixed Lovelace YAML compatibility by inlining dashboard layout tuning keys instead of using a merge-key `<<: !include` pattern rejected by Home Assistant's YAML loader.
- Fixed a `settings.view.js` template-string syntax error in V2 Settings and bumped the Lovelace resource cache-bust version so browsers load the corrected frontend code.
- Fixed V2 sidebar navigation being immediately overridden back to the adaptive/recommended screen after manual menu clicks by honoring a short manual-navigation lock even during forced adaptive ticks, and added a regression test.

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
