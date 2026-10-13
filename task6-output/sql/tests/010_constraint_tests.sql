-- IQDID TASK-6 — constraint tests against a throwaway local PostgreSQL.
-- Synthetic data only. Each negative test must fail with the expected reason
-- (DR-67: a rejection only counts when the cause matches).
\set ON_ERROR_STOP on
CREATE SCHEMA t;
CREATE TABLE t.result (id text PRIMARY KEY, outcome text NOT NULL, detail text);

CREATE FUNCTION t.expect_error(p_id text, p_sql text, p_pattern text, p_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    IF p_role IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I', p_role); END IF;
    EXECUTE p_sql;
    RESET ROLE;
    INSERT INTO t.result VALUES (p_id, 'FAIL', 'statement succeeded; expected error ~ ' || p_pattern);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLERRM ~* p_pattern THEN
      INSERT INTO t.result VALUES (p_id, 'PASS', SQLERRM);
    ELSE
      INSERT INTO t.result VALUES (p_id, 'FAIL', 'wrong reason: ' || SQLERRM);
    END IF;
  END;
END $$;

CREATE FUNCTION t.expect_ok(p_id text, p_sql text, p_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    IF p_role IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I', p_role); END IF;
    EXECUTE p_sql;
    RESET ROLE;
    INSERT INTO t.result VALUES (p_id, 'PASS', 'ok');
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO t.result VALUES (p_id, 'FAIL', SQLERRM);
  END;
END $$;

-- ---------------------------------------------------------------- seed (synthetic)
INSERT INTO iam.organization VALUES
 ('00000000-0000-4000-8000-00000000a001','issuer','government','TEST-ISSUER-A','active',now()),
 ('00000000-0000-4000-8000-00000000b001','verifier','private','TEST-VERIFIER-B','active',now()),
 ('00000000-0000-4000-8000-00000000c001','verifier','private','TEST-VERIFIER-C','active',now());
INSERT INTO iam.principal VALUES
 ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-00000000a001','test-sub-op','human','active',now()),
 ('00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-00000000a001','test-sub-auth','human','active',now()),
 ('00000000-0000-4000-8000-0000000000a3','00000000-0000-4000-8000-00000000a001','test-sub-appr','human','active',now()),
 ('00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-00000000b001','test-sub-vb','human','active',now()),
 ('00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-00000000c001','test-sub-vc','human','active',now());
INSERT INTO iam.role_grant (org_id, principal_id, role) VALUES
 ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000a1','issuer-operator'),
 ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000a2','issuer-authority'),
 ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000a3','issuer-approver');
INSERT INTO issuer.offer (offer_id, org_id, created_by, citizen_ref_hmac, configuration_id, expires_at) VALUES
 ('00000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000a1',
  sha256('TEST-citizen-1'::bytea),'CRT-01', now() + interval '10 minutes'),
 ('00000000-0000-4000-8000-0000000000f2','00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000a1',
  sha256('TEST-citizen-2'::bytea),'CRT-01', now() + interval '10 minutes');
INSERT INTO status.status_list (list_id, list_uri, bits, capacity) VALUES
 ('L1','https://status.digital-id.test/lists/L1',2,8192),
 ('L1BIT','https://status.digital-id.test/lists/L1BIT',1,8192);
INSERT INTO status.status_entry (list_id, idx, credential_ref) VALUES
 ('L1',4711,'00000000-0000-4000-8000-0000000000e1'),
 ('L1',  93,'00000000-0000-4000-8000-0000000000e2'),
 ('L1BIT',5,'00000000-0000-4000-8000-0000000000e3');
INSERT INTO issuer.credential (credential_id, org_id, offer_id, vct, iat, exp, status_list_id, status_idx) VALUES
 ('00000000-0000-4000-8000-0000000000e1','00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000f1',
  'urn:test:CRT-01', now(), now() + interval '30 days','L1',4711);
INSERT INTO trust.trust_entry (entry_id, role, identifier, display_name_ar, display_name_en, state, valid_from, valid_to) VALUES
 ('E-ISS','issuer','https://issuer.digital-id.test','جهة إصدار اختبارية','Test issuer','active',1,2000000000),
 ('E-STA','status','status.digital-id.test','حالة اختبارية','Test status','active',1,2000000000);
INSERT INTO trust.trust_key VALUES
 (repeat('A',43), sha256('cert-iss'::bytea),'E-ISS','credential_signing',now(),now()+interval '1 year',NULL);
INSERT INTO verifier.verification_session (session_id, org_id, created_by, service_id, nonce_sha256, expires_at) VALUES
 ('00000000-0000-4000-8000-0000000005e1','00000000-0000-4000-8000-00000000b001','00000000-0000-4000-8000-0000000000b1',
  'svc-age', sha256('nonce-1'::bytea), now() + interval '120 seconds');

-- ---------------------------------------------------------------- status / revocation
SELECT t.expect_error('DB-STA-01 duplicate index allocation',
 $q$INSERT INTO status.status_entry (list_id, idx, credential_ref) VALUES ('L1',4711,'00000000-0000-4000-8000-0000000000e9')$q$,
 'duplicate key.*status_entry_pkey');
SELECT t.expect_error('DB-STA-02 second index for same credential',
 $q$INSERT INTO status.status_entry (list_id, idx, credential_ref) VALUES ('L1',5000,'00000000-0000-4000-8000-0000000000e1')$q$,
 'duplicate key.*credential_ref');
SELECT t.expect_error('DB-STA-03 idx beyond capacity',
 $q$INSERT INTO status.status_entry (list_id, idx, credential_ref) VALUES ('L1',8192,'00000000-0000-4000-8000-0000000000e8')$q$,
 'outside list capacity');
SELECT t.expect_ok('DB-STA-04 valid->suspended via CAS',
 $q$SELECT status.set_value('L1',4711,2::smallint,1,'investigation','APR-T-1')$q$, 'svc_status');
SELECT t.expect_error('DB-STA-05 stale CAS rejected (T-LC-02/03)',
 $q$SELECT status.set_value('L1',4711,0::smallint,1,'reinstated','APR-T-2')$q$, 'CAS-4090', 'svc_status');
SELECT t.expect_ok('DB-STA-06 suspended->revoked',
 $q$SELECT status.set_value('L1',4711,1::smallint,2,'compromise','APR-T-3')$q$, 'svc_status');
SELECT t.expect_error('DB-STA-07 revoked->valid rejected (DR-66/OD-09)',
 $q$SELECT status.set_value('L1',4711,0::smallint,3,'reinstated','APR-T-4')$q$, 'STA-4091', 'svc_status');
SELECT t.expect_error('DB-STA-08 revoked->suspended direct UPDATE rejected',
 $q$UPDATE status.status_entry SET value = 2 WHERE list_id='L1' AND idx=4711$q$, 'STA-4091');
DO $$
DECLARE v_before bigint; v_after bigint;
BEGIN
  SELECT list_version INTO v_before FROM status.status_list WHERE list_id='L1';
  PERFORM status.set_value('L1',4711,1::smallint,3,'compromise',NULL);
  SELECT list_version INTO v_after FROM status.status_list WHERE list_id='L1';
  INSERT INTO t.result VALUES ('DB-STA-09 revoked->revoked is no-op without version bump',
    CASE WHEN v_before = v_after THEN 'PASS' ELSE 'FAIL' END, v_before || '->' || v_after);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO t.result VALUES ('DB-STA-09 revoked->revoked is no-op without version bump', 'FAIL', SQLERRM);
END $$;
SELECT t.expect_error('DB-STA-10 approval_ref reuse at C5 rejected (T-LC-04)',
 $q$SELECT status.set_value('L1',93,2::smallint,1,'investigation','APR-T-1')$q$, 'duplicate key.*approval_ref', 'svc_status');
SELECT t.expect_error('DB-STA-11 suspended on 1-bit list rejected',
 $q$SELECT status.set_value('L1BIT',5,2::smallint,1,'investigation','APR-T-5')$q$, 'STA-4221', 'svc_status');
SELECT t.expect_error('DB-STA-12 list_version cannot go backwards',
 $q$UPDATE status.status_list SET list_version = 0 WHERE list_id='L1'$q$, 'monotonic');
SELECT t.expect_error('DB-STA-13 published_version cannot exceed list_version',
 $q$UPDATE status.status_list SET published_version = list_version + 1 WHERE list_id='L1'$q$, 'published_le_list');
SELECT t.expect_error('DB-STA-14 svc_status cannot read issuer data (privacy)',
 $q$SELECT * FROM issuer.credential$q$, 'permission denied', 'svc_status');
SELECT t.expect_error('DB-STA-15 svc_status cannot DELETE entries',
 $q$DELETE FROM status.status_entry$q$, 'permission denied', 'svc_status');

-- ---------------------------------------------------------------- issuer / approvals
SELECT t.expect_error('DB-APR-01 self-approval rejected (T-EOP-01)',
 $q$INSERT INTO issuer.approval (approval_id, approval_ref, org_id, action, credential_id, request_digest, requested_by, approved_by, expires_at)
    VALUES (gen_random_uuid(),'APR-SELF','00000000-0000-4000-8000-00000000a001','revoke','00000000-0000-4000-8000-0000000000e1',
            sha256('r1'::bytea),'00000000-0000-4000-8000-0000000000a3','00000000-0000-4000-8000-0000000000a3', now()+interval '10 minutes')$q$,
 'approval_not_self');
SELECT t.expect_error('DB-APR-02 approver without issuer-approver role rejected',
 $q$INSERT INTO issuer.approval (approval_id, approval_ref, org_id, action, credential_id, request_digest, requested_by, approved_by, expires_at)
    VALUES (gen_random_uuid(),'APR-NOROLE','00000000-0000-4000-8000-00000000a001','revoke','00000000-0000-4000-8000-0000000000e1',
            sha256('r1'::bytea),'00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-0000000000a1', now()+interval '10 minutes')$q$,
 'foreign key');
SELECT t.expect_error('DB-APR-03 approval lifetime > 30 min rejected',
 $q$INSERT INTO issuer.approval (approval_id, approval_ref, org_id, action, credential_id, request_digest, requested_by, approved_by, expires_at)
    VALUES (gen_random_uuid(),'APR-LONG','00000000-0000-4000-8000-00000000a001','revoke','00000000-0000-4000-8000-0000000000e1',
            sha256('r1'::bytea),'00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-0000000000a3', now()+interval '2 hours')$q$,
 'approval_lifetime');
INSERT INTO issuer.approval (approval_id, approval_ref, org_id, action, credential_id, request_digest, requested_by, approved_by, expires_at)
 VALUES ('00000000-0000-4000-8000-0000000000d1','APR-OK-1','00000000-0000-4000-8000-00000000a001','revoke',
         '00000000-0000-4000-8000-0000000000e1', sha256('r1'::bytea),
         '00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-0000000000a3', now()+interval '10 minutes');
SELECT t.expect_error('DB-APR-04 approval bound to other action rejected',
 $q$SELECT issuer.consume_approval('APR-OK-1','00000000-0000-4000-8000-00000000a001','suspend',
     '00000000-0000-4000-8000-0000000000e1', sha256('r1'::bytea),'00000000-0000-4000-8000-0000000000a2')$q$, 'API-4030', 'svc_issuer');
SELECT t.expect_error('DB-APR-05 approval with other request digest rejected',
 $q$SELECT issuer.consume_approval('APR-OK-1','00000000-0000-4000-8000-00000000a001','revoke',
     '00000000-0000-4000-8000-0000000000e1', sha256('r2'::bytea),'00000000-0000-4000-8000-0000000000a2')$q$, 'API-4030', 'svc_issuer');
SELECT t.expect_ok('DB-APR-06 matching approval consumed once',
 $q$SELECT issuer.consume_approval('APR-OK-1','00000000-0000-4000-8000-00000000a001','revoke',
     '00000000-0000-4000-8000-0000000000e1', sha256('r1'::bytea),'00000000-0000-4000-8000-0000000000a2')$q$, 'svc_issuer');
SELECT t.expect_error('DB-APR-07 approval replay rejected',
 $q$SELECT issuer.consume_approval('APR-OK-1','00000000-0000-4000-8000-00000000a001','revoke',
     '00000000-0000-4000-8000-0000000000e1', sha256('r1'::bytea),'00000000-0000-4000-8000-0000000000a2')$q$, 'API-4030', 'svc_issuer');
SELECT t.expect_error('DB-APR-08 executor equal to approver rejected',
 $q$UPDATE issuer.approval SET consumed_at = NULL, consumed_by = NULL WHERE approval_ref='APR-OK-1';
    UPDATE issuer.approval SET consumed_at = now(), consumed_by = approved_by WHERE approval_ref='APR-OK-1'$q$, 'approval_executor_not_approver');
INSERT INTO issuer.credential_transition (credential_id, from_state, to_state, reason_code, approval_id, actor_id)
 VALUES ('00000000-0000-4000-8000-0000000000e1','valid','revoked','compromise','00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a2');
SELECT t.expect_error('DB-APR-09 same approval on two transitions rejected',
 $q$INSERT INTO issuer.credential_transition (credential_id, from_state, to_state, reason_code, approval_id, actor_id)
    VALUES ('00000000-0000-4000-8000-0000000000e1','valid','suspended','investigation','00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a2')$q$,
 'duplicate key.*approval_id');
UPDATE issuer.credential SET state = 'revoked' WHERE credential_id = '00000000-0000-4000-8000-0000000000e1';
SELECT t.expect_error('DB-ISS-01 issuer revoked->valid rejected',
 $q$UPDATE issuer.credential SET state='valid' WHERE credential_id='00000000-0000-4000-8000-0000000000e1'$q$, 'revoked is final');
SELECT t.expect_error('DB-ISS-02 second credential for same offer rejected',
 $q$INSERT INTO issuer.credential (credential_id, org_id, offer_id, vct, iat, exp, status_list_id, status_idx)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000f1','urn:test:CRT-01',now(),now()+interval '1 day','L1',93)$q$,
 'duplicate key.*offer_id');
SELECT t.expect_error('DB-ISS-03 credential validity > 30 days rejected',
 $q$INSERT INTO issuer.credential (credential_id, org_id, offer_id, vct, iat, exp, status_list_id, status_idx)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000f2','urn:test:CRT-01',now(),now()+interval '31 days','L1',93)$q$,
 'credential_validity');
SELECT t.expect_error('DB-ISS-04 offer lifetime > 10 min rejected',
 $q$INSERT INTO issuer.offer (offer_id, org_id, created_by, citizen_ref_hmac, configuration_id, expires_at)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000a1',sha256('x'::bytea),'CRT-01',now()+interval '1 hour')$q$,
 'offer_lifetime');
SELECT t.expect_error('DB-ISS-05 cross-tenant creator rejected (composite FK)',
 $q$INSERT INTO issuer.offer (offer_id, org_id, created_by, citizen_ref_hmac, configuration_id, expires_at)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-0000000000b1',sha256('x'::bytea),'CRT-01',now()+interval '5 minutes')$q$,
 'foreign key');

-- ---------------------------------------------------------------- idempotency
INSERT INTO ops.idempotency_record VALUES ('issuer','00000000-0000-4000-8000-00000000a001','test-sub-op','createOffer','offers',
 '00000000-0000-4000-8000-000000001d01', sha256('body1'::bytea),'completed',201,'offer:f1',now(),now()+interval '24 hours');
SELECT t.expect_error('DB-IDM-01 same key same scope rejected',
 $q$INSERT INTO ops.idempotency_record VALUES ('issuer','00000000-0000-4000-8000-00000000a001','test-sub-op','createOffer','offers',
   '00000000-0000-4000-8000-000000001d01', sha256('body2'::bytea),'in_flight',NULL,NULL,now(),now()+interval '1 hour')$q$, 'duplicate key');
SELECT t.expect_ok('DB-IDM-02 same key in another org is isolated',
 $q$INSERT INTO ops.idempotency_record VALUES ('issuer','00000000-0000-4000-8000-00000000b001','test-sub-op','createOffer','offers',
   '00000000-0000-4000-8000-000000001d01', sha256('body1'::bytea),'in_flight',NULL,NULL,now(),now()+interval '1 hour')$q$);
SELECT t.expect_error('DB-IDM-03 retention > 24h rejected',
 $q$INSERT INTO ops.idempotency_record VALUES ('status','00000000-0000-4000-8000-00000000a001','s','set','L1/1',
   gen_random_uuid(), sha256('b'::bytea),'in_flight',NULL,NULL,now(),now()+interval '25 hours')$q$, 'idem_retention');

-- ---------------------------------------------------------------- trust
SELECT t.expect_error('DB-TRU-01 same key identity in second role rejected (OD-08 proposal)',
 $q$INSERT INTO trust.trust_key VALUES (repeat('A',43), sha256('cert-sta'::bytea),'E-STA','status_list_signing',now(),now()+interval '1 year',NULL)$q$,
 'duplicate key.*trust_key_pkey');
SELECT t.expect_error('DB-TRU-02 same certificate under new key_id rejected',
 $q$INSERT INTO trust.trust_key VALUES (repeat('B',43), sha256('cert-iss'::bytea),'E-STA','status_list_signing',now(),now()+interval '1 year',NULL)$q$,
 'duplicate key.*cert_sha256');
INSERT INTO trust.trust_list_version (version, iat, exp, payload_sha256) VALUES (5, 100, 200, sha256('tl5'::bytea));
SELECT t.expect_error('DB-TRU-03 older trust list version rejected (T-TRU-02)',
 $q$INSERT INTO trust.trust_list_version (version, iat, exp, payload_sha256) VALUES (4, 100, 200, sha256('tl4'::bytea))$q$, 'must increase');
SELECT t.expect_error('DB-TRU-04 wildcard response host rejected (T-RESP-01)',
 $q$INSERT INTO trust.response_host VALUES ('E-ISS','*.evil.test')$q$, 'response_host_exact');
SELECT t.expect_error('DB-TRU-05 host with path/port rejected',
 $q$INSERT INTO trust.response_host VALUES ('E-ISS','verifier.test:8443/x')$q$, 'response_host_exact');
SELECT t.expect_error('DB-TRU-06 malformed verifier identifier rejected',
 $q$INSERT INTO trust.trust_entry (entry_id, role, identifier, display_name_ar, display_name_en, state, valid_from, valid_to)
    VALUES ('E-V-BAD','verifier','x509_san_dns:verifier.test','م','V','active',1,2)$q$, 'trust_verifier_x509_hash');

-- ---------------------------------------------------------------- verifier sessions
SELECT t.expect_error('DB-VER-01 session lifetime > 120 s rejected',
 $q$INSERT INTO verifier.verification_session (session_id, org_id, created_by, service_id, nonce_sha256, expires_at)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-00000000b001','00000000-0000-4000-8000-0000000000b1','svc',sha256('n2'::bytea),now()+interval '10 minutes')$q$,
 'session_lifetime');
SELECT t.expect_error('DB-VER-02 nonce reuse across sessions rejected',
 $q$INSERT INTO verifier.verification_session (session_id, org_id, created_by, service_id, nonce_sha256, expires_at)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-00000000b001','00000000-0000-4000-8000-0000000000b1','svc',sha256('nonce-1'::bytea),now()+interval '60 seconds')$q$,
 'duplicate key.*nonce_sha256');
SELECT t.expect_ok('DB-VER-03 request fetched once',
 $q$UPDATE verifier.verification_session SET state='request_fetched', request_fetched_at=now() WHERE session_id='00000000-0000-4000-8000-0000000005e1'$q$, 'svc_verifier');
SELECT t.expect_error('DB-VER-04 second request fetch rejected',
 $q$UPDATE verifier.verification_session SET request_fetched_at=now()+interval '1 second' WHERE session_id='00000000-0000-4000-8000-0000000005e1'$q$, 'already fetched');
SELECT t.expect_ok('DB-VER-05 first response accepted',
 $q$UPDATE verifier.verification_session SET state='response_received', response_received_at=now() WHERE session_id='00000000-0000-4000-8000-0000000005e1'$q$);
SELECT t.expect_error('DB-VER-06 second response rejected',
 $q$UPDATE verifier.verification_session SET response_received_at=now()+interval '1 second' WHERE session_id='00000000-0000-4000-8000-0000000005e1'$q$, 'already received');
SELECT t.expect_error('DB-VER-07 rollback to created rejected',
 $q$UPDATE verifier.verification_session SET state='created' WHERE session_id='00000000-0000-4000-8000-0000000005e1'$q$, 'illegal session transition');
SELECT t.expect_error('DB-VER-08 session owner cannot be reassigned (T-BOLA-01 support)',
 $q$UPDATE verifier.verification_session SET org_id='00000000-0000-4000-8000-00000000c001', created_by='00000000-0000-4000-8000-0000000000c1'
    WHERE session_id='00000000-0000-4000-8000-0000000005e1'$q$, 'ownership is immutable');
DO $$
BEGIN
  INSERT INTO t.result VALUES ('DB-PRV-01 no disclosed-value columns in verifier schema',
   CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='verifier'
          AND column_name ~* '(disclos|vp_token|claim_value|kb_jwt|credential$)') THEN 'PASS' ELSE 'FAIL' END, 'information_schema scan');
END $$;

-- ---------------------------------------------------------------- audit
INSERT INTO audit.audit_event (event_id, component, event_type, actor_role, result_code)
 VALUES ('00000000-0000-4000-8000-00000000aa01','C5','status.revoked','issuer-authority','OK');
SELECT t.expect_ok('DB-AUD-01 service can append',
 $q$INSERT INTO audit.audit_event (event_id, component, event_type, actor_role) VALUES ('00000000-0000-4000-8000-00000000aa02','C2-B','session.created','verifier-staff')$q$, 'svc_verifier');
SELECT t.expect_error('DB-AUD-02 UPDATE blocked even for owner',
 $q$UPDATE audit.audit_event SET result_code='X'$q$, 'append-only');
SELECT t.expect_error('DB-AUD-03 DELETE blocked outside purge',
 $q$DELETE FROM audit.audit_event$q$, 'append-only');
SELECT t.expect_error('DB-AUD-04 service cannot read audit',
 $q$SELECT * FROM audit.audit_event$q$, 'permission denied', 'svc_verifier');
DO $$
DECLARE ok boolean;
BEGIN
  SELECT bool_and(e.prev_hash = COALESCE(p.hash, '\x00'::bytea)) INTO ok
    FROM audit.audit_event e LEFT JOIN audit.audit_event p ON p.seq = (SELECT max(seq) FROM audit.audit_event WHERE seq < e.seq);
  INSERT INTO t.result VALUES ('DB-AUD-05 hash chain links every event', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, 'prev_hash = previous hash');
END $$;
SELECT t.expect_ok('DB-AUD-06 retention purge runs as svc_retention', $q$SELECT ops.purge_expired()$q$, 'svc_retention');

-- ---------------------------------------------------------------- pending proposals (applied in test only)
\i :pending
SELECT t.expect_error('DB-PND-01 OD-07: verifier without hosts rejected when applied',
 $q$INSERT INTO trust.trust_entry (entry_id, role, identifier, display_name_ar, display_name_en, state, valid_from, valid_to)
    VALUES ('E-V-NOHOST','verifier','x509_hash:' || repeat('C',43),'م','V','active',1,2)$q$, 'od07_verifier_hosts_required');
SELECT t.expect_error('DB-PND-02 OD-06: status change without approval rejected when applied',
 $q$SELECT status.set_value('L1',93,2::smallint,1,'investigation',NULL)$q$, 'od06_approval_required', 'svc_status');

\pset footer off
SELECT outcome, count(*) FROM t.result GROUP BY outcome ORDER BY outcome;
SELECT id, outcome, left(detail, 90) AS detail FROM t.result ORDER BY id;
\t on
\a
\o :json_out
SELECT json_agg(r ORDER BY id) FROM t.result r;
\o
