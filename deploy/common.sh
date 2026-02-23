#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$ROOT_DIR/config"
BACKUP_ROOT_DEFAULT="$ROOT_DIR/backups/ha"

require_cmds() {
  local missing=0
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "ERROR: required command not found: $cmd" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
}

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
  if [[ -f "$ROOT_DIR/.gitmodules" ]]; then
    git -C "$ROOT_DIR" submodule update --init --recursive
  fi
}

timestamp_utc() {
  date -u +"%Y%m%d-%H%M%SZ"
}

ensure_backup_dir() {
  local dir="$1"
  mkdir -p "$dir"
}

backup_remote_config() {
  local remote_host="$1"
  local env_name="$2"
  local backup_root="${HA_BACKUP_ROOT:-$BACKUP_ROOT_DEFAULT}"
  local include_secrets="${HA_BACKUP_INCLUDE_SECRETS:-0}"
  local secrets_excludes=()
  local stamp
  local dest_dir
  stamp="$(timestamp_utc)"
  dest_dir="${backup_root}/${env_name}/${stamp}"

  ensure_backup_dir "$dest_dir"

  if [[ "$include_secrets" != "1" ]]; then
    secrets_excludes+=(--exclude 'secrets.yaml')
  fi

  echo "Creating backup snapshot: $dest_dir"
  rsync -az \
    --exclude 'home-assistant_v2.db' \
    --exclude 'home-assistant_v2.db-*' \
    --exclude '*.log' \
    --exclude '*.log.*' \
    --exclude '__pycache__/' \
    --exclude '.DS_Store' \
    "${secrets_excludes[@]}" \
    "root@${remote_host}:/config/" "$dest_dir/config/"

  echo "$dest_dir"
}

maybe_backup_before_deploy() {
  local remote_host="$1"
  local env_name="$2"
  local enabled="${BACKUP_BEFORE_DEPLOY:-1}"
  if [[ "$enabled" != "1" ]]; then
    return 0
  fi
  backup_remote_config "$remote_host" "$env_name" >/dev/null
}

export_nx_displaygrid_setup() {
  local remote_host="$1"
  local env_name="${2:-manual}"
  local backup_root="${HA_BACKUP_ROOT:-$BACKUP_ROOT_DEFAULT}"
  local stamp
  local dest_dir
  stamp="$(timestamp_utc)"
  dest_dir="${backup_root}/${env_name}/${stamp}/nx-displaygrid-export"

  ensure_backup_dir "$dest_dir"

  rsync -az \
    --include '/lovelace/' \
    --include '/lovelace/nx-displaygrid.yaml' \
    --include '/lovelace/resources.yaml' \
    --include '/packages/' \
    --include '/packages/common/' \
    --include '/packages/common/nx_displaygrid.yaml' \
    --include '/custom_components/' \
    --include '/custom_components/nx_displaygrid/' \
    --include '/custom_components/nx_displaygrid/websocket.py' \
    --include '/custom_components/nx_displaygrid/__init__.py' \
    --include '/.storage/' \
    --include '/.storage/nx_displaygrid.config' \
    --exclude '*' \
    "root@${remote_host}:/config/" "$dest_dir/config/"

  if [[ ! -f "$dest_dir/config/.storage/nx_displaygrid.config" ]]; then
    cat > "$dest_dir/README.txt" <<'EOF'
nx-displaygrid shared config store was not found at /config/.storage/nx_displaygrid.config.
The dashboard may be using only YAML defaults, or the integration has not saved runtime config yet.
EOF
  fi

  echo "$dest_dir"
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
  echo
  echo "Backups:"
  echo "# Disable pre-deploy backup: BACKUP_BEFORE_DEPLOY=0"
  echo "# Backup root override: HA_BACKUP_ROOT=/path/to/backups"
  echo "# Include secrets in backup (default off): HA_BACKUP_INCLUDE_SECRETS=1"
}
