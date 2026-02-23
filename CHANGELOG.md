# Changelog

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
