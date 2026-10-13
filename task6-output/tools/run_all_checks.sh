#!/usr/bin/env bash
# TASK-6: run every check, record command, exit code and output hash.
# Usage: run_all_checks.sh <scratch-dir>   (writes evidence/commands.json)
set -uo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"; SCRATCH="${1:?scratch dir}"; EV="$HERE/evidence"
mkdir -p "$EV"; cd "$HERE"
declare -a ROWS=()
run() { local id=$1; shift; local log="$EV/$id.log"
  "$@" > "$log" 2>&1; local rc=$?
  ROWS+=("$(python3 -I -c 'import json,sys,hashlib;print(json.dumps({"id":sys.argv[1],"cmd":sys.argv[2],"exit":int(sys.argv[3]),"log":sys.argv[4],"log_sha256":hashlib.sha256(open(sys.argv[5],"rb").read()).hexdigest()}))' \
    "$id" "$*" "$rc" "evidence/$id.log" "$log")")
  echo "$id exit=$rc"; }
run tool-versions bash -c 'python3 --version; docker compose version; ls -d /usr/lib/postgresql/*/bin'
run compose-config docker compose -f compose.yaml --env-file .env.example config -q
run db-tests tools/run_db_tests.sh "$EV"
run db-mutations tools/run_db_mutations.sh "$SCRATCH/mut" "$EV/db-mutation-results.txt"
run static-checks python3 -I tools/task6_checks.py "$HERE" "$EV/task6-checks.json"
printf '%s\n' "${ROWS[@]}" | python3 -I -c 'import sys,json;json.dump([json.loads(l) for l in sys.stdin],open(sys.argv[1],"w"),indent=1)' "$EV/commands.json"
