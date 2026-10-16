import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTransport, createVerifierGateway, describeError, type VerifierGateway } from '@iqdid/api-client';
import type { DemoOrganization } from '@iqdid/shared-types';
import { useAsync, ErrorState, LoadingState } from '@iqdid/ui';

const GatewayCtx = createContext<VerifierGateway | null>(null);

export function useVerifier(): VerifierGateway {
  const g = useContext(GatewayCtx);
  if (!g) throw new Error('useVerifier must be used inside <VerifierProviders>');
  return g;
}

export function defaultVerifierGateway(): VerifierGateway {
  // VITE_IQDI_TRANSPORT is the current name; VITE_IQDID_TRANSPORT (legacy) is still honoured.
  const selected: unknown = import.meta.env.VITE_IQDI_TRANSPORT ?? import.meta.env.VITE_IQDID_TRANSPORT;
  const mode = !selected || selected === 'demo' ? 'demo' : 'real';
  return createVerifierGateway(createTransport(mode));
}

interface OrgState {
  readonly organizations: readonly DemoOrganization[];
  readonly current: DemoOrganization | null;
  readonly select: (id: string) => void;
  readonly loading: boolean;
  readonly error: unknown;
  readonly reload: () => void;
}

const OrgCtx = createContext<OrgState | null>(null);
const ORG_KEY = 'iqdid-demo-org';

const readOrg = (): string | null => {
  try {
    return window.sessionStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
};

/** Selected demo organisation — explicit context, remembered per browser tab. */
function OrgProvider({ children }: { children: ReactNode }) {
  const verifier = useVerifier();
  const { data, loading, error, reload } = useAsync((s) => verifier.organizations({ signal: s }), [verifier]);
  const [selectedId, setSelectedId] = useState<string | null>(readOrg);
  const organizations = useMemo(() => data ?? [], [data]);
  const current = organizations.find((o) => o.id === selectedId) ?? organizations[0] ?? null;

  useEffect(() => {
    if (!current) return;
    try {
      window.sessionStorage.setItem(ORG_KEY, current.id);
    } catch {
      /* selection kept in memory only */
    }
  }, [current]);

  const select = useCallback((id: string) => setSelectedId(id), []);
  const value = useMemo(() => ({ organizations, current, select, loading, error, reload }), [organizations, current, select, loading, error, reload]);
  return <OrgCtx.Provider value={value}>{children}</OrgCtx.Provider>;
}

export function useOrg(): OrgState {
  const o = useContext(OrgCtx);
  if (!o) throw new Error('useOrg must be used inside <VerifierProviders>');
  return o;
}

export function VerifierProviders({ gateway, children }: { gateway: VerifierGateway; children: ReactNode }) {
  return (
    <GatewayCtx.Provider value={gateway}>
      <OrgProvider>{children}</OrgProvider>
    </GatewayCtx.Provider>
  );
}

/** Organisation loading errors must never appear as an empty session list. */
export function OrgBoundary({ children }: { children: ReactNode }) {
  const org = useOrg();
  if (org.loading) return <LoadingState />;
  if (org.error) return <ErrorState message={describeError(org.error)} onRetry={org.reload} />;
  return children;
}
