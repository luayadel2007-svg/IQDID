import { useId } from 'react';
import { useOrg } from './gateway.tsx';

export function OrgSwitcher() {
  const { organizations, current, select } = useOrg();
  const id = useId();
  if (organizations.length === 0) return null;
  return (
    <div className="row" style={{ gap: 'var(--sp-2)' }}>
      <label htmlFor={id} className="small">المؤسسة:</label>
      <select id={id} className="input" style={{ minHeight: 36, paddingBlock: 2 }} value={current?.id ?? ''} onChange={(e) => select(e.target.value)}>
        {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
