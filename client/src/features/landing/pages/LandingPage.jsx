// src/features/landing/pages/LandingPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, ArrowRight, Play, Terminal, Shield, Cpu, Users, 
  Code2, CheckCircle2, ChevronRight, Sparkles, Layers, 
  Radio, Lock, Globe, Server, Clock, GitBranch, 
  Check, HelpCircle, HardDrive, ShieldCheck, Activity,
  Sun, Moon, LogOut, FileCode, Box
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeCodeTab, setActiveCodeTab] = useState('javascript');
  const [activeFaq, setActiveFaq] = useState(null);

  const RUNTIMES = [
    { name: 'JavaScript / Node.js', ver: 'v22-alpine', cap: '256MB / 0.5 CPU' },
    { name: 'Python', ver: '3.13-alpine', cap: '256MB / 0.5 CPU' },
    { name: 'Rust', ver: '1.88-alpine', cap: 'Static Binary / 0.5 CPU' },
    { name: 'Go', ver: '1.24-alpine', cap: 'Compiled / 0.5 CPU' },
    { name: 'TypeScript', ver: 'via tsx', cap: 'Native AST Execution' },
    { name: 'Lua', ver: '5.4-alpine', cap: 'Ultra-lightweight' }
  ];

  const SAMPLE_SNIPPETS = {
    javascript: `// Authoritative Host Execution Engine
const { spawnCluster } = require('@flux/runtime');

async function initializeCockpitMesh() {
  const node = await spawnCluster({
    protocol: 'pilot-mutex',
    gracePeriodMs: 120000,
    storage: './storage/rooms/6a9d'
  });

  node.on('driver:handoff', ({ nextDriver }) => {
    console.log('[MUTEX] Exclusive write-lock acquired by: ' + nextDriver);
  });

  return node.prime();
}

initializeCockpitMesh();`,

    rust: `// Rust High-Performance Distributed Core
use flux_kernel::{ClusterMesh, MutexLock, Result};

#[tokio::main]
async fn main() -> Result<()> {
    let mut mesh = ClusterMesh::connect("raft-eu-west-1").await?;
    let lock: MutexLock = mesh.acquire_driver_seat().await?;
    
    println!("[RAFT] Node active under verified pilot: {:?}", lock.holder_id);
    println!("[STORAGE] Bound to isolated host container filesystem");
    Ok(())
}`,

    python: `# Python 3.13 Sandboxed Runner
import flux_runtime as flux
import os

def bootstrap_session():
    cockpit = flux.RoomSession(room_id="state-engine-4410")
    print(f"[STATUS] Initializing Docker runner...")
    print(f"[LIMITS] 256MB Memory Cap | No Network Access | Read-Only Root")
    return cockpit.verify_integrity()

if __name__ == "__main__":
    bootstrap_session()`
  };

  const FAQS = [
    {
      q: "What makes the Pilot Mutex different from traditional Google Docs-style collaboration?",
      a: "Standard CRDTs or operational transforms result in character-by-character merging conflicts, race conditions, and broken syntax trees during compilation. Flux implements an authoritative single-driver mutex: one engineer has full execution and write control while all peers observe live synced buffers with sub-20ms latency. Control can be requested and handed over with a single click."
    },
    {
      q: "How does code execution work securely?",
      a: "Every collaborative workspace maps to an isolated directory on the host disk (/storage/rooms/:id). Code execution is dispatched inside temporary Docker containers equipped with strict resource caps: 256MB memory, 0.5 CPU quota, disabled network interfaces, and read-only base filesystems."
    },
    {
      q: "What happens if the active Driver's internet cuts out?",
      a: "The server maintains an authoritative 2-minute disconnect grace period. If a driver loses connection temporarily, their write lock remains protected so they can refresh and resume without losing session flow. If they do not return, control is automatically released to the room."
    },
    {
      q: "Can I use Flux as a standalone personal code editor?",
      a: "Yes. The standalone Solo Playground requires zero sign-in, running entirely within your browser with local evaluation, custom keybindings, and docked terminal emulation."
    }
  ];

  return (
    <div style={{ minHeight: '100%', width: '100%', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', transition: 'background-color 0.15s ease, color 0.15s ease' }}>
      
      {/* 1. ADAPTIVE NAVBAR */}
      <header style={{
        height: '64px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: 'var(--bg-panel)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background-color 0.15s ease, border-color 0.15s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <div 
            onClick={() => navigate('/')} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Zap size={22} /></span>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-main)' }}>FLUX</span>
            <span style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '2px 8px',
              backgroundColor: 'var(--bg-subpanel)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              color: 'var(--accent)',
              fontWeight: 700
            }}>
              COCKPIT v1.0
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-muted)' }} className="md-flex">
            <span onClick={() => navigate('/playground')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.target.style.color = 'var(--text-main)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>Playground</span>
            <span onClick={() => navigate('/rooms')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.target.style.color = 'var(--text-main)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>Lobby Mesh</span>
            <span onClick={() => navigate('/guidelines')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.target.style.color = 'var(--text-main)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>Guidelines</span>
            <span onClick={() => navigate('/pricing')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.target.style.color = 'var(--text-main)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>Fleet Pricing</span>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Global Dark/Light Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-subpanel)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.12s ease'
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
          </button>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => navigate('/rooms')}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Terminal size={14} />
                <span>Enter Cockpits</span>
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-subpanel)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'var(--text-main)'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--online)' }} />
                <span>{user?.username || 'Operator'}</span>
              </div>

              <button
                onClick={logout}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--danger)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => navigate('/sign-in')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 14px'
                }}
              >
                Sign In
              </button>
              
              <button 
                onClick={() => navigate('/sign-up')}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Deploy Session</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section style={{
        padding: '90px 24px 60px',
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '750px',
          height: '320px',
          backgroundColor: 'var(--accent)',
          filter: 'blur(160px)',
          opacity: 0.18,
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />

        {/* Telemetry pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          padding: '5px 14px',
          borderRadius: '24px',
          fontSize: '12px',
          fontFamily: 'monospace',
          marginBottom: '28px',
          boxShadow: '0 0 16px rgba(0,0,0,0.15)'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--online)', boxShadow: '0 0 8px var(--online)' }} />
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>FLUX MESH ACTIVE</span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>AUTHORITATIVE MUTEX ENGINE</span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span style={{ color: 'var(--accent)' }}>18MS SYNC</span>
        </div>

        {/* Main H1 */}
        <h1 style={{
          fontSize: 'clamp(38px, 6.5vw, 72px)',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
          margin: '0 0 24px',
          maxWidth: '960px',
          color: 'var(--text-main)'
        }}>
          Mission-Critical Collaborative Code Engineering
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(15px, 2vw, 19px)',
          lineHeight: 1.6,
          color: 'var(--text-muted)',
          maxWidth: '740px',
          margin: '0 0 40px'
        }}>
          The real-time IDE cockpit engineered for pairing, debugging, and live technical interviews. 
          Single-driver authoritative locks eliminate cursor clashing, backed by isolated container runtimes.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={() => navigate('/rooms')}
            style={{
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              padding: '13px 28px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 28px var(--accent-glow)'
            }}
          >
            <span>{isAuthenticated ? 'Open Collaborative Cockpit' : 'Launch Multiplayer Cockpit'}</span>
            <ArrowRight size={15} />
          </button>

          <button 
            onClick={() => navigate('/playground')}
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '13px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Play size={15} color="var(--info)" />
            <span>Open Solo Playground (No Auth)</span>
          </button>
        </div>

        {/* Telemetry quick stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          width: '100%',
          maxWidth: '900px',
          marginTop: '60px',
          paddingTop: '32px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>&lt; 20ms</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Peer Buffer Latency</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--online)' }}>100% Locked</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Zero Collision Mutex</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--info)' }}>6 Runtimes</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Docker Sandboxed</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--warning)' }}>120s</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Driver Disconnect Grace</div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE COCKPIT LIVE PREVIEW */}
      <section style={{ maxWidth: '1160px', width: '100%', margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(0,0,0,0.4), 0 0 35px var(--accent-glow)'
        }}>
          {/* Mock Window Topbar */}
          <div style={{
            height: '40px',
            backgroundColor: 'var(--bg-subpanel)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} />
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: 'var(--online)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-dim)', marginLeft: '12px' }}>
                flux-cockpit://cluster-eu-west-1/state-engine-4410
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['javascript', 'rust', 'python'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveCodeTab(lang)}
                  style={{
                    backgroundColor: activeCodeTab === lang ? 'var(--bg-active)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeCodeTab === lang ? 'var(--accent)' : 'transparent',
                    color: activeCodeTab === lang ? 'var(--text-main)' : 'var(--text-dim)',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Cockpit Split Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: '380px' }} className="mockup-grid">
            
            {/* Code Viewport */}
            <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-main)', borderRight: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-dim)' }}>active_buffer: main.{activeCodeTab === 'javascript' ? 'js' : activeCodeTab === 'rust' ? 'rs' : 'py'}</span>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--online)' }}>SYNCHRONIZED</span>
              </div>
              <pre style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: '12px',
                lineHeight: 1.65,
                color: 'var(--info)'
              }}>
                <code>{SAMPLE_SNIPPETS[activeCodeTab]}</code>
              </pre>
            </div>

            {/* Sidebar Telemetry & Shell */}
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)' }}>
              
              {/* Pilot Protocol Desk */}
              <div style={{ padding: '14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-dim)' }}>DRIVER MUTEX</span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--online)', fontWeight: 700 }}>
                    ACTIVE LOCK
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--bg-subpanel)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '6px' }}>
                  <ShieldCheck size={16} color="var(--online)" />
                  <div style={{ fontSize: '11px', flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>Alex Rivera</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>Holding exclusive write buffer</span>
                  </div>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--accent)', background: 'var(--bg-active)', padding: '2px 6px', borderRadius: '4px' }}>DRIVER</span>
                </div>
              </div>

              {/* Roster mini-list */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  <span>CONNECTED PEERS</span>
                  <span>4 OBSERVERS</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--online)' }} />
                    <span>David Chen</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: 'auto' }}>Observer</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--online)' }} />
                    <span>Elena Rostova</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: 'auto' }}>Observer</span>
                  </div>
                </div>
              </div>

              {/* Simulated Terminal */}
              <div style={{ flex: 1, padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>$ flux execute --isolated</span>
                <span style={{ color: 'var(--accent)' }}>[docker] Spawning node:22 container...</span>
                <span style={{ color: 'var(--info)' }}>[mesh] Raft consensus frame synced</span>
                <span style={{ color: 'var(--online)' }}>Process exited with status 0</span>
                <span style={{ color: 'var(--text-main)', marginTop: 'auto' }}>flux &gt; <span style={{ animation: 'blink 1s infinite' }}>_</span></span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. COMPARISON MATRIX */}
      <section style={{ maxWidth: '1100px', width: '100%', margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Why Pilot Mutex Beats Standard Collaborative Editors
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, maxWidth: '640px', marginInline: 'auto' }}>
            Traditional collaborative tools treat code like prose. Flux treats code like an executable binary pipeline.
          </p>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            padding: '14px 20px',
            backgroundColor: 'var(--bg-subpanel)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: 'var(--text-dim)'
          }}>
            <span>CAPABILITY</span>
            <span>STANDARD CRDT EDITORS</span>
            <span style={{ color: 'var(--accent)' }}>FLUX COLLABORATIVE COCKPIT</span>
          </div>

          {[
            {
              cap: 'Concurrent Typing',
              oldWay: 'Multi-cursor character clashing and broken syntax trees',
              fluxWay: 'Single Driver write-lock with instant handover request desk'
            },
            {
              cap: 'Execution Authority',
              oldWay: 'Client-side eval or shared unsafe server processes',
              fluxWay: 'Authoritative Docker sandbox with 256MB/0.5 CPU quotas'
            },
            {
              cap: 'Terminal Emulation',
              oldWay: 'Simulated dummy output log without interactive input',
              fluxWay: 'Full interactive Xterm.js shell bound to room storage'
            },
            {
              cap: 'Disconnect Handling',
              oldWay: 'Lost locks or frozen document states upon drop',
              fluxWay: 'Authoritative 120-second reconnection grace timer'
            },
            {
              cap: 'File Hierarchy',
              oldWay: 'Flat single-file pastebin documents',
              fluxWay: 'True disk-backed multi-file trees with nesting and folders'
            }
          ].map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr',
                padding: '16px 20px',
                borderBottom: idx !== 4 ? '1px solid var(--border-subtle)' : 'none',
                fontSize: '12px',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.cap}</span>
              <span style={{ color: 'var(--text-muted)' }}>{row.oldWay}</span>
              <span style={{ color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} color="var(--online)" />
                {row.fluxWay}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SUPPORTED RUNTIME MATRIX */}
      <section style={{ maxWidth: '1100px', width: '100%', margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            Production-Grade Execution Runtimes
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Every room can be configured with its native compiler toolchain, executed directly inside Docker.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {RUNTIMES.map((rt) => (
            <div
              key={rt.name}
              style={{
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Box size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{rt.name}</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-dim)' }}>{rt.ver}</div>
                </div>
              </div>

              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                backgroundColor: 'var(--bg-subpanel)',
                border: '1px solid var(--border-color)',
                padding: '3px 8px',
                borderRadius: '4px',
                color: 'var(--text-muted)'
              }}>
                {rt.cap}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQ ACCORDION SECTION */}
      <section style={{ maxWidth: '850px', width: '100%', margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Everything you need to know about authoritative state coordination and runtime security.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{faq.q}</span>
                  <ChevronRight
                    size={16}
                    color="var(--text-dim)"
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s'
                    }}
                  />
                </div>
                {isOpen && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '12px', marginBottom: 0 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. PRE-FOOTER CALL TO ACTION */}
      <section style={{
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto 100px',
        padding: '0 24px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '60px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '200px',
            backgroundColor: 'var(--accent)',
            filter: 'blur(120px)',
            opacity: 0.2,
            pointerEvents: 'none'
          }} />

          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--text-main)' }}>
            Ready to Take the Pilot Seat?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Spin up a room in under 3 seconds, invite your engineering team, and start compiling directly against isolated host containers.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(isAuthenticated ? '/rooms' : '/sign-up')}
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 20px var(--accent-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{isAuthenticated ? 'Open Active Rooms' : 'Create Free Account'}</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/playground')}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                padding: '12px 22px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Jump to Sandbox
            </button>
          </div>
        </div>
      </section>

      {/* 8. PUBLIC FOOTER */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-panel)',
        padding: '36px 32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)' }}><Zap size={18} /></span>
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>FLUX COLLABORATIVE COCKPIT</span>
            <span style={{ color: 'var(--border-color)', fontSize: '12px' }}>|</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Authoritative Multiplayer IDE</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-dim)' }}>
            <span onClick={() => navigate('/guidelines')} style={{ cursor: 'pointer' }}>Documentation</span>
            <span onClick={() => navigate('/playground')} style={{ cursor: 'pointer' }}>Playground</span>
            <span onClick={() => navigate('/rooms')} style={{ cursor: 'pointer' }}>Room Mesh</span>
            <span onClick={() => navigate('/pricing')} style={{ cursor: 'pointer' }}>Pricing</span>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: 'var(--text-dim)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '20px'
        }}>
          FLUX MESH v1.0.0-RELEASE | DOCKER ISOLATION RUNTIMES | ZERO-LOCK CONFLICTS
        </div>
      </footer>

    </div>
  );
}