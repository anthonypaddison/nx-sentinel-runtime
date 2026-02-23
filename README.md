# nx-sentinel-runtime

## Repo purpose
This repository is the single source of truth for Home Assistant runtime config across two environments:
- `lab`
- `live`

Everything under `config/` is managed here as YAML (dashboards, packages, includes, scripts), with environment overlays for differences between lab and live.

Guardrails:
- Never version `config/.storage/`.
- Never commit real secrets.
- Keep `config/secrets.yaml.template` in git.
- Keep nx-displaygrid paths stable (`/local/nx-displaygrid/...`) during migration.

## Lab vs Live workflow
Directory layout:
- `config/packages/common/` shared package YAML
- `config/packages/lab/` lab-only package YAML
- `config/packages/live/` live-only package YAML
- `config/packages/_env.yaml` environment selector include (`lab` or `live`)
- `config/packages/_packages.yaml` merges `common + selected env`
- `config/lovelace/nx-displaygrid.yaml` dashboard YAML
- `config/lovelace/resources.yaml` Lovelace resources YAML include

`configuration.yaml` keeps:
- `lovelace.resource_mode: yaml`
- `lovelace.resources: !include lovelace/resources.yaml`

Environment selection is controlled by `config/packages/_env.yaml` and is set by deploy scripts during staging.

## How to deploy
Prereqs:
- SSH access as `root` to both HA targets.
- External secrets files (outside git):
  - `~/.ha-secrets/secrets.lab.yaml`
  - `~/.ha-secrets/secrets.live.yaml`
- Set host IPs:
  - `LAB_IP`
  - `LIVE_IP`

Lab deploy:
```bash
LAB_IP=192.168.x.x deploy/deploy-lab.sh
```
Optional ref (branch/commit/tag):
```bash
LAB_IP=192.168.x.x deploy/deploy-lab.sh <ref>
```

Live deploy (restricted):
```bash
LIVE_IP=192.168.x.x deploy/deploy-live.sh
```
Optional ref:
```bash
LIVE_IP=192.168.x.x deploy/deploy-live.sh <ref>
```

Deploy behavior:
- Requires clean git tree.
- Updates submodules recursively only when `.gitmodules` exists.
- Stages config with env overlay (`lab` or `live`).
- Creates a pre-deploy backup snapshot by default under `backups/ha/` (ignored by git).
  - Disable with `BACKUP_BEFORE_DEPLOY=0`
  - Override destination with `HA_BACKUP_ROOT=/path/to/backups`
  - Include `secrets.yaml` only when explicitly needed: `HA_BACKUP_INCLUDE_SECRETS=1`
- `rsync --delete` to `root@<IP>:/config/` with safe excludes:
  - `.storage/`
  - HA DB files
  - log files
- Copies environment secrets file to `/config/secrets.yaml` on target.
- Restarts Home Assistant on target (`ha core restart` by default).
  Override with `HA_RESTART_CMD`, for example:
  - `HA_RESTART_CMD='docker restart homeassistant'`
- Prints commit and submodule hashes (submodule list may be empty when vendored).
- Prints restart options (HAOS and Docker command examples).

## Backup and export (recommended before schema/data changes)
Full remote `/config` snapshot (includes `.storage`, excludes DB/logs; excludes `secrets.yaml` by default):
```bash
deploy/backup-remote-config.sh 192.168.x.x lab
```

Focused `nx-displaygrid` setup export (dashboard YAML + resources + integration files + stored shared config):
```bash
deploy/export-nx-displaygrid-setup.sh 192.168.x.x live
```

Use this before changing data structures so you can diff/restore your current board setup without re-running onboarding.

Restore procedure:
- See `docs/RESTORE.md` for focused `nx-displaygrid` restores vs full `/config` rollbacks.

## Local checks
Run the repo check wrapper:
```bash
scripts/check.sh
```

It runs fast Node tests and optional `shellcheck` / `yamllint` / `ha core check` when those tools are installed.

## How to bump resource cache-bust query string
Update the query string in:
- `config/lovelace/resources.yaml`

Current format:
- `/local/nx-displaygrid/nx-displaygrid.js?v=YYYYMMDD-HHMMSS`

After changing JS assets, bump `v=` and deploy.

## How to roll back
Roll back lab to a known commit/tag:
```bash
LAB_IP=192.168.x.x deploy/deploy-lab.sh <old-ref>
```

Roll back live to a known state:
- Deploy from `main` at an older commit, or
- Deploy from a verified signed `live-*` tag pointing to the rollback commit.

Example:
```bash
LIVE_IP=192.168.x.x deploy/deploy-live.sh live-2026-02-15
```

## Secrets
- Keep secrets in external files and inject at deploy time.
- Use `!secret` references in YAML for sensitive values.
- Keep `config/secrets.yaml.template` as the non-sensitive key scaffold.
- Before adding new `!secret` references, update the template so deploy/setup docs stay complete.
