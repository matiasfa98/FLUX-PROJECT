// src/features/guidelines/pages/GuidelinesPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Copy, Check, Terminal, Zap, 
  Cpu, CheckSquare, Square, Share2, ExternalLink,
  Shield, BookOpen, AlertCircle
} from 'lucide-react';
import { GuideSidebar } from '../components/GuideSidebar';
import { DocSection } from '../components/DocSection';
import { KeyboardShortcutsTable } from '../components/KeyboardShortcutsTable';

export default function GuidelinesPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Pre-session verification checklist state
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Confirm Docker daemon is running locally or accessible via cluster runner', checked: true },
    { id: 2, text: 'Verify WebRTC camera/mic hardware permissions in browser settings', checked: true },
    { id: 3, text: 'Claim pilot seat to acquire write-mutex before editing collaborative files', checked: false },
    { id: 4, text: 'Verify process memory allocation targets are under 256MB boundary', checked: false },
  ]);

  const toggleChecklist = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCopyCode = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      {/* 1. DEDICATED GUIDELINES SUB-NAVBAR */}
      <header
        style={{
          height: '42px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Left: Breadcrumbs & Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
            title="Go Back"
          >
            <ArrowLeft size={14} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-dim)' }}>FLUX</span>
            <span style={{ color: 'var(--border-color)' }}>/</span>
            <span style={{ color: 'var(--text-muted)' }}>DOCS</span>
            <span style={{ color: 'var(--border-color)' }}>/</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>GUIDELINES & PROTOCOL</span>
          </div>
        </div>

        {/* Center: Search Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-subpanel)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '4px 8px',
            width: '260px',
          }}
        >
          <Search size={13} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search guidelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '11px',
              color: 'var(--text-main)',
              fontFamily: 'monospace',
              width: '100%',
            }}
          />
        </div>

        {/* Right: Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/rooms')}
            style={{
              backgroundColor: 'var(--bg-subpanel)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Open Workspaces</span>
            <ExternalLink size={10} />
          </button>

          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: 'var(--accent)',
              border: 'none',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Export Spec
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT: SIDEBAR + SCROLLABLE MANUAL */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Navigation Sidebar */}
        <GuideSidebar
          activeSection={activeSection}
          onSelectSection={scrollToSection}
          searchQuery={searchQuery}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 40px',
            maxWidth: '920px',
            margin: '0 auto',
          }}
        >
          {/* Top Banner Callout */}
          <div
            style={{
              backgroundColor: 'var(--bg-subpanel)',
              border: '1px solid var(--border-color)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '4px',
              padding: '12px 16px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                Authoritative Engineering Guide
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Standards for real-time multiplayer pairing, mutex concurrency, and isolated container execution.
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--online)', fontWeight: 700, padding: '2px 6px', backgroundColor: 'var(--bg-panel)', borderRadius: '3px' }}>
              STABLE PROTOCOL
            </div>
          </div>

          {/* Section 1: Overview */}
          <DocSection id="overview" title="1. Cluster Architecture & Latency Targets" badge="ARCHITECTURE">
            <p>
              FLUX is architected around sub-20ms distributed state synchronisation. Unlike conventional video-conferencing or passive code-viewers, every FLUX workspace synchronizes Monaco buffer changes, live WebRTC media tracks, and an isolated Docker runner via WebSockets.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginTop: '14px',
              }}
            >
              <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>MAX ROUNDTRIP LATENCY</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--online)', marginTop: '4px' }}>&lt; 25 ms</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>CONSENSUS LEADER</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>Pilot Mutex</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>CONTAINER SANDBOX</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>Isolated (None)</div>
              </div>
            </div>
          </DocSection>

          {/* Section 2: Pilot Mutex Protocol */}
          <DocSection id="pilot-protocol" title="2. Driver Mutex Engine (Single-Writer Protocol)" badge="MUTEX">
            <p>
              Concurrent uncoordinated typing leads to race conditions, conflicting syntax parsing, and broken compiler cycles. FLUX enforces the <strong>Driver Mutex Pattern</strong>:
            </p>
            <ul style={{ paddingLeft: '18px', lineHeight: 1.8 }}>
              <li><strong>Authoritative Write Access:</strong> Exactly one operator holds the driver seat at any given moment.</li>
              <li><strong>Monaco Viewport Guard:</strong> For all observer participants, the editor is strictly locked to <code>readOnly: true</code>.</li>
              <li><strong>Seat Handoff:</strong> Observers may click <em>Take Seat</em>. The current driver can click <em>Release</em> to return the buffer to an open state.</li>
            </ul>

            {/* Code Block Example */}
            <div
              style={{
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                marginTop: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '28px',
                  backgroundColor: 'var(--bg-subpanel)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  fontSize: '10px',
                  color: 'var(--text-dim)',
                }}
              >
                <span>SOCKET MUTEX PROTOCOL</span>
                <button
                  onClick={() => handleCopyCode('socket.emit("driver:request_seat", { roomId, user });', 'mutex-code')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  {copiedKey === 'mutex-code' ? <Check size={11} color="var(--online)" /> : <Copy size={11} />}
                  <span>{copiedKey === 'mutex-code' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre style={{ margin: 0, padding: '10px 12px', fontSize: '11px', color: 'var(--text-main)', overflowX: 'auto' }}>
                <code>{`// Emitting seat transition request
socket.emit('driver:request_seat', { roomId, user });

// Server responds to room mesh:
socket.on('driver:handoff', ({ nextDriverId, nextDriverName }) => {
  setDriver({ _id: nextDriverId, username: nextDriverName });
});`}</code>
              </pre>
            </div>
          </DocSection>

          {/* Section 3: Docker Sandbox Execution */}
          <DocSection id="sandbox-execution" title="3. Docker Sandbox Isolation Boundaries" badge="CONTAINER">
            <p>
              When an operator triggers <strong>RUN (DOCKER)</strong>, code is written to a temporary volume and executed inside a containerized runner with the following security parameters:
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px', border: '1px solid var(--border-color)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subpanel)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '6px 10px' }}>CONSTRAINT</th>
                  <th style={{ padding: '6px 10px' }}>VALUE</th>
                  <th style={{ padding: '6px 10px' }}>PURPOSE</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>Memory Cap</td>
                  <td style={{ padding: '6px 10px', color: 'var(--warning)' }}>256 MB RAM</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Prevents heap memory leaks from freezing the host daemon.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>Network Mode</td>
                  <td style={{ padding: '6px 10px', color: 'var(--online)' }}>--network none</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Blocks all egress connections and remote shell payloads.</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>Execution Timeout</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-main)' }}>10,000 ms</td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>SIGKILL dispatched automatically on infinite loop detection.</td>
                </tr>
              </tbody>
            </table>
          </DocSection>

          {/* Section 4: Communications & Peer DMs */}
          <DocSection id="messaging-guidelines" title="4. Dual-Layer Communications & Peer DMs" badge="SOCKETS">
            <p>
              FLUX workspaces avoid routing private questions through the room broadcast chat:
            </p>
            <ol style={{ paddingLeft: '18px', lineHeight: 1.8 }}>
              <li><strong>#ROOM STREAM:</strong> Public broadcasts routed to every connected operator in the active session.</li>
              <li><strong>Direct 1-on-1 DMs:</strong> Clicking an operator's name in the member roster toggles the chat panel into a private, peer-to-peer 1-on-1 thread without navigating away from the workspace editor.</li>
            </ol>
          </DocSection>

          {/* Section 5: Pre-Session Checklist */}
          <DocSection id="checklist" title="5. Pre-Session Readiness Checklist" badge="OPERATOR">
            <p>
              Complete this readiness verification before initiating an authoritative pairing session:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-panel)',
                    border: `1px solid ${item.checked ? 'var(--accent)' : 'var(--border-color)'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {item.checked ? (
                    <CheckSquare size={14} color="var(--accent)" />
                  ) : (
                    <Square size={14} color="var(--text-dim)" />
                  )}
                  <span style={{ fontSize: '11px', color: item.checked ? 'var(--text-main)' : 'var(--text-muted)', textDecoration: item.checked ? 'none' : 'none' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </DocSection>

          {/* Section 6: Keybindings */}
          <DocSection id="shortcuts" title="6. Master Keyboard Shortcuts" badge="KEYBINDINGS">
            <KeyboardShortcutsTable />
          </DocSection>
        </main>
      </div>
    </div>
  );
}