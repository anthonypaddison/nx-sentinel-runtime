# Changelog

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
