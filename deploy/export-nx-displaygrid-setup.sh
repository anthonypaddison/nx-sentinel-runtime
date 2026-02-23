#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_cmds rsync ssh

TARGET_HOST="${1:-}"
ENV_NAME="${2:-manual}"

if [[ -z "$TARGET_HOST" ]]; then
  echo "Usage: $0 <host-or-ip> [env-name]" >&2
  echo "Example: $0 192.168.1.10 live" >&2
  exit 1
fi

dest="$(export_nx_displaygrid_setup "$TARGET_HOST" "$ENV_NAME")"
echo "nx-displaygrid setup export complete: $dest"
