#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

LAB_IP="${LAB_IP:-}"
LAB_SECRETS_FILE="${LAB_SECRETS_FILE:-${HOME}/.ha-secrets/secrets.lab.yaml}"
DEPLOY_REF="${1:-lab}"

if [[ -z "$LAB_IP" ]]; then
  echo "ERROR: LAB_IP env var is required." >&2
  exit 1
fi

require_clean_git
checkout_ref "$DEPLOY_REF"
update_submodules

STAGE_DIR="$(create_stage_config lab)"
trap 'rm -rf "$STAGE_DIR"' EXIT

rsync_config "$STAGE_DIR" "$LAB_IP"
sync_secrets "$LAB_SECRETS_FILE" "$LAB_IP"
restart_home_assistant "$LAB_IP"

print_deploy_summary "$LAB_IP" "lab"
