// src/features/billing/pages/CheckoutSuccessPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight, ShieldCheck, Terminal } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [sessionDetails, setSessionDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function verifyPayment() {
      if (!sessionId) {
        setStatus('error');
        setErrorMessage('Missing Stripe session reference in payload parameters.');
        return;
      }

      try {
        const data = await apiRequest(`/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        
        if (!isMounted) return;

        if (data && data.success) {
          setSessionDetails(data);
          setStatus('success');
          // Update local auth context with new plan entitlements
          if (updateUser && data.user) {
            updateUser(data.user);
          }
        } else {
          setStatus('error');
          setErrorMessage(data?.message || 'Transaction could not be confirmed by telemetry cluster.');
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'Network handshake failed during subscription verification.');
      }
    }

    verifyPayment();

    return () => {
      isMounted = false;
    };
  }, [sessionId, updateUser]);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        fontFamily: 'monospace',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Terminal Header */}
        <div
          style={{
            height: '36px',
            backgroundColor: 'var(--bg-subpanel)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            fontSize: '11px',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} color="var(--accent)" />
            <span style={{ fontWeight: 700 }}>GATEWAY // TELEMETRY VERIFICATION</span>
          </div>
          <span style={{ fontSize: '9px', color: 'var(--online)', fontWeight: 700 }}>TLS-1.3</span>
        </div>

        {/* Card Body */}
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          {status === 'verifying' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Verifying Subscription Token</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Handshaking with Stripe billing ledger and updating cluster permissions...
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid var(--online)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} color="var(--online)" />
              </div>

              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Subscription Provisioned Successfully
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Your workspace runner limits have been upgraded to <strong>1024MB RAM</strong>, with unconstrained
                  WebRTC mesh streams and persistent cross-session telemetry.
                </p>
              </div>

              {/* Transaction Spec Box */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-subpanel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>PLAN TIER</span>
                  <span style={{ fontWeight: 700, color: 'var(--online)' }}>
                    {(sessionDetails?.plan || 'PRO').toUpperCase()} PILOT
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>SESSION REF</span>
                  <span style={{ color: 'var(--text-muted)' }}>{sessionId?.slice(0, 16)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>DOCKER RUNNER CEILING</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>1024 MB / 2.0 VCPU</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/workspace')}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  backgroundColor: 'var(--accent)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Enter Upgraded Cockpit</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid var(--danger, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={24} color="var(--danger, #ef4444)" />
              </div>

              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Verification Anomaly Detected
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {errorMessage}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-subpanel)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Return to Pricing
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Retry Handshake
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}