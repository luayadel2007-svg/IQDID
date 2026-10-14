import type {
  DemoActivityEvent, DemoActivityType, DemoActor, DemoConsentDecisionValue, DemoCredentialStatus,
  DemoCredentialSummary, DemoErrorCode, DemoOrganization, DemoRequestTemplate, DemoVerificationRequest,
  DemoVerificationSession,
} from '@iqdid/shared-types';
import { DEMO_HOLDER_REF, DEMO_SESSION_TTL_MS } from '@iqdid/shared-types';
import { DEMO_ORGANIZATIONS, DEMO_TEMPLATES, seedCredential } from './seed.ts';

export type Result<T> = { ok: true; value: T } | { ok: false; code: DemoErrorCode; message: string };

export interface DemoStoreOptions {
  readonly now?: () => number;
  readonly newId?: () => string;
  readonly ttlMs?: number;
  readonly credentialStatus?: DemoCredentialStatus;
}

const fail = <T>(code: DemoErrorCode, message: string): Result<T> => ({ ok: false, code, message });
const ACTIVITY_LIMIT = 500;
const SESSION_LIMIT = 500;

/**
 * In-memory demo state shared by both apps through the mock HTTP server.
 * Single-threaded Node event loop ⇒ each method is atomic.
 */
export class DemoStore {
  private readonly now: () => number;
  private readonly newId: () => string;
  readonly ttlMs: number;
  private readonly initialCredentialStatus: DemoCredentialStatus;
  private credential!: DemoCredentialSummary;
  private sessions = new Map<string, DemoVerificationSession>();
  private activity: DemoActivityEvent[] = [];

  constructor(options: DemoStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? (() => crypto.randomUUID());
    this.ttlMs = options.ttlMs ?? DEMO_SESSION_TTL_MS;
    this.initialCredentialStatus = options.credentialStatus ?? 'ACTIVE';
    this.reset(false);
  }

  reset(record = true): void {
    this.credential = { ...seedCredential(this.now()), status: this.initialCredentialStatus };
    this.sessions = new Map();
    this.activity = [];
    if (record) this.log('DEMO_RESET', 'SYSTEM', null, null, null, 'أُعيدت البيانات التجريبية إلى حالتها الأولية');
  }

  organizations(): readonly DemoOrganization[] {
    return DEMO_ORGANIZATIONS;
  }

  templates(): readonly DemoRequestTemplate[] {
    return DEMO_TEMPLATES;
  }

  // ------------------------------------------------------------ verifier side

  createSession(req: DemoVerificationRequest): Result<DemoVerificationSession> {
    const org = DEMO_ORGANIZATIONS.find((o) => o.id === req.organizationId);
    if (!org) return fail('NOT_FOUND', 'organisation not found');
    const template = DEMO_TEMPLATES.find((t) => t.id === req.templateId);
    if (!template) return fail('BAD_REQUEST', 'unknown template');
    if (this.sessions.size >= SESSION_LIMIT) return fail('BAD_REQUEST', 'demo session limit reached — reset the demo');
    const id = this.newId();
    const created = this.now();
    const session: DemoVerificationSession = {
      id,
      shortCode: id.replace(/-/g, '').slice(0, 6).toUpperCase(),
      organizationId: org.id,
      organizationName: org.name,
      templateId: template.id,
      purpose: req.purpose,
      requestedFields: template.fields,
      holderRef: DEMO_HOLDER_REF,
      status: 'PENDING',
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(created + this.ttlMs).toISOString(),
      decidedAt: null,
      disclosed: null,
    };
    this.sessions.set(id, session);
    this.log('REQUEST_CREATED', 'VERIFIER', DEMO_HOLDER_REF, org.id, id, `${org.name} طلبت: ${template.title}`);
    return { ok: true, value: session };
  }

  listSessionsForOrg(organizationId: string): readonly DemoVerificationSession[] {
    return this.all().filter((s) => s.organizationId === organizationId);
  }

  /** Organisation-scoped read: another organisation's session is reported as NOT_FOUND. */
  getSessionForOrg(id: string, organizationId: string): Result<DemoVerificationSession> {
    const s = this.refresh(id);
    if (!s || s.organizationId !== organizationId) return fail('NOT_FOUND', 'session not found');
    return { ok: true, value: s };
  }

  cancelSession(id: string, organizationId: string): Result<DemoVerificationSession> {
    const found = this.getSessionForOrg(id, organizationId);
    if (!found.ok) return found;
    if (found.value.status === 'EXPIRED') return fail('SESSION_EXPIRED', 'session already expired');
    if (found.value.status !== 'PENDING') return fail('SESSION_ALREADY_DECIDED', 'session is already closed');
    const updated: DemoVerificationSession = { ...found.value, status: 'CANCELLED', decidedAt: this.iso() };
    this.sessions.set(id, updated);
    this.log('SESSION_CANCELLED', 'VERIFIER', updated.holderRef, updated.organizationId, id, `ألغت ${updated.organizationName} الطلب`);
    return { ok: true, value: updated };
  }

  // ------------------------------------------------------------ wallet side

  credentials(holderRef: string = DEMO_HOLDER_REF): readonly DemoCredentialSummary[] {
    return this.credential.holderRef === holderRef ? [this.credential] : [];
  }

  credentialById(id: string): Result<DemoCredentialSummary> {
    return id === this.credential.id ? { ok: true, value: this.credential } : fail('NOT_FOUND', 'credential not found');
  }

  walletRequests(holderRef: string = DEMO_HOLDER_REF): readonly DemoVerificationSession[] {
    return this.all().filter((s) => s.holderRef === holderRef);
  }

  walletRequest(id: string, holderRef: string = DEMO_HOLDER_REF): Result<DemoVerificationSession> {
    const s = this.refresh(id);
    if (!s || s.holderRef !== holderRef) return fail('NOT_FOUND', 'request not found');
    return { ok: true, value: s };
  }

  decide(id: string, decision: DemoConsentDecisionValue, holderRef: string = DEMO_HOLDER_REF): Result<DemoVerificationSession> {
    const found = this.walletRequest(id, holderRef);
    if (!found.ok) return found;
    const s = found.value;
    if (s.status === 'EXPIRED') return fail('SESSION_EXPIRED', 'the request has expired');
    if (s.status !== 'PENDING') return fail('SESSION_ALREADY_DECIDED', 'a decision was already recorded');
    if (decision === 'ACCEPT' && this.credential.status !== 'ACTIVE') {
      return fail('CREDENTIAL_NOT_ACTIVE', 'the demo credential is not active');
    }
    const accepted = decision === 'ACCEPT';
    const disclosed = accepted
      ? s.requestedFields.map((f) => {
          const claim = this.credential.claims.find((c) => c.key === f.key);
          return { key: f.key, label: f.label, value: claim?.value ?? '—' };
        })
      : null;
    const updated: DemoVerificationSession = {
      ...s,
      status: accepted ? 'DEMO_ACCEPTED' : 'DEMO_REJECTED',
      decidedAt: this.iso(),
      disclosed,
    };
    this.sessions.set(id, updated);
    this.log(
      accepted ? 'CONSENT_ACCEPTED' : 'CONSENT_REJECTED',
      'CITIZEN',
      s.holderRef,
      s.organizationId,
      id,
      accepted ? `وافق المواطن التجريبي على مشاركة البيانات مع ${s.organizationName}` : `رفض المواطن التجريبي طلب ${s.organizationName}`,
    );
    return { ok: true, value: updated };
  }

  // ------------------------------------------------------------ activity

  activityForHolder(holderRef: string = DEMO_HOLDER_REF): readonly DemoActivityEvent[] {
    this.refreshAll();
    return this.activity.filter((e) => e.holderRef === holderRef || e.type === 'DEMO_RESET');
  }

  activityForOrg(organizationId: string): readonly DemoActivityEvent[] {
    this.refreshAll();
    return this.activity.filter((e) => e.organizationId === organizationId || e.type === 'DEMO_RESET');
  }

  // ------------------------------------------------------------ internals

  private all(): DemoVerificationSession[] {
    this.refreshAll();
    return [...this.sessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private refreshAll(): void {
    for (const id of this.sessions.keys()) this.refresh(id);
  }

  /** Lazily moves an overdue PENDING session to EXPIRED (recorded once). */
  private refresh(id: string): DemoVerificationSession | undefined {
    const s = this.sessions.get(id);
    if (!s || s.status !== 'PENDING' || this.now() < Date.parse(s.expiresAt)) return s;
    const expired: DemoVerificationSession = { ...s, status: 'EXPIRED', decidedAt: s.expiresAt };
    this.sessions.set(id, expired);
    this.log('SESSION_EXPIRED', 'SYSTEM', s.holderRef, s.organizationId, id, `انتهت مهلة طلب ${s.organizationName} دون قرار`);
    return expired;
  }

  private iso(): string {
    return new Date(this.now()).toISOString();
  }

  private log(type: DemoActivityType, actor: DemoActor, holderRef: string | null, organizationId: string | null, sessionId: string | null, summary: string): void {
    this.activity.unshift({ id: this.newId(), at: this.iso(), type, actor, holderRef, organizationId, sessionId, summary });
    if (this.activity.length > ACTIVITY_LIMIT) this.activity.length = ACTIVITY_LIMIT;
  }
}
