// src/components/common/Badge/PlanBadge.jsx
import React from 'react';
import { PLANS } from '../../../utils/plans';

export const PlanBadge = ({ plan = 'free', onClick }) => {
  const isPro = plan === PLANS.PRO;
  const isEnterprise = plan === PLANS.ENTERPRISE;

  const color = isEnterprise ? 'var(--online)' : isPro ? 'var(--accent)' : 'var(--text-dim)';
  const bg = isEnterprise ? 'rgba(16, 185, 129, 0.12)' : isPro ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-subpanel)';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: '3px',
        backgroundColor: bg,
        border: `1px solid ${color}`,
        color: color,
        fontSize: '9px',
        fontWeight: 800,
        fontFamily: 'monospace',
        cursor: onClick ? 'pointer' : 'default',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />
      <span>{plan}</span>
    </div>
  );
};

export default PlanBadge;