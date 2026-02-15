#!/usr/bin/env bash
set -euo pipefail

target="${1:?ssh target required}"
path="${2:?path required}"

ssh -o BatchMode=yes -o ConnectTimeout=5 \
  -i /config/ssh/id_ed25519 \
  "$target" \
  "df -BG --output=avail \"$path\" | tail -n1 | tr -dc '0-9'"
