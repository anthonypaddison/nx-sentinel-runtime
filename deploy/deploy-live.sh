#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

LIVE_IP="${LIVE_IP:-}"
LIVE_SECRETS_FILE="${LIVE_SECRETS_FILE:-${HOME}/.ha-secrets/secrets.live.yaml}"
TARGET_REF="${1:-}"

if [[ -z "$LIVE_IP" ]]; then
  echo "ERROR: LIVE_IP env var is required." >&2
  exit 1
fi

require_clean_git

if [[ -n "$TARGET_REF" ]]; then
  checkout_ref "$TARGET_REF"
fi

CURRENT_BRANCH="$(git -C "$ROOT_DIR" branch --show-current || true)"
HEAD_TAG="$(git -C "$ROOT_DIR" tag --points-at HEAD | grep -E '^live-' | head -n 1 || true)"

if [[ "$CURRENT_BRANCH" == "main" ]]; then
  :
elif [[ -n "$HEAD_TAG" ]]; then
  if ! git -C "$ROOT_DIR" tag -v "$HEAD_TAG" >/dev/null 2>&1; then
    echo "ERROR: live tag '$HEAD_TAG' is not GPG-signed/verified." >&2
    exit 1
  fi
else
  echo "ERROR: live deploy only allowed from 'main' or a verified signed tag matching 'live-*'." >&2
  exit 1
fi

update_submodules

STAGE_DIR="$(create_stage_config live)"
trap 'rm -rf "$STAGE_DIR"' EXIT

rsync_config "$STAGE_DIR" "$LIVE_IP"
sync_secrets "$LIVE_SECRETS_FILE" "$LIVE_IP"
restart_home_assistant "$LIVE_IP"

print_deploy_summary "$LIVE_IP" "live"
