#!/usr/bin/env bash
set -euo pipefail

resolve_target_from_secrets() {
  local secrets_file="/config/secrets.yaml"
  if [[ ! -f "$secrets_file" ]]; then
    echo "secrets file not found: $secrets_file" >&2
    return 1
  fi

  local line
  line="$(grep -E '^[[:space:]]*media_box_ssh_target[[:space:]]*:' "$secrets_file" | head -n1 || true)"
  if [[ -z "$line" ]]; then
    echo "media_box_ssh_target not found in $secrets_file" >&2
    return 1
  fi

  line="${line#*:}"
  line="$(printf '%s' "$line" | sed -E "s/^[[:space:]]+//; s/[[:space:]]+$//")"
  line="$(printf '%s' "$line" | sed -E "s/^'(.*)'$/\1/; s/^\"(.*)\"$/\1/")"
  if [[ -z "$line" ]]; then
    echo "media_box_ssh_target is empty in $secrets_file" >&2
    return 1
  fi

  printf '%s\n' "$line"
}

target="${1:-}"
path="${2:-}"
if [[ -z "$path" ]]; then
  path="${target:-}"
  target=""
fi

if [[ -z "$path" ]]; then
  echo "path required" >&2
  exit 1
fi

if [[ -z "$target" ]]; then
  target="$(resolve_target_from_secrets)"
fi

ssh -o BatchMode=yes -o ConnectTimeout=5 \
  -i /config/ssh/id_ed25519 \
  "$target" \
  "df -BG --output=avail \"$path\" | tail -n1 | tr -dc '0-9'"
