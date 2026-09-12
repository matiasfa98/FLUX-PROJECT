// src/features/playground/pages/PlaygroundPage.jsx
import React, { useState, useRef } from 'react';
import { Play, RotateCcw, Copy, Check } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { PlaygroundEditor } from '../components/PlaygroundEditor';
import { TerminalPanel } from '../../workspace/components/TerminalPanel';
import { apiRequest } from '../../../lib/api';

const STARTER_CODE = {
  javascript: `// Flux Standalone Runtime\nfunction calculate() {\n  const cores = [4, 8, 16];\n  console.log("Allocating worker pool across " + cores.length + " execution targets...");\n  cores.forEach((core, i) => {\n    console.log("  [Core " + i + "] Target ID " + (core * 1024) + " online");\n  });\n  return "Compute clusters primed.";\n}\n\nconsole.log(calculate());`,
  typescript: `// Flux Standalone Runtime (TypeScript)\ninterface Core {\n  id: number;\n  capacity: number;\n}\n\nconst cores: Core[] = [\n  { id: 0, capacity: 4 * 1024 },\n  { id: 1, capacity: 8 * 1024 },\n  { id: 2, capacity: 16 * 1024 },\n];\n\nconsole.log(\`Allocating worker pool across \${cores.length} execution targets...\`);\ncores.forEach((c) => {\n  console.log(\`  [Core \${c.id}] Target ID \${c.capacity} online\`);\n});\nconsole.log("Compute clusters primed.");`,
  python: `# Flux Standalone Runtime\ndef calculate():\n    cores = [4, 8, 16]\n    print(f"Allocating worker pool across {len(cores)} targets...")\n    for i, core in enumerate(cores):\n        print(f"  [Core {i}] Target ID {core * 1024} online")\n    return "Compute clusters primed."\n\nprint(calculate())`,
  cpp: `// Flux Standalone Runtime\n#include <iostream>\n\nint main() {\n    std::cout << "Allocating worker pool..." << std::endl;\n    std::cout << "Compute clusters primed." << std::endl;\n    return 0;\n}`,
  rust: `// Flux Standalone Runtime\nfn main() {\n    println!("Allocating worker pool...");\n    println!("Compute clusters primed.");\n}`,
  go: `// Flux Standalone Runtime\npackage main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Allocating worker pool...")\n    fmt.Println("Compute clusters primed.")\n}`,
  lua: `-- Flux Standalone Runtime\nlocal cores = {4, 8, 16}\nprint("Allocating worker pool across " .. #cores .. " targets...")\nfor i, core in ipairs(cores) do\n  print("  [Core " .. (i - 1) .. "] Target ID " .. (core * 1024) .. " online")\nend\nprint("Compute clusters primed.")`,
};

const FILENAME_MAP = {
  javascript: 'main.js',
  typescript: 'main.ts',
  python: 'main.py',
  cpp: 'main.cpp',
  rust: 'main.rs',
  go: 'main.go',
  lua: 'main.lua',
};

const filenameFor = (lang) => FILENAME_MAP[lang] || 'main.js';

const extensionFor = (lang) => {
  const fname = filenameFor(lang);
  return fname.split('.').pop();
};

export default function PlaygroundPage() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(STARTER_CODE.javascript);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Vertical resizing
  const [terminalHeight, setTerminalHeight] = useState(220);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(220);

  const terminalRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = terminalHeight;

    const onMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const delta = startYRef.current - moveEvent.clientY;
      const nextHeight = Math.max(
        80,
        Math.min(window.innerHeight - 150, startHeightRef.current + delta)
      );
      setTerminalHeight(nextHeight);
      window.dispatchEvent(new Event('resize'));
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(STARTER_CODE[newLang] || '');
    terminalRef.current?.writeln(
      `\x1b[90mEnvironment switched to ${newLang.toUpperCase()}\x1b[0m`
    );
  };

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    terminalRef.current?.writeln(
      '\x1b[38;2;99;102;241m[flux]\x1b[0m Dispatching to isolated container...'
    );

    try {
      const res = await apiRequest('/execution/run', {
        method: 'POST',
        body: JSON.stringify({
          language,
          code,
          filename: filenameFor(language),
        }),
      });

      // Container stdout.
      if (res.stdout) {
        terminalRef.current?.write(res.stdout);
      }

      // Container stderr.
      if (res.stderr) {
        terminalRef.current?.write(`\x1b[31m${res.stderr}\x1b[0m`);
      }

      // Exit footer.
      terminalRef.current?.writeln('');
      if (res.timedOut) {
        terminalRef.current?.writeln(
          '\x1b[33m[timer] Execution exceeded 10s limit\x1b[0m'
        );
      } else if (res.success) {
        terminalRef.current?.writeln('\x1b[32m[exit 0]\x1b[0m');
      } else {
        terminalRef.current?.writeln(
          `\x1b[31m[exit ${res.exitCode}]\x1b[0m`
        );
      }
    } catch (err) {
      console.error('[playground] run error:', err);

      let msg = err.message || 'Execution failed';

      // Friendly hints for the common failure modes.
      if (msg.includes('401') || msg.toLowerCase().includes('auth')) {
        msg = 'Not authenticated. Sign in and try again.';
      } else if (
        msg.toLowerCase().includes('docker') ||
        msg.includes('ENOENT')
      ) {
        msg = 'Docker is not running. Start Docker Desktop and retry.';
      } else if (msg.toLowerCase().includes('unsupported language')) {
        msg = `Language "${language}" is not supported by the runner.`;
      }

      terminalRef.current?.writeln(
        `\x1b[31m[error] ${msg}\x1b[0m`
      );
    } finally {
      setIsRunning(false);
      terminalRef.current?.prompt();
    }
  };

  const handleTerminalCommand = (cmd) => {
    const trimmed = (cmd || '').trim();

    if (trimmed === 'run') {
      handleRun();
      return;
    }

    if (trimmed === 'clear') {
      terminalRef.current?.clear();
      return;
    }

    if (trimmed === 'help') {
      terminalRef.current?.writeln('Commands: run | clear | help');
      return;
    }

    if (trimmed === 'lang' || trimmed === 'language') {
      terminalRef.current?.writeln(
        `Current language: \x1b[36m${language}\x1b[0m (${filenameFor(
          language
        )})`
      );
      return;
    }

    terminalRef.current?.writeln(
      `\x1b[33m[flux] unknown command: ${trimmed}. Type "help" for options.\x1b[0m`
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header bar */}
      <div className="editor-head">
        <div className="breadcrumbs">
          <span>workspace</span>
          <span className="crumb-sep">/</span>
          <span>scratchpad</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">
            main.{extensionFor(language)}
          </span>
        </div>

        <div className="editor-actions">
          <LanguageSelector
            selected={language}
            onSelect={handleLanguageChange}
          />

          <button onClick={handleCopy} className="compact-btn">
            {copied ? (
              <Check size={12} color="var(--online)" />
            ) : (
              <Copy size={12} />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => setCode(STARTER_CODE[language] || '')}
            className="icon-btn compact-btn"
            title="Reset Code"
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="primary run-code-btn compact-btn"
          >
            <Play size={12} />
            <span>{isRunning ? 'Running…' : 'Run (Ctrl+Enter)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Monaco editor */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <PlaygroundEditor
          language={language}
          code={code}
          onChange={setCode}
          onExecute={handleRun}
        />
      </div>

      {/* 3. Drag resize divider */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: '6px',
          width: '100%',
          backgroundColor: 'var(--border-color)',
          cursor: 'row-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          userSelect: 'none',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = 'var(--accent)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = 'var(--border-color)')
        }
      >
        <div
          style={{
            width: '36px',
            height: '2px',
            backgroundColor: 'var(--text-dim)',
            borderRadius: '1px',
          }}
        />
      </div>

      {/* 4. Terminal panel */}
      <TerminalPanel
        ref={terminalRef}
        height={terminalHeight}
        isRunning={isRunning}
        onCommand={handleTerminalCommand}
        readOnly={false}
      />

      {/* 5. Status bar */}
      <footer className="editor-status-bar">
        <div className="status-left">
          <span className="status-driver-active">DOCKER RUNTIME</span>
          <span>UTF-8</span>
          <span>{language.toUpperCase()}</span>
        </div>
        <div className="status-right">
          <span>SPACES: 2</span>
          <span>LF</span>
        </div>
      </footer>
    </div>
  );
}