# Release Checklist

1) Update the Lovelace resource cache buster in `config/configuration.yaml`.
2) Run `docs/SMOKE_TESTS.md`.
3) Verify calendar/todo entities still load without errors.
4) Confirm Settings save to WS storage (or local fallback).
5) Rebuild and publish the release notes (if needed).
