// src/features/guidelines/components/GuideSidebar.jsx
import React from 'react';
import { BookOpen, Users, Cpu, Terminal, Key, CheckSquare, ShieldCheck } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: '1. Cluster Architecture', icon: BookOpen },
  { id: 'pilot-protocol', label: '2. Driver Mutex Engine', icon: Users },
  { id: 'sandbox-execution', label: '3. Docker Sandbox Isolation', icon: Cpu },
  { id: 'messaging-guidelines', label: '4. Communications & Peer DMs', icon: Terminal },
  { id: 'checklist', label: '5. Pre-Session Checklist', icon: CheckSquare },
  { id: 'shortcuts', label: '6. Keyboard Keybindings', icon: Key },
];

export const GuideSidebar = ({ activeSection, onSelectSection, searchQuery }) => {
  const filteredItems = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ padding: '14px 16px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
        NAVIGATION INDEX
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: isActive ? 'var(--bg-active)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                textAlign: 'left',
                fontFamily: 'monospace',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-subpanel)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={14} color={isActive ? 'var(--accent)' : 'var(--text-dim)'} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cluster Status Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subpanel)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={14} color="var(--online)" />
        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
          <div>DOCS SPEC v1.0.4</div>
          <div style={{ color: 'var(--online)', fontSize: '9px' }}>TLS VERIFIED</div>
        </div>
      </div>
    </aside>
  );
};

export default GuideSidebar;