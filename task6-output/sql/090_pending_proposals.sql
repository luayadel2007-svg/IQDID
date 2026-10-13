-- IQDID TASK-6 — PENDING proposals. NOT APPLIED by default.
-- Each block tightens the schema beyond what the OpenAPI v1.1 drafts require
-- and must only be applied after the named owner decision is APPROVED.
-- Applied in TASK-6 tests solely to prove the constraint works.
BEGIN;

-- OD-07 (PENDING): verifier entries must carry a non-empty exact host allowlist.
ALTER TABLE trust.trust_entry ADD CONSTRAINT od07_verifier_hosts_required
  CHECK (role <> 'verifier' OR cardinality(allowed_response_hosts) >= 1);

-- OD-06 / DR-29 (PENDING): suspend, reinstate and revoke at C5 require an approval_ref.
ALTER TABLE status.status_transition ADD CONSTRAINT od06_approval_required
  CHECK (approval_ref IS NOT NULL);

-- D-06 (PENDING): separate status-writer from status-allocator.
-- Applied as role split at deployment: svc_status_alloc gets INSERT on
-- status_entry only; svc_status_write gets EXECUTE on status.set_value only.

COMMIT;
