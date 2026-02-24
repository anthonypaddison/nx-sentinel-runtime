#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/audit-service-versions.sh --media <user@host> [--ha <root@ha-host>]

Options:
  --media <target>   SSH target for the media/services host (required)
  --ha <target>      SSH target for the Home Assistant host (optional)
  --help             Show this help

Notes:
  - This script inventories running services/containers and image tags.
  - It does not query the internet. Compare output against vendor release pages.
EOF
}

require_cmds() {
  local missing=0
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "ERROR: required command not found: $cmd" >&2
      missing=1
    fi
  done
  [[ "$missing" -eq 0 ]]
}

warn_if_unpinned() {
  local image="$1"
  local tag="${image##*:}"
  if [[ "$image" != *:* ]]; then
    printf 'WARN(unpinned:no-tag)'
    return
  fi
  case "${tag,,}" in
    latest|stable|edge|beta|nightly|develop|dev)
      printf 'WARN(floating-tag:%s)' "$tag"
      ;;
    *)
      printf ''
      ;;
  esac
}

run_ssh() {
  local target="$1"
  local cmd="$2"
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$target" "$cmd"
}

inventory_media_host() {
  local target="$1"
  echo "## Media Host Inventory ($target)"
  echo
  echo "### Container Runtime"
  run_ssh "$target" '
    if command -v docker >/dev/null 2>&1; then
      docker version --format "{{.Server.Version}}" 2>/dev/null || docker version 2>/dev/null | sed -n "s/^ Server:.*//p"
    elif command -v podman >/dev/null 2>&1; then
      podman --version
    else
      echo "No docker/podman runtime found"
    fi
  ' || echo "ERROR: failed to query runtime"
  echo

  echo "### Running Containers"
  local rows
  rows="$(run_ssh "$target" 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || true')"
  if [[ -z "$rows" ]]; then
    echo "No running Docker containers found (or docker unavailable)."
    echo
    return
  fi

  printf '| Container | Image | Tag | Status | Notes |\n'
  printf '|---|---|---|---|---|\n'
  while IFS=$'\t' read -r name image status; do
    [[ -z "${name:-}" ]] && continue
    local tag='(none)'
    if [[ "$image" == *:* ]]; then
      tag="${image##*:}"
    fi
    printf '| %s | %s | %s | %s | %s |\n' \
      "$name" "$image" "$tag" "${status:-}" "$(warn_if_unpinned "$image")"
  done <<< "$rows"
  echo

  echo "### Known Service Targets (if present)"
  run_ssh "$target" '
    docker ps --format "{{.Names}}\t{{.Image}}" 2>/dev/null \
      | grep -Ei "sonarr|radarr|prowlarr|jellyfin|transmission|overseerr|watchtower" || true
  '
  echo
}

inventory_ha_host() {
  local target="$1"
  echo "## Home Assistant Host Inventory ($target)"
  echo
  echo "### HA Core / Supervisor"
  run_ssh "$target" '
    if command -v ha >/dev/null 2>&1; then
      echo "[ha core info]"
      ha core info --raw-json 2>/dev/null || ha core info 2>/dev/null || true
      echo
      echo "[ha supervisor info]"
      ha supervisor info --raw-json 2>/dev/null || ha supervisor info 2>/dev/null || true
    else
      echo "ha CLI not found on target"
      docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null | grep -Ei "homeassistant|supervisor" || true
    fi
  ' || echo "ERROR: failed to query Home Assistant host"
  echo
}

main() {
  require_cmds ssh || exit 1

  local media_target=""
  local ha_target=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --media)
        media_target="${2:-}"
        shift 2
        ;;
      --ha)
        ha_target="${2:-}"
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "ERROR: unknown argument: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done

  if [[ -z "$media_target" ]]; then
    echo "ERROR: --media is required" >&2
    usage >&2
    exit 1
  fi

  echo "# Service Version Inventory"
  echo
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo

  inventory_media_host "$media_target"
  if [[ -n "$ha_target" ]]; then
    inventory_ha_host "$ha_target"
  fi

  cat <<'EOF'
## Next Step (Manual Comparison)

Compare the reported versions/tags against official stable release channels for:
- Home Assistant Core / Supervisor
- Sonarr
- Radarr
- Prowlarr
- Jellyfin
- Transmission
- Overseerr (if used)

Flag any floating tags (`latest`, `stable`, `nightly`, `develop`, etc.) for pinning.
EOF
}

main "$@"

