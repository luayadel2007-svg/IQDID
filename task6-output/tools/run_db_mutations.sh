#!/usr/bin/env bash
# TASK-6 mutation check (DR-67): disable one control at a time in a copy of the
# schema and confirm the matching test fails. Usage: run_db_mutations.sh <scratch-dir> <out-file>
set -uo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"; S="${1:?scratch}"; OUT="${2:?out}"; : > "$OUT"
run_mut(){ local name=$1 expr=$2 expect=$3
  rm -rf "$S/m"; mkdir -p "$S/m"; cp -r "$HERE/sql" "$HERE/tools" "$S/m/"; mkdir "$S/m/evidence"
  python3 -I - "$S/m/sql/001_schema.sql" "$expr" <<'PY'
import sys;p,e=sys.argv[1],sys.argv[2];a,b=e.split('=>');s=open(p).read();assert a in s,a;open(p,'w').write(s.replace(a,b,1))
PY
  "$S/m/tools/run_db_tests.sh" "$S/m/evidence" >/dev/null 2>&1; local rc=$?
  local got; got=$(python3 -I -c "import json,sys;print(','.join(sorted(x['id'].split()[0] for x in json.load(open(sys.argv[1])) if x['outcome']!='PASS')))" "$S/m/evidence/db-test-results.json" 2>/dev/null || echo ABORTED)
  local v=SURVIVED; [ $rc -ne 0 ] && echo ",$got," | grep -q ",$expect," && v=KILLED
  echo "$name | exit=$rc | failing=[$got] | expected=$expect | $v" | tee -a "$OUT"; }
run_mut M1-remove-revoked-final "IF OLD.value = 1 AND NEW.value <> 1 THEN=>IF false THEN" DB-STA-07
run_mut M2-remove-CAS "AND row_version = p_expected_row_version;=>;" DB-STA-05
run_mut M3-allow-self-approval "CONSTRAINT approval_not_self CHECK (requested_by <> approved_by)=>CONSTRAINT approval_not_self CHECK (true)" DB-APR-01
run_mut M4-approval-reusable "AND consumed_at IS NULL AND expires_at > now()=>AND expires_at > now()" DB-APR-07
run_mut M5-trust-version-not-monotonic "WHERE version >= NEW.version=>WHERE false" DB-TRU-03
run_mut M6-no-capacity-bound "IF NEW.idx >= v_cap THEN=>IF false THEN" DB-STA-03
run_mut M8-session-refetch "IF OLD.request_fetched_at IS NOT NULL AND=>IF false AND" DB-VER-04
run_mut M9-audit-update-allowed "RAISE EXCEPTION 'audit events are append-only';=>RETURN NEW;" DB-AUD-02
run_mut M10-approval-reset-allowed "IF OLD.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'approval already consumed'; END IF;=>" DB-APR-12
run_mut M11-executor-may-be-requester "CHECK (consumed_by IS NULL OR consumed_by <> requested_by)=>CHECK (true)" DB-APR-10
run_mut M12-key-purpose-mutable "IF (NEW.key_id, NEW.cert_sha256, NEW.entry_id, NEW.purpose,=>IF false AND (NEW.key_id, NEW.cert_sha256, NEW.entry_id, NEW.purpose," DB-TRU-08
run_mut M13-direct-status-update "-- no direct UPDATE on status_entry or INSERT on status_transition: set_value=>GRANT UPDATE (value, row_version) ON status.status_entry TO svc_status; --" DB-STA-16
run_mut M14-session-expiry-ignored "IF now() > OLD.expires_at AND=>IF false AND" DB-VER-11
run_mut M7-status-reads-issuer "GRANT USAGE ON SCHEMA status, ops, audit TO svc_status;=>GRANT USAGE ON SCHEMA status, ops, audit, issuer TO svc_status; GRANT SELECT ON ALL TABLES IN SCHEMA issuer TO svc_status;" DB-STA-14
! grep -q SURVIVED "$OUT"
