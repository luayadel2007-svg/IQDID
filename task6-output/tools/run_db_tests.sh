#!/usr/bin/env bash
# TASK-6: apply 001_schema.sql to a throwaway local PostgreSQL cluster and run
# the constraint tests. No network listener (unix socket only), no persistence.
# Usage: run_db_tests.sh <output-dir>   (requires PostgreSQL 16 server binaries)
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(cd "${1:?output dir}" && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
WORK="$(mktemp -d)"; chmod 755 "$WORK"
RUNAS=(); [ "$(id -u)" = 0 ] && RUNAS=(runuser -u postgres --)
chown -R postgres "$WORK" 2>/dev/null || true
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust -E UTF8 >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-c listen_addresses='' -k $WORK" -l "$WORK/pg.log" -w start >/dev/null
cp "$HERE/sql/001_schema.sql" "$HERE/sql/090_pending_proposals.sql" "$HERE/sql/tests/010_constraint_tests.sql" "$WORK/"
chown postgres "$WORK"/*.sql 2>/dev/null || true
PSQL=("${RUNAS[@]}" psql -X -q -h "$WORK" -U postgres -d postgres -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f "$WORK/001_schema.sql" > "$OUT/db-schema-apply.log" 2>&1
"${PSQL[@]}" -v pending="$WORK/090_pending_proposals.sql" -v json_out="$WORK/results.json" \
  -f "$WORK/010_constraint_tests.sql" > "$OUT/db-tests.log" 2>&1
cp "$WORK/results.json" "$OUT/db-test-results.json"
"$PGBIN/postgres" --version > "$OUT/db-server-version.txt"
python3 - "$OUT/db-test-results.json" <<'PY'
import json,sys
r=json.load(open(sys.argv[1])); f=[x for x in r if x['outcome']!='PASS']
print(f"DB tests: {len(r)-len(f)} PASS / {len(f)} FAIL")
for x in f: print("FAIL", x['id'], x['detail'])
sys.exit(1 if f else 0)
PY
