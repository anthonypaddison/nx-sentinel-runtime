#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$ROOT_DIR/config"

require_clean_git() {
  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
    echo "ERROR: git working tree is not clean. Commit/stash changes first." >&2
    exit 1
  fi
}

checkout_ref() {
  local ref="$1"
  git -C "$ROOT_DIR" fetch --tags --quiet || true
  git -C "$ROOT_DIR" checkout --quiet "$ref"
}

update_submodules() {
  git -C "$ROOT_DIR" submodule update --init --recursive
}

create_stage_config() {
  local env_name="$1"
  local stage_dir
  stage_dir="$(mktemp -d)"
  rsync -a "$CONFIG_DIR/" "$stage_dir/config/"

  case "$env_name" in
    lab)  printf '!include_dir_merge_named lab\n' > "$stage_dir/config/packages/_env.yaml" ;;
    live) printf '!include_dir_merge_named live\n' > "$stage_dir/config/packages/_env.yaml" ;;
    *)
      echo "ERROR: Unknown env '$env_name'" >&2
      rm -rf "$stage_dir"
      exit 1
      ;;
  esac

  echo "$stage_dir"
}

rsync_config() {
  local stage_dir="$1"
  local remote_host="$2"
  rsync -az --delete \
    --exclude '.storage/' \
    --exclude 'home-assistant_v2.db' \
    --exclude 'home-assistant_v2.db-*' \
    --exclude '*.log' \
    --exclude '*.log.*' \
    --exclude '__pycache__/' \
    --exclude '.DS_Store' \
    "$stage_dir/config/" "root@${remote_host}:/config/"
}

sync_secrets() {
  local secrets_file="$1"
  local remote_host="$2"

  if [[ ! -f "$secrets_file" ]]; then
    echo "ERROR: secrets file not found: $secrets_file" >&2
    exit 1
  fi

  rsync -az "$secrets_file" "root@${remote_host}:/config/secrets.yaml"
}

restart_home_assistant() {
  local remote_host="$1"
  local restart_cmd="${HA_RESTART_CMD:-ha core restart}"

  # HAOS option: ha core restart
  # Docker option: docker restart homeassistant
  ssh "root@${remote_host}" "$restart_cmd"
}

print_deploy_summary() {
  local remote_host="$1"
  local env_name="$2"
  local commit_hash
  local submodule_hash

  commit_hash="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  submodule_hash="$(git -C "$ROOT_DIR" submodule status --recursive | awk '{print $1 " " $2}' | tr '\n' ';')"

  echo
  echo "Deployed environment: $env_name"
  echo "Target host: $remote_host"
  echo "Commit: $commit_hash"
  echo "Submodules: $submodule_hash"
  echo
  echo "Restart command used: ${HA_RESTART_CMD:-ha core restart}"
  echo "Restart options:"
  echo "# HAOS: ha core restart"
  echo "# Docker: docker restart homeassistant"
}
