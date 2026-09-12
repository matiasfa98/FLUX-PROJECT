// src/components/feedback/NotificationToaster.jsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, MessageSquare, Terminal, Bell, AlertTriangle } from 'lucide-react';

export const NotificationToaster = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui?.notifications || []);

  const removeNotification = (id) => {
    dispatch({ type: 'ui/removeNotification', payload: id });
  };

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000,
        maxWidth: '320px',
        width: '100%',
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}
    >
      {notifications.map((n) => {
        const isAlert = n.type === 'alert';
        const isRoom = n.type === 'room';

        return (
          <div
            key={n.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'var(--bg-panel)',
              border: `1px solid ${isAlert ? 'var(--danger)' : 'var(--border-color)'}`,
              borderRadius: '6px',
              padding: '10px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              animation: 'slideInRight 0.15s ease',
            }}
          >
            <div
              style={{
                color: isAlert ? 'var(--danger)' : isRoom ? 'var(--online)' : 'var(--accent)',
                marginTop: '1px',
              }}
            >
              {isAlert ? <AlertTriangle size={15} /> : isRoom ? <Terminal size={15} /> : <MessageSquare size={15} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                {n.title || 'System Notification'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                {n.message}
              </div>
            </div>

            <button
              onClick={() => removeNotification(n.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};