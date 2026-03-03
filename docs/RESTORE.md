# Restore Runbook

Use this runbook when `nx-displaygrid` schema/data changes go wrong and you need to restore the current Home Assistant setup quickly without re-running onboarding manually.

## Scope

Two restore paths are supported:

1. Full `/config` restore (broad rollback, includes `.storage`)
2. Focused `nx-displaygrid` restore (dashboard/resources/custom integration + stored shared config)

Prefer the focused restore first when only `nx-displaygrid` behavior/config is affected.

## Before you change anything (recommended)

Create both backups before schema or data-structure changes:

```bash
deploy/backup-remote-config.sh <host-ip> <lab|live>
deploy/export-nx-displaygrid-setup.sh <host-ip> <lab|live>
```

Output is written under `backups/ha/` (git-ignored) with a timestamped folder.

## Restore Path A: Full `/config` rollback (fastest broad recovery)

1. Identify the snapshot folder under `backups/ha/<env>/<timestamp>/`.
2. Confirm it contains `config/` and (if you included them) `secrets.yaml`.
3. `rsync` the snapshot back to the target:

```bash
rsync -az --delete backups/ha/<env>/<timestamp>/config/ root@<host-ip>:/config/
```

4. Restore `secrets.yaml` separately if required (only if you backed it up and intend to replace current secrets).
5. Restart Home Assistant:

```bash
ssh root@<host-ip> 'ha core restart'
```

## Restore Path B: Focused `nx-displaygrid` restore

Use this when HA itself is fine but the board config/resources/integration drifted.

Restore files from the export snapshot (paths may be present/absent depending on your environment):

- `config/.storage/nx_displaygrid.config`
- `config/lovelace/nx-family-dashboard.yaml`
- `config/lovelace/resources.yaml`
- `config/custom_components/nx_displaygrid/`
- `config/www/nx-displaygrid/` (only if you intentionally want to revert frontend assets too)

Example (restore stored board config + dashboard resources only):

```bash
rsync -az backups/ha/<env>/<timestamp>/config/.storage/nx_displaygrid.config root@<host-ip>:/config/.storage/nx_displaygrid.config
rsync -az backups/ha/<env>/<timestamp>/config/lovelace/nx-family-dashboard.yaml root@<host-ip>:/config/lovelace/nx-family-dashboard.yaml
rsync -az backups/ha/<env>/<timestamp>/config/lovelace/resources.yaml root@<host-ip>:/config/lovelace/resources.yaml
ssh root@<host-ip> 'ha core restart'
```

## Git rollback (code/config source of truth)

If the issue came from a repo change and you want a clean source rollback:

```bash
LAB_IP=<host-ip> deploy/deploy-lab.sh <known-good-ref>
LIVE_IP=<host-ip> deploy/deploy-live.sh <known-good-ref-or-live-tag>
```

Use the snapshot restore if the live runtime state (`.storage`) also needs to be restored.

## Verification after restore

1. Open Home Assistant and confirm it boots cleanly.
2. Open the `NX - Family Dashboard` dashboard and verify the card loads.
3. Confirm people/sources are present (no onboarding prompt unless expected).
4. Run `docs/SMOKE_TESTS.md`.
5. If JS assets were changed recently, confirm `config/lovelace/resources.yaml` points to the intended `v=` cache-buster.

## Notes / Cautions

- Restoring `.storage` can overwrite newer HA UI-managed changes made after the snapshot.
- Avoid restoring `secrets.yaml` unless necessary.
- Prefer focused restores in `live` unless the whole HA config must roll back.
