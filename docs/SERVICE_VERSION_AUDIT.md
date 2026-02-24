# Service Version Audit (Production Readiness)

Use this runbook to inventory deployed service versions and compare them against current stable releases before production changes.

## What this covers

- Home Assistant host (`ha core info` / Supervisor info when available)
- Media/services host container inventory (names, images, tags, status)
- Floating tag detection (`latest`, `stable`, `nightly`, `develop`, etc.)

## Generate an inventory snapshot

Run from this repo:

```bash
scripts/audit-service-versions.sh --media user@media-host --ha root@ha-host
```

If you only want the media/services host inventory:

```bash
scripts/audit-service-versions.sh --media user@media-host
```

Save the output for comparison/review:

```bash
scripts/audit-service-versions.sh --media user@media-host --ha root@ha-host > /tmp/service-version-audit.md
```

## What to look for first

- Floating image tags (`latest`, `stable`, `nightly`, `develop`, `edge`, `beta`)
- Very old pinned tags relative to the current vendor stable release
- Containers restarting frequently (`Status` shows repeated restarts)
- Home Assistant Core/Supervisor version drift between `lab` and `live`

## Official stable release sources (compare against these)

- Home Assistant release notes: [home-assistant.io/blog](https://www.home-assistant.io/blog/)
- Home Assistant docs / integrations (service name changes, deprecations): [home-assistant.io/integrations](https://www.home-assistant.io/integrations/)
- Sonarr releases (official GitHub): [github.com/Sonarr/Sonarr/releases](https://github.com/Sonarr/Sonarr/releases)
- Radarr releases (official GitHub): [github.com/Radarr/Radarr/releases](https://github.com/Radarr/Radarr/releases)
- Prowlarr releases (official GitHub): [github.com/Prowlarr/Prowlarr/releases](https://github.com/Prowlarr/Prowlarr/releases)
- Jellyfin releases (official GitHub): [github.com/jellyfin/jellyfin/releases](https://github.com/jellyfin/jellyfin/releases)
- Transmission release notes (official site/docs): [transmissionbt.com](https://transmissionbt.com/)
- Overseerr releases (official GitHub): [github.com/sct/overseerr/releases](https://github.com/sct/overseerr/releases)

## Recommended production policy

- Pin images to explicit stable versions, not floating tags.
- Upgrade `lab` first, soak test, then promote to `live`.
- Record upgrade date + version changes in `docs/changes/YYYY-MM-DD.md`.
- Keep a pre-deploy backup/export before dashboard/schema changes (`deploy/backup-remote-config.sh`, `deploy/export-nx-displaygrid-setup.sh`).

## Verification after upgrades

1. Run `scripts/check.sh` locally.
2. Run Home Assistant **Check configuration** (or `ha core check`) on the target.
3. Confirm `nx-displaygrid` dashboards load and key views render.
4. Confirm `home_infra` sensors/automations update (REST/TCP/command_line checks).
5. Re-run `scripts/audit-service-versions.sh` and archive the before/after output.

