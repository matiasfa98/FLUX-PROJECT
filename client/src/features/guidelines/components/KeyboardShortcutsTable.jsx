// src/features/guidelines/components/KeyboardShortcutsTable.jsx
import React, { useState } from 'react';
import { Search, Command } from 'lucide-react';

const SHORTCUTS = [
  { action: 'Execute Docker Runner', keys: ['Ctrl', 'Enter'], category: 'Execution' },
  { action: 'Request / Take Seat (Pilot)', keys: ['Alt', 'P'], category: 'Collaboration' },
  { action: 'Release Seat Lock', keys: ['Alt', 'R'], category: 'Collaboration' },
  { action: 'Global Command Palette', keys: ['Ctrl', 'K'], category: 'Navigation' },
  { action: 'Toggle AI Copilot Drawer', keys: ['Ctrl', 'Shift', 'B'], category: 'Assistant' },
  { action: 'Toggle Terminal Panel', keys: ['Ctrl', '`'], category: 'Terminal' },
  { action: 'Save File Buffer', keys: ['Ctrl', 'S'], category: 'Editor' },
  { action: 'Close Active Tab', keys: ['Alt', 'W'], category: 'Editor' },
];

export const KeyboardShortcutsTable = () => {
  const [filter, setFilter] = useState('');

  const filtered = SHORTCUTS.filter(
    (s) =>
      s.action.toLowerCase().includes(filter.toLowerCase()) ||
      s.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-subpanel)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '6px 10px',
          maxWidth: '320px',
        }}
      >
        <Search size={13} color="var(--text-dim)" />
        <input
          type="text"
          placeholder="Filter shortcuts..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '11px',
            color: 'var(--text-main)',
            fontFamily: 'monospace',
            width: '100%',
          }}
        />
      </div>

      <div
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-subpanel)',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-dim)',
                fontSize: '10px',
                letterSpacing: '0.05em',
              }}
            >
              <th style={{ padding: '8px 12px' }}>ACTION</th>
              <th style={{ padding: '8px 12px' }}>CATEGORY</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>KEYBINDING</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                }}
              >
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.action}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{item.category}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        style={{
                          backgroundColor: 'var(--bg-subpanel)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '3px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          color: 'var(--text-main)',
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};