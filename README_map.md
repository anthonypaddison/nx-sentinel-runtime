# nx-sentinel-runtime Repo Map

## What this repo is
`nx-sentinel-runtime` is the always-on ops layer: monitoring, automation/eventing, alerting, and control-plane behavior for Home Assistant runtime.

## What it owns
- Home Assistant runtime config under `config/`.
- Operational sensors/automations/alerts and dashboard control-plane behavior.
- Runtime-oriented deployment and validation scripts for promoting config safely.

## What it must NOT contain
- Infrastructure provisioning/orchestration (Ansible inventory/roles/playbooks).
- One-off ad-hoc scripts and personal scratch tooling.
- Bulk raw exports/dumps that belong in tooling repos.

## How to run
- Local checks:
  - `scripts/check.sh`
- Structure boundary check:
  - `./scripts/check_structure.sh`
- Deploy lab/live (existing flow):
  - `LAB_IP=<ip> deploy/deploy-lab.sh`
  - `LIVE_IP=<ip> deploy/deploy-live.sh`

## Definition of done (perfect target)
- Runtime config is always deployable and environment-aware.
- Monitoring/alerting contracts align with orchestrator service names/ports.
- No ad-hoc tool sprawl in this repo.
- Structure check passes and docs match real runtime behavior.
- Rollback path is explicit and tested.
