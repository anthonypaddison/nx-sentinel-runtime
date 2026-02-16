# NX-CORE Architecture

## 1. Overview

NX-CORE is the umbrella platform for home operational infrastructure.

It consists of:

- Node layer - physical or virtual machines
- Service layer - applications/containers running on nodes
- Configuration layer - Home Assistant runtime configuration
- UI layer - Lovelace dashboard surface

The system is designed for:

- Clear separation of concerns
- Deterministic deployment
- Future lab -> live promotion
- Minimal runtime state in version control

---

## 2. Naming Conventions

### Platform

- NX-CORE - entire infrastructure umbrella

### Nodes

- Uppercase
- Format: NX-NAME
- Add -01, -02 only if multiple instances exist

Examples:

- NX-OVERWATCH
- NX-FOUNDRY
- NX-DEEPSTORE
- NX-BEACON

### Services

- Lowercase
- Prefix: nx-
- Typically Docker services or applications

Examples:

- nx-sentinel - Home Assistant
- nx-spectrum - Media frontend
- nx-datacore - Storage service
- nx-forge - Lab/test support

### Repositories

- Lowercase
- Hyphen separated
- Clear ownership boundaries

Examples:

- nx-sentinel-runtime
- nx-servicebay

---

## 3. Current Topology

### Node Layer

#### NX-OVERWATCH

Primary automation node.

Runs:

- nx-sentinel (Home Assistant - live instance)

#### NX-FOUNDRY

Lab/testing node (Docker-based HA instance).

Runs:

- nx-sentinel (lab instance)

#### NX-DEEPSTORE

Storage node.

Runs:

- nx-datacore

#### NX-BEACON

Media output node.

Runs:

- nx-spectrum

---

## 4. Repository Structure

### nx-sentinel-runtime

Purpose:

- Source of truth for Home Assistant configuration

Contains:

- config/configuration.yaml
- config/packages/\*\*
- config/lovelace/\*\*
- config/www/nx-displaygrid/\*\*
- deployment scripts
- secrets template

Does NOT contain:

- .storage/
- database files
- logs
- media
- backups
- real secrets

This repo defines the declarative system state.

---

### nx-servicebay

Purpose:

- Operational tooling
- Utility scripts
- Maintenance helpers

Contains:

- Python scripts
- Bash scripts
- Cross-system tooling

Does not contain business logic or core HA config.

---

## 5. UI Layer

The current Lovelace dashboard:

- Managed in YAML mode
- Defined in config/lovelace/nx-displaygrid.yaml
- Loaded via resource_mode: yaml

Resource:

/local/nx-displaygrid/nx-displaygrid.js

The dashboard surface is conceptually referred to as:

NX Command Deck

(Current dashboard ID remains nx-displaygrid for migration stability.)

---

## 6. Deployment Model

Current workflow:

- Edit configuration in nx-sentinel-runtime
- Commit changes
- Deploy via rsync over SSH

Example:

rsync -av --no-perms --no-times --inplace \
 --exclude='.storage' \
 --exclude='home-assistant_v2.db*' \
 --exclude='home-assistant.log*' \
 config/ root@<TARGET>:/config/

Then:

## 6. Deployment Model

Current workflow:

- Edit configuration in nx-sentinel-runtime
- Commit changes
- Deploy via rsync over SSH

Example:

rsync -av --no-perms --no-times --inplace \
 --exclude='.storage' \
 --exclude='home-assistant_v2.db*' \
 --exclude='home-assistant.log*' \
 config/ root@<TARGET>:/config/

Then:

- Restart Home Assistant
- Hard refresh browser

---

## 7. State Policy

### Version Controlled

- YAML configuration
- Lovelace dashboards
- Packages
- Custom www assets
- Deployment scripts

### Explicitly Not Version Controlled

- .storage/
- home-assistant_v2.db
- logs
- backups
- runtime auth tokens
- integration state
- secrets.yaml (real values)

Runtime state remains instance-specific.

---

## 8. Lab / Live Separation (Planned)

Intended promotion model:

1. Develop on NX-FOUNDRY (lab)
2. Validate
3. Tag commit
4. Deploy to NX-OVERWATCH (live)

Environment differences handled via:

config/packages/common/
config/packages/lab/
config/packages/live/

---

## 9. Future Refactoring Plan

Once stable:

- Rename /config/www/nx-displaygrid/ -> /config/www/nx-commanddeck/
- Rename Lovelace dashboard ID
- Possibly extract UI into standalone nx-displaygrid repo
- Introduce tag-based promotion workflow

Refactors are performed only after stability gates pass.

---

## 10. Design Principles

- Stability over aesthetic refactoring
- One source of truth
- Runtime state never versioned
- Explicit environment separation
- Deterministic deploys
- Rollback capability via Git tag + rsync

---

## 11. Recovery Strategy

In disaster scenario:

- Restore HA backup (system snapshot) OR
- Fresh HA install
- Clone nx-sentinel-runtime
- Deploy config via rsync
- Restore secrets.yaml
- Restart HA

Dashboard and system layout are restored from Git.

---

## 12. Authority

This document is the canonical naming and structure reference for NX-CORE.

All new components must follow these conventions unless explicitly documented otherwise.

## Final list

Test Machine hostname:

- `NX-FOUNDRY`

Container names:

Container names:

- `gluetun` -> `nx-bastion`
- `qbittorrent` -> `nx-transmit`
- `sonarr` -> `nx-beacon-sonar`
- `radarr` -> `nx-beacon-radar`
- `prowlarr` -> `nx-beacon-prowlarr`
- `jellyseerr` -> `nx-observer`
- `flaresolverr` -> `nx-mediator`
- `jellyfin` -> `nx-spectrum`
- `uptime-kuma` -> `nx-watchtower`
- `homeassistant` -> `nx-sentinel-forge`
