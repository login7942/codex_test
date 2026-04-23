#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8130}"
./run_local.sh "${PORT}" > /tmp/kongkong_smoke.log 2>&1 &
PID=$!
trap 'kill ${PID} 2>/dev/null || true' EXIT

sleep 1
STATUS_LINE="$(curl -sI "http://localhost:${PORT}" | head -n 1)"

echo "${STATUS_LINE}"
if [[ "${STATUS_LINE}" == *"200"* ]]; then
  echo "SMOKE_TEST=PASS"
else
  echo "SMOKE_TEST=FAIL"
  exit 1
fi
