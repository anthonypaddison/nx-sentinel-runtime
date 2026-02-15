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
- Keep Family Board paths stable (`/local/family-board/...`) during migration.

## Lab vs Live workflow
Directory layout:
- `config/packages/common/` shared package YAML
- `config/packages/lab/` lab-only package YAML
- `config/packages/live/` live-only package YAML
- `config/packages/_env.yaml` environment selector include (`lab` or `live`)
- `config/packages/_packages.yaml` merges `common + selected env`
- `config/lovelace/family-board.yaml` dashboard YAML
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
- Updates submodules recursively.
- Stages config with env overlay (`lab` or `live`).
- `rsync --delete` to `root@<IP>:/config/` with safe excludes:
  - `.storage/`
  - HA DB files
  - log files
- Copies environment secrets file to `/config/secrets.yaml` on target.
- Restarts Home Assistant on target (`ha core restart` by default).
  Override with `HA_RESTART_CMD`, for example:
  - `HA_RESTART_CMD='docker restart homeassistant'`
- Prints commit and submodule hashes.
- Prints restart options (HAOS and Docker command examples).

## How to update nx-displaygrid submodule
```bash
git submodule update --init --recursive
git -C config/www/family-board fetch origin
git -C config/www/family-board checkout <commit-or-tag>
git add config/www/family-board
git commit -m "chore: bump nx-displaygrid submodule"
```

## How to bump resource cache-bust query string
Update the query string in:
- `config/lovelace/resources.yaml`

Current format:
- `/local/family-board/family-board.js?v=YYYYMMDD-HHMMSS`

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
