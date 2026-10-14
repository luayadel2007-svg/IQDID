import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTransport, createVerifierGateway, type VerifierGateway } from '@iqdid/api-client';
import type { DemoOrganization } from '@iqdid/shared-types';
import { useAsync } from '@iqdid/ui';

const GatewayCtx = createContext<VerifierGateway | null>(null);

export function useVerifier(): VerifierGateway {
  const g = useContext(GatewayCtx);
  if (!g) throw new Error('useVerifier must be used inside <VerifierProviders>');
  return g;
}

export function defaultVerifierGateway(): VerifierGateway {
  const mode = import.meta.env.VITE_IQDID_TRANSPORT === 'real' ? 'real' : 'demo';
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
