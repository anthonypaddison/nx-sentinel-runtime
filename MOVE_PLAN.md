# MOVE_PLAN

Goal: split into two repos while keeping `/local/family-board/family-board.js` stable.

## From → To

| From (current) | To (repo) | To (path) | Why |
|---|---|---|---|
| `config/www/family-board/` | `family-board-card` | `config/www/family-board/` | Card source and resources |
| `docs/` | `family-board-card` | `docs/` | Card documentation |
| `tests/` | `family-board-card` | `tests/` | Card tests |
| `README.md` | `family-board-card` | `README.md` | Card readme |
| `CONCEPT.md` | `family-board-card` | `CONCEPT.md` | Card spec |
| `LICENSE` | `family-board-card` | `LICENSE` | Card license |
| `config/` (minus `config/www/family-board/`) | `nx-sentinel-config` | `config/` | Home Assistant config |
| `config/includes/` | `nx-sentinel-config` | `config/includes/` | HA includes |
| `config/packages/` | `nx-sentinel-config` | `config/packages/` | HA packages |
| `config/scripts/` | `nx-sentinel-config` | `config/scripts/` | HA scripts |
| `config/lovelace/` | `nx-sentinel-config` | `config/lovelace/` | Lovelace dashboards |
| `config/configuration.yaml` | `nx-sentinel-config` | `config/configuration.yaml` | HA config entrypoint |
| `config/secrets.yaml.template` | `nx-sentinel-config` | `config/secrets.yaml.template` | Secrets template |

## Checklist (keep /local/family-board/family-board.js working)

- [ ] Ensure the card repo builds or ships `family-board.js` in `config/www/family-board/`.
- [ ] In the HA config repo, keep `config/www/family-board/` present via:
  - [ ] Submodule, or
  - [ ] Release download of built assets into that folder.
- [ ] Lovelace resource stays `/local/family-board/family-board.js`.
- [ ] `type: custom:family-board` remains unchanged in dashboards.
- [ ] Restart HA after updating the resource file.
- [ ] Hard refresh browser to clear cached JS.
