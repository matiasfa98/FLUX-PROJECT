// src/features/billing/components/PricingTable.jsx
import React from 'react';
import { Check, X } from 'lucide-react';
import { PLANS, PLAN_LIMITS } from '../../../utils/plans';

export const PricingTable = ({
  currentPlan = 'free',
  billingCycle = 'monthly',
  onSelectPlan,
}) => {
  const isYearly = billingCycle === 'yearly' || billingCycle === 'annual';

  // Base pro monthly price is $19.
  // With 20% annual discount: ~$15/mo billed at $180/year
  const proMonthlyDisplay = isYearly ? '$15' : '$19';
  const proBilledPeriod = isYearly ? '/ mo (billed $180/yr)' : '/ operator / mo';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        width: '100%',
        maxWidth: '1020px',
        margin: '0 auto',
        fontFamily: 'monospace',
      }}
    >
      {/* 1. FREE TIER */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>TIER 01</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {PLAN_LIMITS[PLANS.FREE]?.name || 'Community Pilot'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '14px 0 6px' }}>
            $0 <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 400 }}>/ month</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
            Essential real-time pairing engine with ephemeral sandbox compute for solo developers.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px',
            }}
          >
            <FeatureItem active text="Up to 3 Operators per room" />
            <FeatureItem active text="256MB RAM / 0.5 CPU Sandbox" />
            <FeatureItem active text="10s Docker Execution SIGKILL" />
            <FeatureItem active text="25 Copilot inferences / day" />
            <FeatureItem active text="P2P WebSockets & WebRTC mesh" />
            <FeatureItem text="Custom Dockerfile build pipeline" />
            <FeatureItem text="Cross-session persistent DMs" />
          </div>
        </div>

        <button
          disabled={currentPlan === PLANS.FREE}
          onClick={() => onSelectPlan?.(PLANS.FREE)}
          style={{
            marginTop: '24px',
            backgroundColor: currentPlan === PLANS.FREE ? 'var(--bg-subpanel)' : 'var(--border-color)',
            border: '1px solid var(--border-color)',
            color: currentPlan === PLANS.FREE ? 'var(--text-dim)' : 'var(--text-main)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: currentPlan === PLANS.FREE ? 'default' : 'pointer',
          }}
        >
          {currentPlan === PLANS.FREE ? 'ACTIVE TIER' : 'DOWNGRADE TO FREE'}
        </button>
      </div>

      {/* 2. PRO PILOT TIER */}
      <div
        style={{
          backgroundColor: 'var(--bg-subpanel)',
          border: '1px solid var(--accent)',
          borderRadius: '4px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '16px',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '3px',
            letterSpacing: '0.05em',
          }}
        >
          {isYearly ? 'SAVE 20%' : 'RECOMMENDED'}
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>TIER 02</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {PLAN_LIMITS[PLANS.PRO]?.name || 'Pro Pilot'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '14px 0 6px' }}>
            {proMonthlyDisplay}{' '}
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 400 }}>
              {proBilledPeriod}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
            Unconstrained team telemetry, high-spec isolated containers, and persistent DM history.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px',
            }}
          >
            <FeatureItem active text="Up to 15 Operators per room" highlight />
            <FeatureItem active text="1024MB RAM / 2.0 CPU Sandbox" highlight />
            <FeatureItem active text="60s Docker Execution Cap" />
            <FeatureItem active text="1,000 Copilot inferences / day" highlight />
            <FeatureItem active text="Full HD 1080p WebRTC AV Mesh" />
            <FeatureItem active text="Custom Dockerfile build injection" highlight />
            <FeatureItem active text="Encrypted cross-session DM persistence" />
          </div>
        </div>

        <button
          onClick={() => onSelectPlan?.(PLANS.PRO)}
          style={{
            marginTop: '24px',
            backgroundColor: currentPlan === PLANS.PRO ? 'var(--online)' : 'var(--accent)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {currentPlan === PLANS.PRO ? 'ACTIVE SUBSCRIPTION' : 'UPGRADE TO PRO'}
        </button>
      </div>

      {/* 3. ENTERPRISE CLUSTER */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>TIER 03</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {PLAN_LIMITS[PLANS.ENTERPRISE]?.name || 'Enterprise Cluster'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '14px 0 6px' }}>
            Custom <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 400 }}>/ dedicated</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
            Dedicated VPC runners, custom on-prem clusters, audit compliance, and SSO integration.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px',
            }}
          >
            <FeatureItem active text="Unlimited Operators & Rooms" />
            <FeatureItem active text="Dedicated Multi-node Kubernetes Runners" />
            <FeatureItem active text="Custom GPU Allocation (CUDA/Triton)" />
            <FeatureItem active text="On-prem fine-tuned AI inference model" />
            <FeatureItem active text="Custom SAML / Okta SSO integration" />
            <FeatureItem active text="Air-gapped private registry support" />
            <FeatureItem active text="24/7 SLA Priority Engineering" />
          </div>
        </div>

        <button
          onClick={() => onSelectPlan?.(PLANS.ENTERPRISE)}
          style={{
            marginTop: '24px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          CONTACT CLUSTER SALES
        </button>
      </div>
    </div>
  );
};

const FeatureItem = ({ active = false, text, highlight = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
    {active ? (
      <Check size={12} color={highlight ? 'var(--accent)' : 'var(--online)'} style={{ flexShrink: 0 }} />
    ) : (
      <X size={12} color="var(--text-dim)" style={{ flexShrink: 0 }} />
    )}
    <span style={{ color: active ? (highlight ? 'var(--text-main)' : 'var(--text-muted)') : 'var(--text-dim)' }}>
      {text}
    </span>
  </div>
);

export default PricingTable;