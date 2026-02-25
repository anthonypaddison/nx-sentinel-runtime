#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

errors=0

echo "[check] nx-sentinel-runtime structure boundaries"

# Runtime repo must not turn into infra or tooling warehouse.
for forbidden_dir in raw utilities roles inventory stacks playbooks group_vars host_vars; do
    if [ -d "$forbidden_dir" ]; then
        echo "ERROR: forbidden directory for runtime repo detected: $forbidden_dir/"
        errors=1
    fi
done

# Runtime repo should not host compose manifests directly.
compose_files="$(find . -type f \( -name 'docker-compose*.yml' -o -name 'docker-compose*.yaml' -o -name 'compose.yml' -o -name 'compose.yaml' \) | sed 's#^\./##' | sort)"
if [ -n "$compose_files" ]; then
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        echo "ERROR: compose manifest not allowed in runtime repo: $file"
    done <<EOF2
$compose_files
EOF2
    errors=1
fi

# Guard against obvious ad-hoc script creep.
adhoc_scripts="$(find scripts deploy -type f \( -name '*oneoff*' -o -name '*adhoc*' -o -name '*scratch*' -o -name '*tmp*' \) 2>/dev/null | sed 's#^\./##' | sort)"
if [ -n "$adhoc_scripts" ]; then
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        echo "ERROR: one-off style script name detected in runtime repo: $file"
    done <<EOF2
$adhoc_scripts
EOF2
    errors=1
fi

if [ "$errors" -ne 0 ]; then
    echo "FAIL: nx-sentinel-runtime boundary check failed"
    exit 1
fi

echo "PASS: nx-sentinel-runtime boundary check"
