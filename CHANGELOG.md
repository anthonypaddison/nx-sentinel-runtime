# Changelog

## 2026-02-16

- Renamed the Home Assistant dashboard/custom card surface from `family-board` to `nx-displaygrid` across Lovelace config, resources, card type, and frontend assets.
- Fixed Home Infra package schema issues that caused `tcp.binary_sensor`, `rest.sensor`, and `command_line` setup failures.
- Renamed Home Infra sensor and automation naming to `nx-sentinel-watchtower` with service checks aligned to container naming conventions.
- Hardened YAML serialization escaping, date parsing validation, and dialog draft hydration/reset behavior.
- Added broader regression tests for service parsing, calendar normalization, discovery mapping, YAML escaping, and utility behavior.
