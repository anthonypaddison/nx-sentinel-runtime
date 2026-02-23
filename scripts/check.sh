#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== nx-sentinel-runtime checks =="

if command -v node >/dev/null 2>&1; then
  echo "-- node tests"
  node --test tests/*.test.mjs
else
  echo "SKIP: node not installed (tests/*.test.mjs not run)"
fi

if command -v shellcheck >/dev/null 2>&1; then
  echo "-- shellcheck deploy scripts"
  shellcheck deploy/*.sh config/scripts/*.sh
else
  echo "SKIP: shellcheck not installed"
fi

if command -v yamllint >/dev/null 2>&1; then
  echo "-- yamllint config + docs"
  yamllint config docs
else
  echo "SKIP: yamllint not installed"
fi

if command -v ha >/dev/null 2>&1; then
  echo "-- home assistant config check (local)"
  ha core check || true
else
  echo "SKIP: ha CLI not installed"
fi
