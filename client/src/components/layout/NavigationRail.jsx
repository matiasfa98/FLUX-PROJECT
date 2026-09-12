// src/components/layout/NavigationRail.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Code2, 
  Terminal, 
  MessageSquare, 
  Settings, 
  Search, 
  LogOut, 
  Bot, 
  Zap, 
  Cpu, 
  GitBranch, 
  CheckCircle2,
  LogIn
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';

export const NavigationRail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDockerModal, setShowDockerModal] = useState(false);

  // Read unread chat count from Redux store with fallback
  const unreadCount = useSelector((state) => state.chat?.unreadTotal ?? 0);

  const primaryNav = [
    { to: '/rooms', icon: Terminal, label: 'Rooms & Workspaces' },
    { to: '/playground', icon: Code2, label: 'Solo Scratchpad' },
    { to: '/chat', icon: MessageSquare, label: 'Team Communications' },
  ];

  const firstLetter = (user?.username || user?.email || 'O').charAt(0).toUpperCase();

  return (
    <aside 
      style={{
        width: '56px',
        height: '100%',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '20px',
        paddingBottom: '22px',
        boxSizing: 'border-box',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 30,
        position: 'relative',
        fontFamily: 'monospace',
        transition: 'background-color 0.15s ease, border-color 0.15s ease'
      }}
    >
      {/* 1. TOP CLUSTER: Brand & Core Primary Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
        
        {/* Brand Home Node */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '5px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            cursor: 'pointer',
            transition: 'all 0.12s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          title="Flux Launchpad"
        >
          <Zap size={18} />
          <span 
            style={{
              position: 'absolute',
              bottom: '3px',
              right: '3px',
              width: '6px',
              height: '6px',
              borderRadius: '1px',
              backgroundColor: 'var(--online)'
            }} 
          />
        </button>

        {/* Global Search Hotkey Trigger */}
        <button
          onClick={() => dispatch({ type: 'ui/toggleSearchModal' })}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '5px',
            backgroundColor: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.12s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          title="Command Palette (Ctrl + K)"
        >
          <Search size={18} />
        </button>

        <div style={{ width: '24px', height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 0' }} />

        {/* Primary Activities */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            const isChat = item.to === '/chat';

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  transition: 'all 0.12s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-main)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <Icon size={18} />
                
                {/* Sharp edge active indicator */}
                {isActive && (
                  <span 
                    style={{
                      position: 'absolute',
                      left: '-10px',
                      width: '3px',
                      height: '18px',
                      backgroundColor: 'var(--accent)'
                    }} 
                  />
                )}

                {/* Unread Chat Badge */}
                {isChat && unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      minWidth: '13px',
                      height: '13px',
                      padding: '0 2px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      fontSize: '8px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 6px var(--accent-glow)'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 2. MIDDLE CLUSTER: Runtime & Git Mesh */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', margin: 'auto 0' }}>
        <div style={{ width: '24px', height: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* Docker Sandbox Inspector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDockerModal((prev) => !prev)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '5px',
              backgroundColor: showDockerModal ? 'var(--bg-hover)' : 'transparent',
              border: showDockerModal ? '1px solid var(--info)' : '1px solid transparent',
              color: 'var(--info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Docker Sandbox Runtime"
          >
            <Cpu size={18} />
          </button>

          {showDockerModal && (
            <div
              style={{
                position: 'absolute',
                left: '48px',
                top: '-20px',
                width: '230px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '5px',
                padding: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 60,
                fontSize: '11px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>DOCKER RUNTIME</span>
                <span style={{ color: 'var(--online)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> READY
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                • Limit: 256MB memory cap<br />
                • Network: Disabled (Isolated)
              </div>
            </div>
          )}
        </div>

        {/* Source Control Link */}
        <button
          onClick={() => navigate('/rooms')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '5px',
            backgroundColor: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-dim)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Raft Distributed Mesh"
        >
          <GitBranch size={18} />
        </button>
      </div>

      {/* 3. BOTTOM CLUSTER: AI Copilot, Preferences & Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div style={{ width: '24px', height: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* AI Copilot */}
        <button
          onClick={() => dispatch({ type: 'bot/toggleDrawer' })}
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '5px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          title="Flux AI Engine"
        >
          <Bot size={18} />
          <span 
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '5px',
              height: '5px',
              borderRadius: '1px',
              backgroundColor: 'var(--accent)'
            }} 
          />
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          title="Operator Preferences"
          style={({ isActive }) => ({
            width: '36px',
            height: '36px',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
            border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
            color: isActive ? 'var(--text-main)' : 'var(--text-muted)'
          })}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Settings size={18} />
        </NavLink>

        {/* Profile Avatar / Sign In */}
        <div style={{ position: 'relative', marginTop: '4px' }}>
          {user ? (
            <>
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '5px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={`${user?.username || 'Operator'} Session`}
              >
                {firstLetter}
              </button>

              {showProfileMenu && (
                <div 
                  style={{
                    position: 'absolute',
                    left: '46px',
                    bottom: '0px',
                    width: '190px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    zIndex: 100,
                    fontSize: '11px'
                  }}
                >
                  <div style={{ padding: '4px 6px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.username || 'Operator'}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {user?.email || 'node@flux.mesh'}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 6px',
                      color: 'var(--danger)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    <LogOut size={13} />
                    <span>Terminate Session</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate('/sign-in')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '5px',
                backgroundColor: 'var(--bg-subpanel)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Sign In"
            >
              <LogIn size={15} />
            </button>
          )}
        </div>

      </div>
    </aside>
  );
};

export default NavigationRail;