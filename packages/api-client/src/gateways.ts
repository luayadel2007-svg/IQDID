import type {
  DemoActivityEvent, DemoConsentDecisionValue, DemoCredentialSummary, DemoOrganization, DemoRequestTemplate,
  DemoVerificationRequest, DemoVerificationSession,
} from '@iqdid/shared-types';
import {
  isDemoActivityEvent, isDemoCredentialSummary, isDemoOrganization, isDemoRequestTemplate, isDemoVerificationSession,
} from '@iqdid/shared-types';
import type { Transport } from './transport.ts';

const one = <T>(guard: (v: unknown) => v is T, what: string) => (raw: unknown): T => {
  if (!guard(raw)) throw new Error(`invalid ${what}`);
  return raw;
};
const many = <T>(guard: (v: unknown) => v is T, what: string) => (raw: unknown): T[] => {
  if (!Array.isArray(raw) || !raw.every(guard)) throw new Error(`invalid ${what} list`);
  return raw;
};
const ack = (raw: unknown): true => {
  if (typeof raw !== 'object' || raw === null) throw new Error('invalid acknowledgement');
  return true;
};

export type Opts = { signal?: AbortSignal };
const sig = (o?: Opts) => (o?.signal ? { signal: o.signal } : {});

export interface WalletGateway {
  credentials(o?: Opts): Promise<DemoCredentialSummary[]>;
  credential(id: string, o?: Opts): Promise<DemoCredentialSummary>;
  requests(o?: Opts): Promise<DemoVerificationSession[]>;
  request(id: string, o?: Opts): Promise<DemoVerificationSession>;
  decide(id: string, decision: DemoConsentDecisionValue, o?: Opts): Promise<DemoVerificationSession>;
  activity(o?: Opts): Promise<DemoActivityEvent[]>;
  resetDemo(o?: Opts): Promise<true>;
}

export interface VerifierGateway {
  organizations(o?: Opts): Promise<DemoOrganization[]>;
  templates(o?: Opts): Promise<DemoRequestTemplate[]>;
  createSession(req: DemoVerificationRequest, o?: Opts): Promise<DemoVerificationSession>;
  sessions(organizationId: string, o?: Opts): Promise<DemoVerificationSession[]>;
  session(id: string, organizationId: string, o?: Opts): Promise<DemoVerificationSession>;
  cancelSession(id: string, organizationId: string, o?: Opts): Promise<DemoVerificationSession>;
  activity(organizationId: string, o?: Opts): Promise<DemoActivityEvent[]>;
  resetDemo(o?: Opts): Promise<true>;
}

const enc = encodeURIComponent;

export function createWalletGateway(t: Transport): WalletGateway {
  return {
    credentials: (o) => t.request({ method: 'GET', path: '/wallet/credentials', decode: many(isDemoCredentialSummary, 'credential'), ...sig(o) }),
    credential: (id, o) => t.request({ method: 'GET', path: `/wallet/credentials/${enc(id)}`, decode: one(isDemoCredentialSummary, 'credential'), ...sig(o) }),
    requests: (o) => t.request({ method: 'GET', path: '/wallet/requests', decode: many(isDemoVerificationSession, 'request'), ...sig(o) }),
    request: (id, o) => t.request({ method: 'GET', path: `/wallet/requests/${enc(id)}`, decode: one(isDemoVerificationSession, 'request'), ...sig(o) }),
    decide: (id, decision, o) =>
      t.request({ method: 'POST', path: `/wallet/requests/${enc(id)}/decision`, body: { decision }, decode: one(isDemoVerificationSession, 'request'), ...sig(o) }),
    activity: (o) => t.request({ method: 'GET', path: '/wallet/activity', decode: many(isDemoActivityEvent, 'activity'), ...sig(o) }),
    resetDemo: (o) => t.request({ method: 'POST', path: '/demo/reset', body: {}, decode: ack, ...sig(o) }),
  };
}

export function createVerifierGateway(t: Transport): VerifierGateway {
  const org = (organizationId: string) => ({ query: { organizationId } });
  return {
    organizations: (o) => t.request({ method: 'GET', path: '/organizations', decode: many(isDemoOrganization, 'organization'), ...sig(o) }),
    templates: (o) => t.request({ method: 'GET', path: '/request-templates', decode: many(isDemoRequestTemplate, 'template'), ...sig(o) }),
    createSession: (req, o) => t.request({ method: 'POST', path: '/verifier/sessions', body: req, decode: one(isDemoVerificationSession, 'session'), ...sig(o) }),
    sessions: (orgId, o) => t.request({ method: 'GET', path: '/verifier/sessions', ...org(orgId), decode: many(isDemoVerificationSession, 'session'), ...sig(o) }),
    session: (id, orgId, o) =>
      t.request({ method: 'GET', path: `/verifier/sessions/${enc(id)}`, ...org(orgId), decode: one(isDemoVerificationSession, 'session'), ...sig(o) }),
    cancelSession: (id, orgId, o) =>
      t.request({ method: 'POST', path: `/verifier/sessions/${enc(id)}/cancel`, ...org(orgId), decode: one(isDemoVerificationSession, 'session'), ...sig(o) }),
    activity: (orgId, o) => t.request({ method: 'GET', path: '/verifier/activity', ...org(orgId), decode: many(isDemoActivityEvent, 'activity'), ...sig(o) }),
    resetDemo: (o) => t.request({ method: 'POST', path: '/demo/reset', body: {}, decode: ack, ...sig(o) }),
  };
}
