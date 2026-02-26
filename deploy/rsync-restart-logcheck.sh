#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_cmds rsync ssh

usage() {
  cat <<'EOF'
Usage: deploy/rsync-restart-logcheck.sh <remote-host> [lab|live]

One-terminal deploy helper:
1) Stage env config
2) Rsync to /config
3) Restart Home Assistant Core
4) Wait
5) Fetch and scan logs

Args:
  remote-host      Target host/IP (or set HA_HOST)
  lab|live         Env overlay for staged config (default: live, or HA_ENV)

Env overrides:
  HA_HOST          Default target host when arg is omitted
  HA_ENV           Default env name (lab|live)
  HA_WAIT_SECONDS  Wait after restart before fetching logs (default: 300)
  HA_LOG_LINES     Number of log lines to fetch (default: 220)
  HA_RESTART_CMD   Restart command (default: ha core restart)
  HA_LOG_CMD       Explicit remote log command

Examples:
  deploy/rsync-restart-logcheck.sh 100.77.2.5 live
  HA_WAIT_SECONDS=120 deploy/rsync-restart-logcheck.sh 100.77.2.5 lab
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REMOTE_HOST="${1:-${HA_HOST:-}}"
DEPLOY_ENV="${2:-${HA_ENV:-live}}"
WAIT_SECONDS="${HA_WAIT_SECONDS:-300}"
LOG_LINES="${HA_LOG_LINES:-220}"

if [[ -z "$REMOTE_HOST" ]]; then
  echo "ERROR: remote host is required." >&2
  usage
  exit 1
fi

if [[ "$DEPLOY_ENV" != "lab" && "$DEPLOY_ENV" != "live" ]]; then
  echo "ERROR: env must be 'lab' or 'live' (got '$DEPLOY_ENV')." >&2
  usage
  exit 1
fi

if ! [[ "$WAIT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "ERROR: HA_WAIT_SECONDS must be an integer (got '$WAIT_SECONDS')." >&2
  exit 1
fi

if ! [[ "$LOG_LINES" =~ ^[0-9]+$ ]]; then
  echo "ERROR: HA_LOG_LINES must be an integer (got '$LOG_LINES')." >&2
  exit 1
fi

fetch_remote_logs() {
  local remote_host="$1"
  local lines="$2"
  local explicit_cmd="${HA_LOG_CMD:-}"
  if [[ -n "$explicit_cmd" ]]; then
    ssh "root@${remote_host}" "$explicit_cmd"
    return 0
  fi

  ssh "root@${remote_host}" "
    if command -v ha >/dev/null 2>&1; then
      ha core logs --no-color --tail ${lines} 2>/dev/null \
        || ha core logs --tail ${lines} 2>/dev/null \
        || (ha core logs 2>/dev/null | tail -n ${lines})
    elif command -v docker >/dev/null 2>&1; then
      docker logs --tail ${lines} homeassistant 2>/dev/null || true
    else
      echo 'ERROR: neither ha nor docker found on remote host' >&2
      exit 1
    fi
  "
}

STAGE_DIR="$(create_stage_config "$DEPLOY_ENV")"
LOG_FILE="$(mktemp)"
trap 'rm -rf "$STAGE_DIR"; rm -f "$LOG_FILE"' EXIT

echo "[1/5] Rsync staged config to root@${REMOTE_HOST}:/config/ (${DEPLOY_ENV})"
rsync_config "$STAGE_DIR" "$REMOTE_HOST"

echo "[2/5] Restart Home Assistant Core"
restart_home_assistant "$REMOTE_HOST"

echo "[3/5] Wait ${WAIT_SECONDS}s for startup"
sleep "$WAIT_SECONDS"

echo "[4/5] Fetching latest logs"
fetch_remote_logs "$REMOTE_HOST" "$LOG_LINES" | tee "$LOG_FILE"

echo "[5/5] Log scan summary"
ISSUE_COUNT="$(grep -Eic 'error|exception|traceback|failed|warning' "$LOG_FILE" || true)"
echo "Potential warning/error lines in fetched window: ${ISSUE_COUNT}"
if [[ "$ISSUE_COUNT" -gt 0 ]]; then
  echo "Last matching lines:"
  grep -Ein 'error|exception|traceback|failed|warning' "$LOG_FILE" | tail -n 20 || true
fi

echo "Done."
