# Contributing

## Quick start (under 60 minutes)
- Read `README.md` for repo purpose and deploy flow.
- Run `scripts/check.sh` for the local baseline.
- Review `docs/SMOKE_TESTS.md` before frontend/Lovelace changes.
- Make a small change, run checks again, and document it in `CHANGELOG.md` + `docs/changes/YYYY-MM-DD.md`.

## Formatting
- Follow existing style and indentation (4 spaces, no tabs).
- Prefer small, focused functions and modules.
- Avoid introducing non-ASCII unless the file already uses it.

## Validation workflow
- For JS/frontend changes: run `node --test tests/*.test.mjs` (or `scripts/check.sh`).
- For shell changes: run `shellcheck` if installed.
- For YAML changes: run `yamllint` if installed and perform a Home Assistant config check in the target environment.
- For Lovelace/frontend changes: follow `docs/SMOKE_TESTS.md`.

## Notes
- Keep UI strings in plain ASCII for reliability.
- Use the helper modules under `config/www/nx-displaygrid/` for new features.
- Prefer deletion of stale configs/docs over keeping misleading tooling around.
