// src/features/auth/pages/SignInPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Return to requested page or land directly on the authenticated Dashboard (/)
  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '250px',
        backgroundColor: 'var(--accent)',
        filter: 'blur(150px)',
        opacity: 0.15,
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '32px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div 
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}
          >
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Zap size={22} /></span>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-main)' }}>FLUX</span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>Sign in to Cockpit</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Enter your credentials to access active peer rooms and terminals.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
            color: 'var(--danger)',
            fontSize: '12px'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="email"
                required
                placeholder="developer@flux.mesh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-subpanel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '9px 12px 9px 34px',
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-subpanel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '9px 12px 9px 34px',
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '8px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 0 16px var(--accent-glow)'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Access Cockpit</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          Don't have an operator profile?{' '}
          <Link to="/sign-up" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}