// src/components/layout/TopNavbar.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const TopNavbar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getContextName = () => {
    if (location.pathname.startsWith('/rooms')) return 'ROOM MESH LOBBY';
    if (location.pathname.startsWith('/workspace')) return 'COCKPIT WORKSPACE';
    if (location.pathname.startsWith('/playground')) return 'STANDALONE SCRATCHPAD';
    if (location.pathname.startsWith('/chat')) return 'COMMUNICATIONS HUB';
    if (location.pathname.startsWith('/settings')) return 'OPERATOR SETTINGS';
    return 'CONTROL PLANE';
  };

  return (
    <header 
      style={{
        height: '42px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
        fontSize: '11px',
        flexShrink: 0,
        userSelect: 'none',
        zIndex: 20,
        transition: 'background-color 0.15s ease, border-color 0.15s ease'
      }}
    >
      {/* Route Context Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--text-dim)', fontWeight: 'bold' }}>&gt;</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 700, letterSpacing: '0.04em' }}>
          {getContextName()}
        </span>
      </div>

      {/* Engine Status & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Prominent High-Visibility Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'border-color 0.15s ease, background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun size={18} color="#f59e0b" strokeWidth={2.2} />
          ) : (
            <Moon size={18} color="#4f46e5" strokeWidth={2.2} />
          )}
        </button>

        {/* Cluster Consensus Status Capsule */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '10px'
          }}
        >
          <span 
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--online)',
              boxShadow: '0 0 6px var(--online)'
            }} 
          />
          <span style={{ color: 'var(--text-muted)' }}>CLUSTER CONSENSUS</span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span style={{ color: 'var(--online)', fontWeight: 700 }}>18ms</span>
        </div>

        {/* Operator Badge */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            padding: '4px 10px',
            borderRadius: '5px',
            fontSize: '11px',
            color: 'var(--text-main)'
          }}
        >
          <ShieldCheck size={14} color="var(--accent)" />
          <span style={{ fontWeight: 600 }}>{user?.username || 'Operator'}</span>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;