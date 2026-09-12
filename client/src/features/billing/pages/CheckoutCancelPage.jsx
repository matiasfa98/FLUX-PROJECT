// src/features/billing/pages/CheckoutCancelPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw, Terminal } from 'lucide-react';

export default function CheckoutCancelPage() {
  const navigate = useNavigate();

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
          maxWidth: '480px',
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
            <Terminal size={14} color="var(--warning, #f59e0b)" />
            <span style={{ fontWeight: 700 }}>CHECKOUT // TRANSACTION ABORTED</span>
          </div>
          <span style={{ fontSize: '9px', color: 'var(--warning, #f59e0b)', fontWeight: 700 }}>STATUS 200</span>
        </div>

        {/* Card Body */}
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid var(--warning, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={24} color="var(--warning, #f59e0b)" />
          </div>

          <h1 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
            Checkout Halted
          </h1>

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 24px' }}>
            The checkout session was canceled or timed out. No credit card charges were processed, and your account
            remains on the <strong>Community Pilot (Free)</strong> tier limits.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                width: '100%',
                backgroundColor: 'var(--accent)',
                border: 'none',
                color: '#ffffff',
                padding: '9px 14px',
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
              <RefreshCw size={12} />
              <span>Review Plans & Try Again</span>
            </button>

            <button
              onClick={() => navigate('/workspace')}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-subpanel)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-dim)',
                padding: '8px 14px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={12} />
              <span>Return to Free Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}