# Release Checklist

1) Export/backup current runtime config before deploy (`deploy/export-nx-displaygrid-setup.sh` and/or `deploy/backup-remote-config.sh`).
   Restore guidance is documented in `docs/RESTORE.md`.
2) Update the Lovelace resource cache buster in `config/lovelace/resources.yaml`.
3) Run `docs/SMOKE_TESTS.md`.
4) Verify calendar/todo entities still load without errors.
5) Confirm Settings save to WS storage (or local fallback).
6) Rebuild and publish the release notes (if needed).
