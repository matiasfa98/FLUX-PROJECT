// client/src/features/playground/components/LanguageSelector.jsx
import React from 'react';
import { Code2, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node v22)' },
  { id: 'typescript', label: 'TypeScript (TSX)' },
  { id: 'python', label: 'Python (v3.13)' },
  { id: 'cpp', label: 'C++ (GCC 14)' },
  { id: 'rust', label: 'Rust (v1.85)' },
  { id: 'go', label: 'Go (v1.24)' },
  { id: 'lua', label: 'Lua (v5.4)' }
];

export const LanguageSelector = ({ selected, onSelect, disabled = false }) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      title={disabled ? 'Only the Driver holding write-access can change the language' : 'Change execution language'}
    >
      {/* Leading Code Icon */}
      <span
        style={{
          position: 'absolute',
          left: '8px',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: disabled ? 'var(--text-dim)' : 'var(--accent)',
          zIndex: 1
        }}
      >
        <Code2 size={13} />
      </span>

      {/* Dropdown Select */}
      <select
        value={selected}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundColor: 'var(--bg-subpanel)',
          color: disabled ? 'var(--text-dim)' : 'var(--text-main)',
          border: `1px solid ${disabled ? 'var(--border-color)' : 'var(--accent)'}`,
          borderRadius: '4px',
          height: '28px',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 700,
          paddingLeft: '26px',
          paddingRight: '24px',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease'
        }}
      >
        {LANGUAGES.map((lang) => (
          <option 
            key={lang.id} 
            value={lang.id}
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-main)'
            }}
          >
            {lang.label}
          </option>
        ))}
      </select>

      {/* Trailing Chevron Icon */}
      <span
        style={{
          position: 'absolute',
          right: '7px',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: 'var(--text-dim)',
          zIndex: 1
        }}
      >
        <ChevronDown size={12} />
      </span>
    </div>
  );
};

export default LanguageSelector;