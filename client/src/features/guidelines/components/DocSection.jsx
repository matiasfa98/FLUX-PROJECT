// src/features/guidelines/components/DocSection.jsx
import React from 'react';

export const DocSection = ({ id, title, badge, children }) => {
  return (
    <section id={id} style={{ marginBottom: '40px', scrollMarginTop: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em', margin: 0 }}>
          {title}
        </h2>
        {badge && (
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-subpanel)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
};

export default DocSection;