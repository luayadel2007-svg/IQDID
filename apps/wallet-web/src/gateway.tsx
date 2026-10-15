import { createContext, useContext, type ReactNode } from 'react';
import { createTransport, createWalletGateway, type WalletGateway } from '@iqdid/api-client';

const Ctx = createContext<WalletGateway | null>(null);

export function GatewayProvider({ gateway, children }: { gateway: WalletGateway; children: ReactNode }) {
  return <Ctx.Provider value={gateway}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletGateway {
  const g = useContext(Ctx);
  if (!g) throw new Error('useWallet must be used inside <GatewayProvider>');
  return g;
}

/** Demo transport unless VITE_IQDID_TRANSPORT=real (placeholder that always reports "not implemented"). */
export function defaultWalletGateway(): WalletGateway {
  const mode = !import.meta.env.VITE_IQDID_TRANSPORT || import.meta.env.VITE_IQDID_TRANSPORT === 'demo' ? 'demo' : 'real';
  return createWalletGateway(createTransport(mode));
}
