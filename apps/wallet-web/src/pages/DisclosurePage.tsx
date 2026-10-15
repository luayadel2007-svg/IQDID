import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { previewDemoDisclosure, primaryIdentityCredential } from '@iqdid/shared-types';
import { Alert, Card, ErrorState, Icon, LoadingState, PageHeader, SessionStatusBadge, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { DecisionPanel } from '../components/DecisionPanel.tsx';
import { DecisionOutcome } from './RequestDetailPage.tsx';

/** Shared vs withheld claims. Uses the same projection as the server (previewDemoDisclosure). */
export function DisclosurePage() {
  const { id = '' } = useParams();
  const wallet = useWallet();
  const pollMs = usePollMs();
  const req = useAsync((s) => wallet.request(id, { signal: s }), [wallet, id], { pollMs });
  const creds = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  const left = useCountdown(req.data?.status === 'PENDING' ? req.data.expiresAt : null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refused = actionError && <Alert tone="danger" title="لم يُسجَّل القرار">{actionError}</Alert>;
  if (req.loading || creds.loading) return <>{refused}<LoadingState /></>;
  if (!req.data) return <>{refused}<ErrorState message={describeError(req.error)} onRetry={req.reload} /></>;
  const credential = primaryIdentityCredential(creds.data, req.data.holderRef);
  if (!credential) return <ErrorState message={creds.error ? describeError(creds.error) : 'لا يوجد اعتماد هوية في المحفظة.'} onRetry={creds.reload} />;
  const shared = previewDemoDisclosure(req.data, credential);
  const sharedKeys = new Set(shared.map((c) => c.key));
  const withheld = credential.claims.filter((c) => !sharedKeys.has(c.key));
  const pending = req.data.status === 'PENDING' && left !== 0;

  return (
    <>
      <PageHeader eyebrow="الإفصاح الانتقائي" icon="eye" title="ما الذي سيُشارك؟" description={`${req.data.organizationName} · ${req.data.purpose}`} actions={<SessionStatusBadge status={req.data.status} />} />
      <Alert tone="warning" title="محاكاة للإفصاح الانتقائي">
        هذه معاينة تعرض الحقول المطلوبة فقط من اعتماد اصطناعي. لا يوجد SD-JWT أو إثبات تشفيري في العرض التجريبي.
      </Alert>
      {refused}
      <div className="disclosure-grid">
        <Card title={`سيُشارك (${shared.length})`} icon="send" headingLevel={2}>
          {shared.map((c) => (
            <div key={c.key} className="claim-chip claim-chip--shared">
              <span>{c.label}</span><strong>{c.value}</strong>
            </div>
          ))}
        </Card>
        <Card title={`يبقى خاصاً (${withheld.length})`} icon="lock" headingLevel={2}>
          {withheld.length === 0 ? <p className="muted">كل حقول الاعتماد مطلوبة في هذا الطلب.</p> : withheld.map((c) => (
            <div key={c.key} className="claim-chip claim-chip--withheld">
              <span>{c.label}</span><span><Icon name="eye-off" size={18} /><span className="visually-hidden">مخفي</span></span>
            </div>
          ))}
        </Card>
      </div>
      {pending
        ? <DecisionPanel session={req.data} canAccept={credential.status === 'ACTIVE' && !creds.error} onDecided={(e) => { setActionError(e); req.reload(); }} />
        : <div style={{ marginTop: 'var(--sp-4)' }}><DecisionOutcome status={req.data.status} decidedAt={req.data.decidedAt} /></div>}
      <p style={{ marginTop: 'var(--sp-5)' }}><Link to={`/requests/${req.data.id}`}>العودة إلى تفاصيل الطلب</Link></p>
    </>
  );
}
