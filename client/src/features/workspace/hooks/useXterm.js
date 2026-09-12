// src/features/workspace/hooks/useXterm.js
import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export const useXterm = ({ onCommand } = {}) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const inputBufferRef = useRef('');

  const prompt = useCallback(() => {
  if (!termRef.current) return;
  termRef.current.write('\r\n\x1b[38;2;99;102;241mflux\x1b[0m \x1b[38;2;56;189;248m❯\x1b[0m ');
}, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Terminal with Flux theme
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 12,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      theme: {
        background: '#07090e',
        foreground: '#e2e8f0',
        cursor: '#6366f1',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#0d1117',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#6366f1',
        cyan: '#38bdf8',
        white: '#f8fafc',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    // Initial sizing
    try {
      fitAddon.fit();
    } catch {
      // Container layout pending
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome Header
    term.writeln('\x1b[38;2;99;102;241m┌──────────────────────────────────────────┐\x1b[0m');
    term.writeln('\x1b[38;2;99;102;241m│\x1b[0m  \x1b[1mFLUX INTERACTIVE CONTAINER SHELL v1.0\x1b[0m   \x1b[38;2;99;102;241m│\x1b[0m');
    term.writeln('\x1b[38;2;99;102;241m└──────────────────────────────────────────┘\x1b[0m');
    term.writeln('\x1b[90mType code or commands directly. Hit Enter to execute.\x1b[0m');
    prompt();

    // Input Handling (stdin)
    const disposable = term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle Enter (Carriage Return)
      if (code === 13) {
        const cmd = inputBufferRef.current.trim();
        inputBufferRef.current = '';
        term.write('\r\n');

        if (cmd) {
          if (cmd === 'clear') {
            term.clear();
            prompt();
            return;
          }
          if (onCommand) {
            onCommand(cmd);
          } else {
            term.writeln(`\x1b[33m[exec]\x1b[0m ${cmd}`);
            prompt();
          }
        } else {
          prompt();
        }
      } 
      // Handle Backspace
      else if (code === 127) {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } 
      // Printable characters
      else if (code >= 32 && code <= 126) {
        inputBufferRef.current += data;
        term.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Suppress layout race
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      disposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [onCommand, prompt]);

  const write = useCallback((text) => {
    termRef.current?.write(text);
  }, []);

  const writeln = useCallback((text) => {
    termRef.current?.writeln(text);
  }, []);

  const clear = useCallback(() => {
    termRef.current?.clear();
    prompt();
  }, [prompt]);

  const fit = useCallback(() => {
    try {
      fitAddonRef.current?.fit();
    } catch {
      // Suppress layout race
    }
  }, []);

  return { containerRef, write, writeln, clear, prompt, fit };
};