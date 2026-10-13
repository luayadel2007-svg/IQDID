#!/usr/bin/env python3
"""TASK-6 static checks. Usage: python3 -I tools/task6_checks.py <package-dir> <out.json>"""
import json, re, sys
from pathlib import Path

import yaml

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2])
results = []


def rec(cid, ok, detail):
    results.append({"id": cid, "outcome": "PASS" if ok else "FAIL", "detail": detail})


# CHK-01 YAML / Compose structure
compose = yaml.safe_load((ROOT / "compose.yaml").read_text(encoding="utf-8"))
rec("CHK-01 compose.yaml parses as YAML", isinstance(compose, dict), "yaml.safe_load")

# CHK-02 secrets scan (package text files)
PATTERNS = {
    "pem_private_key": r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----",
    "jwt": r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}",
    "github_token": r"\bgh[pousr]_[A-Za-z0-9]{30,}",
    "aws_key": r"\bAKIA[0-9A-Z]{16}\b",
    "openai_like": r"\bsk-[A-Za-z0-9]{20,}",
    "assigned_password": r"(?i)\b(?:password|passwd|pwd|secret)\s*[:=]\s*['\"]?(?!\$|/run/secrets|\{)[^\s'\"#]{6,}",
}
ALLOW_PASSWORD_KEYS = re.compile(r"(?i)(PASSWORD_FILE|PGPASSFILE|_password\.txt|password_file)")
hits = []
for f in sorted(ROOT.rglob("*")):
    if not f.is_file() or f.suffix in {".zip", ".png"} or "evidence" in f.relative_to(ROOT).parts:
        continue
    for n, line in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        for name, pat in PATTERNS.items():
            if re.search(pat, line) and not (name == "assigned_password" and ALLOW_PASSWORD_KEYS.search(line)):
                hits.append(f"{f.relative_to(ROOT)}:{n}:{name}")
rec("CHK-02 no secrets or private keys in package", not hits, hits or "0 findings")
env_vals = [l for l in (ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
            if l and not l.startswith("#") and re.search(r"(?i)pass|secret|token|key=", l)]
rec("CHK-02b .env.example carries no secret values", not env_vals, env_vals or "only non-secret keys")
gi = (ROOT / ".gitignore").read_text(encoding="utf-8").split()
rec("CHK-02c .gitignore excludes .env, secrets/, key files",
    all(x in gi for x in [".env", "secrets/", "*.pem", "*.key"]), gi)

# CHK-03 SQL constraints present
sql = (ROOT / "sql/001_schema.sql").read_text(encoding="utf-8")
required = {
    "status_entry PK(list_id, idx)": r"PRIMARY KEY \(list_id, idx\)",
    "credential_ref UNIQUE": r"credential_ref\s+uuid NOT NULL UNIQUE",
    "revoked final trigger": r"OLD\.value = 1 AND NEW\.value <> 1",
    "CAS row_version": r"row_version = p_expected_row_version",
    "approval_ref UNIQUE": r"approval_ref\s+text NOT NULL UNIQUE",
    "approval single-use": r"consumed_at IS NULL AND expires_at > now\(\)",
    "approval not self": r"CONSTRAINT approval_not_self",
    "transition approval_id UNIQUE": r"approval_id\s+uuid UNIQUE",
    "C5 approval_ref UNIQUE": r"approval_ref\s+text UNIQUE",
    "idempotency scoped PK": r"PRIMARY KEY \(service, org_id, subject, operation, resource, idem_key\)",
    "trust key identity PK": r"key_id\s+text PRIMARY KEY",
    "trust version monotonic": r"version must increase",
    "session lifetime 120s": r"CONSTRAINT session_lifetime",
    "audit append-only": r"audit events are append-only",
}
missing = [k for k, p in required.items() if not re.search(p, sql)]
rec("CHK-03 required SQL constraints present", not missing, missing or f"{len(required)}/{len(required)}")
banned_cols = re.findall(r"^\s+(\w*(?:disclos|vp_token|claim_value|national_id|full_name|private_key)\w*)\s", sql, re.M | re.I)
rec("CHK-03b no PII/secret columns in schema", not banned_cols, banned_cols or "none")

# CHK-04 relations: every REFERENCES target is a created table
tables = set(re.findall(r"CREATE TABLE (\w+\.\w+)", sql))
refs = set(re.findall(r"REFERENCES (\w+\.\w+)", sql))
dangling = sorted(refs - tables)
rec("CHK-04 all foreign keys reference defined tables", not dangling,
    dangling or f"{len(refs)} referenced tables, {len(tables)} tables")
status_block = sql[sql.index("-- ---------------------------------------------------------------- status (C5)"):
                   sql.index("-- ---------------------------------------------------------------- idempotency")]
rec("CHK-04b status schema has no FK into issuer/iam (C5 never learns citizen)",
    not re.search(r"REFERENCES (issuer|iam)\.", status_block), "status block scanned")

# CHK-05 network bindings
svcs = compose["services"]
nets = compose["networks"]
db = svcs["db"]
problems = []
if "ports" in db:
    problems.append("db publishes ports")
if set(db.get("networks", [])) != {"data"}:
    problems.append(f"db networks {db.get('networks')}")
for n in ("app", "data"):
    if not (nets.get(n) or {}).get("internal"):
        problems.append(f"network {n} not internal")
for name, s in svcs.items():
    for p in s.get("ports", []) or []:
        if not str(p).startswith("127.0.0.1:"):
            problems.append(f"{name} port {p} not loopback")
    if not s.get("networks"):
        problems.append(f"{name} on default network")
    if "no-new-privileges:true" not in (s.get("security_opt") or []):
        problems.append(f"{name} missing no-new-privileges")
    if "ALL" not in (s.get("cap_drop") or []):
        problems.append(f"{name} missing cap_drop ALL")
identity_apps = [n for n in svcs if re.search(r"(?i)issuer|verifier|status|trust|wallet|c[2-5]", n)]
if identity_apps:
    problems.append(f"identity app services present: {identity_apps}")
rec("CHK-05 compose network binding and hardening", not problems, problems or "db internal-only; no published ports")
img = (ROOT / ".env.example").read_text(encoding="utf-8")
rec("CHK-05b image digest pinned", "@sha256:" in re.sub(r"#.*", "", img),
    "IQDID_DB_IMAGE must carry @sha256 digest")

# CHK-06 PENDING decisions not presented as APPROVED
bad = []
for f in sorted(ROOT.glob("*.md")):
    for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if re.search(r"\bOD-0[1-9]\b", line) and re.search(r"\bAPPROVED\b|\| *معتمد *\|", line) \
                and not re.search(r"PENDING|غير معتمد|لا يعتمد|لا تعتمد|NOT", line):
            bad.append(f"{f.name}:{n}")
od_file = (ROOT / "IQDID_Infrastructure_Open_Decisions.md").read_text(encoding="utf-8")
od_rows = re.findall(r"^\| (OD-0[1-9]) \|[^|]*\| \*\*(\w+)\*\* \|", od_file, re.M)
not_pending = [o for o, s in od_rows if s != "PENDING"]
if len(od_rows) != 9:
    bad.append(f"expected 9 OD rows, found {len(od_rows)}")
rec("CHK-06 OD-01..09 all PENDING, none marked APPROVED", not bad and not not_pending,
    (bad + not_pending) or "9/9 PENDING")
ret = re.findall(r"decision\s+text NOT NULL CHECK \(decision IN \('PENDING','APPROVED'\)\) DEFAULT 'PENDING'", sql)
rec("CHK-06b retention rows default PENDING", bool(ret), "ops.retention_policy.decision default")

# CHK-07 deliverables present
deliverables = [
    "TASK6_Infrastructure_Architecture_Report.md", "IQDID_Deployment_Architecture.md",
    "IQDID_Service_Network_Map.md", "IQDID_Database_Design.md",
    "IQDID_Environment_Configuration_Policy.md", "IQDID_Development_Security_Checklist.md",
    "IQDID_Local_Deployment_Guide.md", "IQDID_Infrastructure_Open_Decisions.md", "TASK6_Test_Evidence.md",
    "compose.yaml", ".env.example", "sql/001_schema.sql", "sql/090_pending_proposals.sql",
    "sql/tests/010_constraint_tests.sql",
]
absent = [d for d in deliverables if not (ROOT / d).is_file()]
rec("CHK-07 all required deliverables present", not absent, absent or f"{len(deliverables)}/{len(deliverables)}")

# CHK-08 threat coverage in checklist
chk = (ROOT / "IQDID_Development_Security_Checklist.md").read_text(encoding="utf-8")
threats = ["T-EOP-01", "T-LC-04", "T-LC-02", "T-LC-03", "T-RESP-01", "T-SSRF-01", "T-BOLA-01", "T-JWT-02",
           "T-STAT-01", "T-STAT-02", "T-TRU-01", "T-TRU-02", "T-PRV-01", "T-PRV-04", "T-REPO-10"]
nocov = [t for t in threats if f"**{t}**" not in chk]
rec("CHK-08 every required threat has a checklist row", not nocov, nocov or f"{len(threats)}/{len(threats)}")

# CHK-09 no legacy crypto dependency reintroduced
legacy = [str(f.relative_to(ROOT)) for f in ROOT.rglob("*") if f.is_file() and f.suffix in {".json", ".yaml", ".sql", ".sh", ".mjs", ".js"} and "evidence" not in f.relative_to(ROOT).parts
          and "@sd-jwt/crypto-nodejs" in f.read_text(encoding="utf-8", errors="replace")]
rec("CHK-09 no @sd-jwt/crypto-nodejs in code/config", not legacy, legacy or "none")

OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
fails = [r for r in results if r["outcome"] != "PASS"]
print(f"TASK-6 checks: {len(results) - len(fails)} PASS / {len(fails)} FAIL")
for r in fails:
    print("FAIL", r["id"], r["detail"])
sys.exit(1 if fails else 0)
