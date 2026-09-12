// client/src/features/workspace/components/RoomSettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Globe, Check, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../../lib/api';

export const RoomSettingsModal = ({ isOpen, onClose, room, onUpdated }) => {
  const [access, setAccess] = useState('public');
  const [allowChat, setAllowChat] = useState(true);
  const [allowControlRequests, setAllowControlRequests] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (room?.settings) {
      setAccess(room.settings.access || 'public');
      setAllowChat(room.settings.allowChat ?? true);
      setAllowControlRequests(room.settings.allowControlRequests ?? true);
    }
  }, [room]);

  if (!isOpen) return null;

  const targetRoomId = room?._id || room?.id;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!targetRoomId) {
      setError('Room context is still synchronizing. Please wait a moment.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await apiRequest(`/rooms/${targetRoomId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          access,
          allowChat,
          allowControlRequests,
          requireJoinApproval: access === 'private',
        }),
      });

      setSuccess(true);
      if (onUpdated && res.room) {
        onUpdated(res.room);
      }
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Settings save error:', err);
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: 'monospace',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          color: '#0f172a',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color="#4f46e5" />
            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: '#0f172a' }}>
              WORKSPACE CONFIGURATION
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Access Policy Toggle */}
          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
              ROOM VISIBILITY & ACCESS
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setAccess('public')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: `1.5px solid ${access === 'public' ? '#10b981' : '#e2e8f0'}`,
                  backgroundColor: access === 'public' ? '#ecfdf5' : '#f8fafc',
                  color: access === 'public' ? '#065f46' : '#64748b',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                  <Globe size={14} color={access === 'public' ? '#10b981' : '#94a3b8'} />
                  <span>Public Room</span>
                </div>
                <span style={{ fontSize: '10px', color: access === 'public' ? '#047857' : '#94a3b8', lineHeight: 1.3 }}>
                  Anyone in the mesh can join immediately.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccess('private')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: `1.5px solid ${access === 'private' ? '#4f46e5' : '#e2e8f0'}`,
                  backgroundColor: access === 'private' ? '#eef2ff' : '#f8fafc',
                  color: access === 'private' ? '#3730a3' : '#64748b',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                  <Lock size={14} color={access === 'private' ? '#4f46e5' : '#94a3b8'} />
                  <span>Private Room</span>
                </div>
                <span style={{ fontSize: '10px', color: access === 'private' ? '#4338ca' : '#94a3b8', lineHeight: 1.3 }}>
                  Requires owner approval before joining.
                </span>
              </button>
            </div>
          </div>

          {/* Feature Checkboxes */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={allowChat}
                onChange={(e) => setAllowChat(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
              />
              <span style={{ color: '#1e293b', fontWeight: 500 }}>Enable Room Chat Stream</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={allowControlRequests}
                onChange={(e) => setAllowControlRequests(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
              />
              <span style={{ color: '#1e293b', fontWeight: 500 }}>Allow Members to Request Driver Seat</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px',
                backgroundColor: success ? '#10b981' : '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                transition: 'background-color 0.2s ease',
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <Check size={14} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomSettingsModal;