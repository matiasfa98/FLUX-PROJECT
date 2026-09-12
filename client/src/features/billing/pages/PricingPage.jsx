// src/features/billing/pages/PricingPage.jsx
import React, { useState } from 'react';
import { Zap, HelpCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLANS } from '../../../utils/plans';
import { useAuth } from '../../../context/AuthContext';
import { PricingTable } from '../components/PricingTable';
import { useCheckout } from '../hooks/useCheckout';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPlan = user?.plan || PLANS.FREE;

  const { initiateCheckout, loading } = useCheckout();
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const handleSelectPlan = async (planId) => {
    if (planId === currentPlan) return;

    if (planId === PLANS.ENTERPRISE) {
      window.location.href = 'mailto:enterprise@fluxmesh.dev?subject=FLUX Enterprise Cluster Inquiry';
      return;
    }

    if (initiateCheckout) {
      await initiateCheckout(planId, selectedBillingCycle);
    } else {
      alert(`Initiating checkout: ${planId.toUpperCase()} (${selectedBillingCycle})`);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        fontFamily: 'monospace',
        padding: '36px 20px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* Navigation */}
      <div style={{ width: '100%', maxWidth: '1020px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <ArrowLeft size={13} />
          <span>Back to workspace</span>
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '620px', marginBottom: '32px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            marginBottom: '8px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            padding: '3px 8px',
            borderRadius: '12px',
          }}
        >
          <Zap size={12} />
          <span>COMPUTE & CLUSTER TIERS</span>
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            margin: '0 0 10px 0',
            letterSpacing: '-0.02em',
          }}
        >
          Predictable Cockpit Resources
        </h1>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          Dedicated Docker sandbox memory limits, multi-peer WebRTC mesh infrastructure, and authoritative mutex collaboration.
        </p>

        {/* Toggle Switch */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '2px',
            marginTop: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedBillingCycle('monthly')}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: selectedBillingCycle === 'monthly' ? 'var(--bg-active)' : 'transparent',
              color: selectedBillingCycle === 'monthly' ? 'var(--text-main)' : 'var(--text-dim)',
              border: selectedBillingCycle === 'monthly' ? '1px solid var(--border-color)' : '1px solid transparent',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setSelectedBillingCycle('yearly')}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: selectedBillingCycle === 'yearly' ? 'var(--bg-active)' : 'transparent',
              color: selectedBillingCycle === 'yearly' ? 'var(--online)' : 'var(--text-dim)',
              border: selectedBillingCycle === 'yearly' ? '1px solid var(--border-color)' : '1px solid transparent',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Annual (-20%)
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div style={{ width: '100%', maxWidth: '1020px', position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(7, 9, 14, 0.7)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: '4px',
            }}
          >
            <Loader2
              size={24}
              color="var(--accent)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
        )}

        <PricingTable
          currentPlan={currentPlan}
          billingCycle={selectedBillingCycle}
          onSelectPlan={handleSelectPlan}
        />
      </div>

      {/* Cluster FAQ */}
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          marginTop: '60px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-dim)',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          <HelpCircle size={14} />
          <span>RUNTIME & BILLING SPEC FAQ</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              What happens when the 256MB Docker limit is reached?
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              The kernel sends an Out-Of-Memory (OOM) signal, immediately terminating the runner and printing exit code 137 to the terminal. Upgrading to Pro increases the ceiling to 1024MB.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Are DM streams and chat logs preserved on Free?
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Free rooms tear down their socket message buffer when all operators disconnect. Pro and Enterprise maintain encrypted cross-session persistence across both rooms and direct messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}