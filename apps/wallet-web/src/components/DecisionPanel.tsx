import { useCallback, useState } from 'react';
import type { DemoConsentDecisionValue, DemoVerificationSession } from '@iqdid/shared-types';
import { Alert, Button, Icon, Modal, useOnline } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';

/**
 * Approve / reject with confirmation. The server is the authority: a second
 * decision, an expired session or an inactive credential is rejected there and
 * the error is reported to the page (which keeps it visible) and the page reloads the server state.
 */
export function DecisionPanel({ session, canAccept, onDecided }: { session: DemoVerificationSession; canAccept: boolean; onDecided: (error: string | null) => void }) {
  const wallet = useWallet();
  const online = useOnline();
  const [confirm, setConfirm] = useState<DemoConsentDecisionValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const close = useCallback(() => setConfirm(null), []);

  const submit = async (decision: DemoConsentDecisionValue): Promise<void> => {
    setSubmitting(true);
    let error: string | null = null;
    try {
      await wallet.decide(session.id, decision);
    } catch (e) {
      error = describeError(e);
    } finally {
      setSubmitting(false);
      setConfirm(null);
      onDecided(error);
    }
  };

  return (
    <>
      {!online && <Alert tone="warning" title="لا يوجد اتصال">لا يمكن إرسال القرار الآن. أعد المحاولة عند عودة الاتصال.</Alert>}
      <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
        <Button disabled={!canAccept || !online} onClick={() => setConfirm('ACCEPT')}><Icon name="check" size={18} />موافقة تجريبية</Button>
        <Button variant="danger" disabled={!online} onClick={() => setConfirm('REJECT')}><Icon name="x" size={18} />رفض</Button>
      </div>
      <Modal
        open={confirm !== null}
        title={confirm === 'ACCEPT' ? 'تأكيد الموافقة التجريبية' : 'تأكيد الرفض'}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={submitting}>تراجع</Button>
            <Button variant={confirm === 'REJECT' ? 'danger' : 'primary'} disabled={confirm === 'ACCEPT' && !canAccept} loading={submitting} onClick={() => confirm && void submit(confirm)}>
              {confirm === 'ACCEPT' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </Button>
          </>
        }
      >
        {confirm === 'ACCEPT' ? (
          <p>ستُرسل الحقول المطلوبة (قيم اصطناعية) إلى {session.organizationName}. هذه موافقة محاكاة داخل العرض التجريبي، ولا يجري أي توقيع أو تحقق تشفيري.</p>
        ) : (
          <p>لن تُشارك أي بيانات مع {session.organizationName}.</p>
        )}
      </Modal>
    </>
  );
}
