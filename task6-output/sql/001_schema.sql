-- IQDID Prototype — TASK-6 proposed physical schema (PostgreSQL 16)
-- TEST ONLY. Synthetic data and test keys only. NOT APPROVED: every table,
-- column and constraint here is a proposal for owner review (see
-- IQDID_Database_Design.md). Fields pinned by OpenAPI v1.1 drafts are marked
-- [OAS]; everything else is [PROPOSED]. Items gated on an open decision are
-- marked with the OD number and live in 090_pending_proposals.sql when they
-- would contradict the current draft contracts.
--
-- Not stored anywhere in this schema (by design): disclosed claim values,
-- vp_token, KB-JWT, credentials, access tokens, c_nonce, tx_code in clear,
-- national IDs, names, private keys.

BEGIN;

-- ---------------------------------------------------------------- roles
-- Role creation is cluster-wide; guarded so the script is re-runnable.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['iqdid_owner','svc_issuer','svc_status','svc_trust',
                           'svc_verifier','svc_audit_writer','audit_reader','svc_retention']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA iam      AUTHORIZATION iqdid_owner;
CREATE SCHEMA issuer   AUTHORIZATION iqdid_owner;
CREATE SCHEMA status   AUTHORIZATION iqdid_owner;
CREATE SCHEMA trust    AUTHORIZATION iqdid_owner;
CREATE SCHEMA verifier AUTHORIZATION iqdid_owner;
CREATE SCHEMA audit    AUTHORIZATION iqdid_owner;
CREATE SCHEMA ops      AUTHORIZATION iqdid_owner;

SET ROLE iqdid_owner;

-- ---------------------------------------------------------------- iam
-- Organisations, opaque principals and role grants. No personal names:
-- principal_sub is the AuthProvider subject (opaque), OD-02 pending.
CREATE TABLE iam.organization (
  org_id        uuid PRIMARY KEY,
  org_kind      text NOT NULL CHECK (org_kind IN ('issuer','verifier','status','trust','platform')),
  legal_nature  text NOT NULL CHECK (legal_nature IN ('government','private')),
  display_code  text NOT NULL UNIQUE CHECK (display_code ~ '^TEST-[A-Z0-9-]{2,40}$'),
  state         text NOT NULL DEFAULT 'active' CHECK (state IN ('active','suspended','removed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.principal (
  principal_id  uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES iam.organization(org_id),
  principal_sub text NOT NULL,              -- AuthProvider "sub" (opaque)
  kind          text NOT NULL CHECK (kind IN ('human','service')),
  state         text NOT NULL DEFAULT 'active' CHECK (state IN ('active','disabled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, principal_sub),
  UNIQUE (org_id, principal_id)             -- target for composite FKs (tenant-safe)
);

-- [OAS] x-roles values + [PROPOSED] issuer-approver / status-writer (D-03, D-06).
CREATE TABLE iam.role_grant (
  org_id        uuid NOT NULL,
  principal_id  uuid NOT NULL,
  role          text NOT NULL CHECK (role IN (
                  'issuer-operator','issuer-authority','issuer-approver','auditor',
                  'status-allocator','status-writer','verifier-staff','trust-admin')),
  granted_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, principal_id, role),
  FOREIGN KEY (org_id, principal_id) REFERENCES iam.principal(org_id, principal_id)
);

-- ---------------------------------------------------------------- issuer (C3)
CREATE TABLE issuer.offer (
  offer_id          uuid PRIMARY KEY,                       -- [OAS] offer_id
  org_id            uuid NOT NULL REFERENCES iam.organization(org_id),
  created_by        uuid NOT NULL,
  citizen_ref_hmac  bytea NOT NULL CHECK (octet_length(citizen_ref_hmac) = 32), -- HMAC, key outside DB
  configuration_id  text NOT NULL,                          -- [OAS]
  state             text NOT NULL DEFAULT 'created'
                    CHECK (state IN ('created','fetched','issued','cancelled','expired','failed')),
  tx_code_hash      bytea,                                  -- never the clear tx_code
  tx_attempts       smallint NOT NULL DEFAULT 0 CHECK (tx_attempts BETWEEN 0 AND 5),
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,                   -- [OAS] expires_at
  CONSTRAINT offer_lifetime CHECK (expires_at > created_at AND expires_at <= created_at + interval '10 minutes'),
  FOREIGN KEY (org_id, created_by) REFERENCES iam.principal(org_id, principal_id)
);
CREATE INDEX offer_org_state_idx ON issuer.offer (org_id, state);
CREATE INDEX offer_expires_idx   ON issuer.offer (expires_at);

CREATE TABLE issuer.credential (
  credential_id    uuid PRIMARY KEY,                        -- [OAS]
  org_id           uuid NOT NULL REFERENCES iam.organization(org_id),
  offer_id         uuid NOT NULL UNIQUE REFERENCES issuer.offer(offer_id), -- one credential per offer (AP-05)
  vct              text NOT NULL,                           -- [OAS]
  state            text NOT NULL DEFAULT 'valid'
                   CHECK (state IN ('valid','suspended','revoked')), -- [OAS] state (values per draft)
  iat              timestamptz NOT NULL,                    -- [OAS]
  exp              timestamptz NOT NULL,                    -- [OAS]
  status_list_id   text NOT NULL,                           -- [OAS] status_ref (uri side)
  status_idx       integer NOT NULL CHECK (status_idx >= 0),-- [OAS] status_ref.idx (OD-05 exposure)
  row_version      bigint NOT NULL DEFAULT 1,               -- CAS (D-05)
  CONSTRAINT credential_validity CHECK (exp > iat AND exp <= iat + interval '30 days'), -- DR-18 (recommendation)
  UNIQUE (status_list_id, status_idx)
);

-- Human approval records (OD-06 / DR-29 pending). Proposed rules enforced
-- here: approver != requester, approver holds issuer-approver in the same
-- organisation, bounded lifetime, bound to action+target+request digest,
-- single use (consumed_at set exactly once).
CREATE TABLE issuer.approval (
  approval_id       uuid PRIMARY KEY,
  approval_ref      text NOT NULL UNIQUE CHECK (char_length(approval_ref) BETWEEN 1 AND 64), -- [OAS] approval_ref
  org_id            uuid NOT NULL REFERENCES iam.organization(org_id),
  action            text NOT NULL CHECK (action IN ('suspend','reinstate','revoke')),
  credential_id     uuid NOT NULL REFERENCES issuer.credential(credential_id),
  request_digest    bytea NOT NULL CHECK (octet_length(request_digest) = 32),
  requested_by      uuid NOT NULL,
  approved_by       uuid NOT NULL,
  approver_role     text GENERATED ALWAYS AS ('issuer-approver') STORED,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  consumed_at       timestamptz,
  consumed_by       uuid,
  CONSTRAINT approval_not_self CHECK (requested_by <> approved_by),
  CONSTRAINT approval_executor_not_approver CHECK (consumed_by IS NULL OR consumed_by <> approved_by),
  CONSTRAINT approval_lifetime CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 minutes'),
  CONSTRAINT approval_consumed_pair CHECK ((consumed_at IS NULL) = (consumed_by IS NULL)),
  FOREIGN KEY (org_id, requested_by) REFERENCES iam.principal(org_id, principal_id),
  FOREIGN KEY (org_id, approved_by, approver_role) REFERENCES iam.role_grant(org_id, principal_id, role)
);

-- Credential lifecycle history; approval_id UNIQUE => an approval can be used once.
CREATE TABLE issuer.credential_transition (
  transition_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  credential_id   uuid NOT NULL REFERENCES issuer.credential(credential_id),
  from_state      text NOT NULL,
  to_state        text NOT NULL,
  reason_code     text NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'), -- [OAS] pattern
  approval_id     uuid UNIQUE REFERENCES issuer.approval(approval_id),
  actor_id        uuid NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- status (C5)
-- No citizen data: credential_ref is a random UUID unknown outside C3 [OAS].
CREATE TABLE status.status_list (
  list_id            text PRIMARY KEY CHECK (list_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  list_uri           text NOT NULL UNIQUE CHECK (list_uri ~ '^https://'),  -- [OAS] list_uri
  bits               smallint NOT NULL CHECK (bits IN (1,2,4,8)),           -- DR-17: 2
  capacity           integer NOT NULL CHECK (capacity >= 8192),             -- DR-17/[OAS] >= 8192
  list_version       bigint NOT NULL DEFAULT 0 CHECK (list_version >= 0),   -- [OAS] list_version
  published_version  bigint NOT NULL DEFAULT 0,
  published_at       timestamptz,                                           -- [OAS] published_at
  CONSTRAINT published_le_list CHECK (published_version <= list_version)
);

CREATE TABLE status.status_entry (
  list_id         text NOT NULL REFERENCES status.status_list(list_id),
  idx             integer NOT NULL CHECK (idx >= 0),                  -- [OAS] idx
  credential_ref  uuid NOT NULL UNIQUE,                               -- one index per credential
  value           smallint NOT NULL DEFAULT 0 CHECK (value IN (0,1,2)),-- [OAS] 0/1/2
  row_version     bigint NOT NULL DEFAULT 1,
  allocated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, idx)                                          -- no double allocation
);

CREATE TABLE status.status_transition (
  transition_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  list_id         text NOT NULL,
  idx             integer NOT NULL,
  from_value      smallint NOT NULL,
  to_value        smallint NOT NULL,
  reason_code     text NOT NULL,
  approval_ref    text UNIQUE,                 -- C5 copy; reuse rejected (T-LC-04)
  list_version    bigint NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (list_id, idx) REFERENCES status.status_entry(list_id, idx)
);

-- ---------------------------------------------------------------- idempotency (OD-03)
-- Scope = org + subject + operation + resource + key; metadata only, never secrets.
CREATE TABLE ops.idempotency_record (
  service         text NOT NULL CHECK (service IN ('issuer','status','verifier')),
  org_id          uuid NOT NULL,
  subject         text NOT NULL,
  operation       text NOT NULL,
  resource        text NOT NULL,
  idem_key        uuid NOT NULL,                              -- [OAS] Idempotency-Key (UUID)
  request_sha256  bytea NOT NULL CHECK (octet_length(request_sha256) = 32),
  state           text NOT NULL CHECK (state IN ('in_flight','completed')),
  http_status     smallint,
  response_ref    text,                                       -- pointer, not body
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  CONSTRAINT idem_retention CHECK (expires_at <= created_at + interval '24 hours'),
  PRIMARY KEY (service, org_id, subject, operation, resource, idem_key)
);
CREATE INDEX idem_expires_idx ON ops.idempotency_record (expires_at);

-- ---------------------------------------------------------------- trust (C4)
CREATE TABLE trust.trust_list_version (
  version          bigint PRIMARY KEY CHECK (version >= 1),   -- [OAS] version
  iat              bigint NOT NULL,                           -- [OAS]
  exp              bigint NOT NULL,                           -- [OAS]
  payload_sha256   bytea NOT NULL CHECK (octet_length(payload_sha256) = 32),
  published_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (exp > iat)
);

CREATE TABLE trust.trust_entry (
  entry_id                text PRIMARY KEY,                    -- [OAS]
  role                    text NOT NULL CHECK (role IN ('issuer','verifier','status')), -- [OAS]
  identifier              text NOT NULL,                       -- [OAS]
  display_name_ar         text NOT NULL,                       -- [OAS] display_name.ar
  display_name_en         text NOT NULL,                       -- [OAS] display_name.en
  legal_nature            text CHECK (legal_nature IN ('government','private')), -- [OAS]
  allowed_vct             text[] NOT NULL DEFAULT '{}',        -- [OAS]
  allowed_response_hosts  text[] NOT NULL DEFAULT '{}',        -- [OAS] optional (OD-07)
  state                   text NOT NULL CHECK (state IN ('active','suspended','removed')), -- [OAS]
  valid_from              bigint NOT NULL,                     -- [OAS]
  valid_to                bigint NOT NULL,                     -- [OAS]
  org_id                  uuid REFERENCES iam.organization(org_id),
  CHECK (valid_to > valid_from),
  CONSTRAINT trust_verifier_x509_hash CHECK (role <> 'verifier' OR identifier ~ '^x509_hash:[A-Za-z0-9_-]{43}$'),
  CONSTRAINT trust_issuer_https CHECK (role <> 'issuer' OR identifier ~ '^https://'),
  UNIQUE (role, identifier)
);

-- Exact-host allowlist (no wildcard / scheme / path / port-less ambiguity).
CREATE TABLE trust.response_host (
  entry_id  text NOT NULL REFERENCES trust.trust_entry(entry_id),
  host      text NOT NULL CONSTRAINT response_host_exact CHECK (host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  PRIMARY KEY (entry_id, host)
);

-- [PROPOSED, OD-08 / D-07] TrustEntry has no key field in OAS v1.1 (INT-10
-- originally had "keys"). key_id = RFC 7638 SHA-256 JWK thumbprint. PK on
-- key_id + UNIQUE cert fingerprint => one key identity serves exactly one
-- entry/purpose for its whole history (rows are retired, never deleted).
CREATE TABLE trust.trust_key (
  key_id           text PRIMARY KEY CHECK (key_id ~ '^[A-Za-z0-9_-]{43}$'),
  cert_sha256      bytea NOT NULL UNIQUE CHECK (octet_length(cert_sha256) = 32),
  entry_id         text NOT NULL REFERENCES trust.trust_entry(entry_id),
  purpose          text NOT NULL CHECK (purpose IN (
                     'credential_signing','status_list_signing','trust_list_signing','verifier_request_signing')),
  not_before       timestamptz NOT NULL,
  not_after        timestamptz NOT NULL,
  retired_at       timestamptz,
  CHECK (not_after > not_before)
);

CREATE TABLE trust.service_policy (
  entry_id          text NOT NULL REFERENCES trust.trust_entry(entry_id),
  service_id        text NOT NULL,                           -- [OAS]
  purpose           text NOT NULL,                           -- [OAS]
  policy_json       jsonb NOT NULL,                          -- [OAS] fields/retention/reuse/legal_basis
  PRIMARY KEY (entry_id, service_id)
);

-- ---------------------------------------------------------------- verifier (C2-B)
-- Session metadata only. Disclosed values live in process memory (<=60 s,
-- read once) and are never written here (PRV-05 / T-PRV-01).
CREATE TABLE verifier.verification_session (
  session_id             uuid PRIMARY KEY,                    -- [OAS] session_id
  org_id                 uuid NOT NULL REFERENCES iam.organization(org_id),
  created_by             uuid NOT NULL,                       -- OD-01 owner binding
  service_id             text NOT NULL,
  nonce_sha256           bytea NOT NULL UNIQUE CHECK (octet_length(nonce_sha256) = 32),
  state                  text NOT NULL DEFAULT 'created' CHECK (state IN (
                           'created','request_fetched','response_received','result_delivered','expired','failed')),
  request_fetched_at     timestamptz,
  response_received_at   timestamptz,
  result_code            text,
  requested_field_names  text[] NOT NULL DEFAULT '{}',        -- names only, never values
  created_at             timestamptz NOT NULL DEFAULT now(),
  expires_at             timestamptz NOT NULL,
  CONSTRAINT session_lifetime CHECK (expires_at > created_at AND expires_at <= created_at + interval '120 seconds'), -- M-05
  FOREIGN KEY (org_id, created_by) REFERENCES iam.principal(org_id, principal_id)
);
CREATE INDEX vsession_owner_idx ON verifier.verification_session (org_id, created_by);
CREATE INDEX vsession_expires_idx ON verifier.verification_session (expires_at);

-- ---------------------------------------------------------------- audit (C6)
CREATE TABLE audit.audit_event (
  seq            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id       uuid NOT NULL UNIQUE,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  component      text NOT NULL CHECK (component IN ('C2-B','C3','C4','C5','C6','AUTH','OPS')),
  event_type     text NOT NULL CHECK (event_type ~ '^[a-z][a-z0-9_.]{2,63}$'),
  actor_role     text,                       -- role, never a person's name
  org_id         uuid,
  object_type    text,
  object_id      uuid,                       -- opaque internal id only
  result_code    text,
  field_names    text[] NOT NULL DEFAULT '{}',
  request_id     text CHECK (request_id IS NULL OR request_id ~ '^[A-Za-z0-9._-]{1,64}$'),
  prev_hash      bytea NOT NULL,
  hash           bytea NOT NULL UNIQUE
);

-- ---------------------------------------------------------------- retention (OD-04)
CREATE TABLE ops.retention_policy (
  object_class   text PRIMARY KEY,
  keep_for       interval NOT NULL,
  basis          text NOT NULL,
  decision       text NOT NULL CHECK (decision IN ('PENDING','APPROVED')) DEFAULT 'PENDING'
);
INSERT INTO ops.retention_policy (object_class, keep_for, basis) VALUES
  ('issuer.offer',                  interval '1 day',     'offer 10 min + ops margin [PROPOSED]'),
  ('ops.idempotency_record',        interval '24 hours',  'Recovered §6 assumption / OD-03'),
  ('verifier.verification_session', interval '24 hours',  'metadata only; OD-04'),
  ('issuer.approval',               interval '36 months', 'audit linkage; governance §18 [PROPOSED]'),
  ('audit.audit_event',             interval '36 months', 'central audit 36 months [PROPOSED]');

-- ================================================================ functions
-- Revoked is final (DR-66 / OD-09) — enforced in the database, not only in code.
CREATE FUNCTION status.enforce_entry_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_bits smallint;
BEGIN
  IF OLD.value = 1 AND NEW.value <> 1 THEN
    RAISE EXCEPTION 'STA-4091 revoked is final' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.value = 2 THEN
    SELECT bits INTO v_bits FROM status.status_list WHERE list_id = NEW.list_id;
    IF v_bits < 2 THEN RAISE EXCEPTION 'STA-4221 suspended needs bits>=2'; END IF;
  END IF;
  IF NEW.idx <> OLD.idx OR NEW.list_id <> OLD.list_id OR NEW.credential_ref <> OLD.credential_ref THEN
    RAISE EXCEPTION 'status entry identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER status_entry_rules BEFORE UPDATE ON status.status_entry
  FOR EACH ROW EXECUTE FUNCTION status.enforce_entry_rules();

CREATE FUNCTION status.enforce_alloc_bounds() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_cap integer;
BEGIN
  SELECT capacity INTO v_cap FROM status.status_list WHERE list_id = NEW.list_id;
  IF NEW.idx >= v_cap THEN RAISE EXCEPTION 'idx outside list capacity'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER status_entry_bounds BEFORE INSERT ON status.status_entry
  FOR EACH ROW EXECUTE FUNCTION status.enforce_alloc_bounds();

CREATE FUNCTION status.enforce_publish_monotonic() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.list_version < OLD.list_version OR NEW.published_version < OLD.published_version THEN
    RAISE EXCEPTION 'status list versions are monotonic';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER status_list_monotonic BEFORE UPDATE ON status.status_list
  FOR EACH ROW EXECUTE FUNCTION status.enforce_publish_monotonic();

-- Atomic CAS transition. Returns new list_version; 1->1 is a no-op (no bump).
CREATE FUNCTION status.set_value(p_list text, p_idx integer, p_value smallint,
                                 p_expected_row_version bigint, p_reason text,
                                 p_approval_ref text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_old smallint; v_ver bigint;
BEGIN
  SELECT value INTO v_old FROM status.status_entry
   WHERE list_id = p_list AND idx = p_idx FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STA-4040 entry not found'; END IF;
  IF v_old = 1 AND p_value = 1 THEN
    SELECT list_version INTO v_ver FROM status.status_list WHERE list_id = p_list;
    RETURN v_ver;                                  -- idempotent no-op
  END IF;
  UPDATE status.status_entry
     SET value = p_value, row_version = row_version + 1
   WHERE list_id = p_list AND idx = p_idx AND row_version = p_expected_row_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'CAS-4090 row_version mismatch'; END IF;
  UPDATE status.status_list SET list_version = list_version + 1
   WHERE list_id = p_list RETURNING list_version INTO v_ver;
  INSERT INTO status.status_transition (list_id, idx, from_value, to_value, reason_code, approval_ref, list_version)
  VALUES (p_list, p_idx, v_old, p_value, p_reason, p_approval_ref, v_ver);
  RETURN v_ver;
END $$;

-- Issuer side mirrors finality.
CREATE FUNCTION issuer.enforce_credential_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'revoked' AND NEW.state <> 'revoked' THEN
    RAISE EXCEPTION 'ISS revoked is final';
  END IF;
  IF NEW.status_list_id <> OLD.status_list_id OR NEW.status_idx <> OLD.status_idx THEN
    RAISE EXCEPTION 'status_ref is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER credential_rules BEFORE UPDATE ON issuer.credential
  FOR EACH ROW EXECUTE FUNCTION issuer.enforce_credential_rules();

-- Single-use, bound approval consumption (OD-06 proposal).
CREATE FUNCTION issuer.consume_approval(p_ref text, p_org uuid, p_action text,
                                        p_credential uuid, p_digest bytea, p_executor uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE issuer.approval
     SET consumed_at = now(), consumed_by = p_executor
   WHERE approval_ref = p_ref AND org_id = p_org AND action = p_action
     AND credential_id = p_credential AND request_digest = p_digest
     AND consumed_at IS NULL AND expires_at > now()
  RETURNING approval_id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'API-4030 approval invalid, expired, mismatched or used'; END IF;
  RETURN v_id;
END $$;

CREATE FUNCTION trust.enforce_version_monotonic() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM trust.trust_list_version WHERE version >= NEW.version) THEN
    RAISE EXCEPTION 'trust list version must increase (SEC-02)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trust_version_monotonic BEFORE INSERT ON trust.trust_list_version
  FOR EACH ROW EXECUTE FUNCTION trust.enforce_version_monotonic();

-- Verifier session state machine: one response per session, fetch once.
CREATE FUNCTION verifier.enforce_session_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT ( (OLD.state = NEW.state)
        OR (OLD.state = 'created'           AND NEW.state IN ('request_fetched','expired','failed'))
        OR (OLD.state = 'request_fetched'   AND NEW.state IN ('response_received','expired','failed'))
        OR (OLD.state = 'response_received' AND NEW.state IN ('result_delivered','expired','failed')) ) THEN
    RAISE EXCEPTION 'illegal session transition % -> %', OLD.state, NEW.state;
  END IF;
  IF OLD.request_fetched_at IS NOT NULL AND NEW.request_fetched_at IS DISTINCT FROM OLD.request_fetched_at THEN
    RAISE EXCEPTION 'request_uri already fetched';
  END IF;
  IF OLD.response_received_at IS NOT NULL AND NEW.response_received_at IS DISTINCT FROM OLD.response_received_at THEN
    RAISE EXCEPTION 'response already received';
  END IF;
  IF NEW.org_id <> OLD.org_id OR NEW.created_by <> OLD.created_by THEN
    RAISE EXCEPTION 'session ownership is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER session_transition BEFORE UPDATE ON verifier.verification_session
  FOR EACH ROW EXECUTE FUNCTION verifier.enforce_session_transition();

-- Audit: hash chain on insert; no UPDATE; DELETE only inside ops purge.
CREATE FUNCTION audit.chain_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE v_prev bytea;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('iqdid.audit.chain'));
  SELECT hash INTO v_prev FROM audit.audit_event ORDER BY seq DESC LIMIT 1;
  NEW.prev_hash := COALESCE(v_prev, '\x00'::bytea);
  NEW.hash := sha256(NEW.prev_hash || convert_to(concat_ws('|', NEW.event_id, NEW.occurred_at,
                NEW.component, NEW.event_type, NEW.actor_role, NEW.org_id, NEW.object_type,
                NEW.object_id, NEW.result_code, array_to_string(NEW.field_names, ','), NEW.request_id), 'UTF8'));
  RETURN NEW;
END $$;
CREATE TRIGGER audit_chain BEFORE INSERT ON audit.audit_event
  FOR EACH ROW EXECUTE FUNCTION audit.chain_event();

CREATE FUNCTION audit.block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('iqdid.audit_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit events are append-only';
END $$;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON audit.audit_event
  FOR EACH ROW EXECUTE FUNCTION audit.block_mutation();

-- Retention purge (runs as svc_retention through SECURITY DEFINER).
CREATE FUNCTION ops.purge_expired() RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  DELETE FROM ops.idempotency_record WHERE expires_at < now();
  DELETE FROM verifier.verification_session
   WHERE expires_at < now() - (SELECT keep_for FROM ops.retention_policy WHERE object_class = 'verifier.verification_session');
  UPDATE issuer.offer SET state = 'expired' WHERE state IN ('created','fetched') AND expires_at < now();
  PERFORM set_config('iqdid.audit_purge', 'on', true);
  DELETE FROM audit.audit_event
   WHERE occurred_at < now() - (SELECT keep_for FROM ops.retention_policy WHERE object_class = 'audit.audit_event');
  PERFORM set_config('iqdid.audit_purge', 'off', true);
  INSERT INTO audit.audit_event (event_id, component, event_type, actor_role)
  VALUES (gen_random_uuid(), 'OPS', 'retention.purge', 'svc_retention');
END $$;

RESET ROLE;

-- ================================================================ grants (least privilege)
REVOKE ALL ON ALL TABLES IN SCHEMA iam, issuer, status, trust, verifier, audit, ops FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA issuer, status, trust, verifier, audit, ops FROM PUBLIC;

GRANT USAGE ON SCHEMA iam, issuer, ops, audit TO svc_issuer;
GRANT SELECT ON iam.organization, iam.principal, iam.role_grant TO svc_issuer;
GRANT SELECT, INSERT, UPDATE ON issuer.offer, issuer.credential, issuer.approval TO svc_issuer;
GRANT SELECT, INSERT ON issuer.credential_transition TO svc_issuer;
GRANT EXECUTE ON FUNCTION issuer.consume_approval(text,uuid,text,uuid,bytea,uuid) TO svc_issuer;

GRANT USAGE ON SCHEMA status, ops, audit TO svc_status;           -- no iam/issuer access
GRANT SELECT, INSERT ON status.status_entry TO svc_status;
GRANT SELECT, UPDATE (list_version, published_version, published_at) ON status.status_list TO svc_status;
GRANT SELECT ON status.status_transition TO svc_status;
GRANT EXECUTE ON FUNCTION status.set_value(text,integer,smallint,bigint,text,text) TO svc_status;
-- set_value runs as caller: grant only the columns it needs.
GRANT UPDATE (value, row_version) ON status.status_entry TO svc_status;
GRANT INSERT ON status.status_transition TO svc_status;

GRANT USAGE ON SCHEMA trust, audit TO svc_trust;
GRANT SELECT, INSERT, UPDATE ON trust.trust_entry, trust.response_host, trust.trust_key, trust.service_policy TO svc_trust;
GRANT SELECT, INSERT ON trust.trust_list_version TO svc_trust;

GRANT USAGE ON SCHEMA verifier, iam, ops, audit TO svc_verifier;
GRANT SELECT ON iam.principal, iam.role_grant TO svc_verifier;
GRANT SELECT, INSERT, UPDATE ON verifier.verification_session TO svc_verifier;

GRANT SELECT, INSERT, UPDATE ON ops.idempotency_record TO svc_issuer, svc_status, svc_verifier;

GRANT USAGE ON SCHEMA audit TO svc_audit_writer, audit_reader;
GRANT INSERT ON audit.audit_event TO svc_issuer, svc_status, svc_trust, svc_verifier, svc_audit_writer;
GRANT SELECT ON audit.audit_event TO audit_reader;

GRANT USAGE ON SCHEMA ops TO svc_retention;
GRANT EXECUTE ON FUNCTION ops.purge_expired() TO svc_retention;

COMMIT;
