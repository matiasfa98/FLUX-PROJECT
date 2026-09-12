// client/src/features/workspace/components/TerminalPanel.jsx
import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Terminal as TermIcon, Trash2 } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export const TerminalPanel = forwardRef(
  (
    {
      height,
      isRunning,
      onCommand,
      onResize,
      readOnly = false,
    },
    ref
  ) => {
    const containerRef = useRef(null);
    const termRef = useRef(null);
    const fitAddonRef = useRef(null);
    const bufferRef = useRef("");
    const onCommandRef = useRef(onCommand);
    const onResizeRef = useRef(onResize);

    // Live readOnly ref so the xterm onData closure always sees the
    // current value without re-initializing the terminal.
    const readOnlyRef = useRef(readOnly);

    const { isDark } = useTheme();

    useEffect(() => {
      onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
      onResizeRef.current = onResize;
    }, [onResize]);

    useEffect(() => {
      readOnlyRef.current = readOnly;
    }, [readOnly]);

    const PROMPT_STR =
      "\x1b[38;2;99;102;241mflux\x1b[0m \x1b[38;2;56;189;248m>\x1b[0m ";

  const printPrompt = () => {
  if (!termRef.current) return;
  termRef.current.write(`\r\n${PROMPT_STR}`);
};

const handleClear = () => {
  if (!termRef.current) return;
  termRef.current.clear();
  bufferRef.current = "";
  termRef.current.write(PROMPT_STR);
};

    // ---------------------------------------------------------------
    // THEMES
    // ---------------------------------------------------------------
    const terminalDarkTheme = {
      background: "#07090e",
      foreground: "#e2e8f0",
      cursor: "#6366f1",
      cursorAccent: "#07090e",
      selectionBackground: "#252f44",
      black: "#07090e",
      red: "#ef4444",
      green: "#10b981",
      yellow: "#f59e0b",
      blue: "#3b82f6",
      magenta: "#6366f1",
      cyan: "#38bdf8",
      white: "#e2e8f0",
    };

    const terminalLightTheme = {
      background: "#f8fafc",
      foreground: "#0f172a",
      cursor: "#4f46e5",
      cursorAccent: "#ffffff",
      selectionBackground: "#cbd5e1",
      black: "#0f172a",
      red: "#dc2626",
      green: "#059669",
      yellow: "#d97706",
      blue: "#2563eb",
      magenta: "#4f46e5",
      cyan: "#0284c7",
      white: "#ffffff",
    };

    // Swap theme without rebuilding the terminal.
    useEffect(() => {
      if (termRef.current) {
        termRef.current.options.theme = isDark
          ? terminalDarkTheme
          : terminalLightTheme;
      }
    }, [isDark]);

    // ---------------------------------------------------------------
    // TERMINAL LIFECYCLE
    // ---------------------------------------------------------------
    useEffect(() => {
      if (!containerRef.current) return;

      containerRef.current.innerHTML = "";

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 12,
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        theme: isDark ? terminalDarkTheme : terminalLightTheme,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch {
          /* layout race */
        }
      }, 40);

      term.writeln(
        "\x1b[90mFlux Shell v1.0.0 (stdin/stdout active)\x1b[0m"
      );
      term.write(PROMPT_STR);

      // Resize events -> forward to the server.
      term.onResize(({ cols, rows }) => {
        if (onResizeRef.current) {
          onResizeRef.current(cols, rows);
        }
      });

      // Copy / Paste hotkeys.
      term.attachCustomKeyEventHandler((e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key.toLowerCase() === "c" &&
          term.hasSelection()
        ) {
          navigator.clipboard.writeText(term.getSelection());
          return false;
        }
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key.toLowerCase() === "v" &&
          e.type === "keydown"
        ) {
          navigator.clipboard.readText().then((clipText) => {
            if (!clipText) return;
            if (readOnlyRef.current) return;
            bufferRef.current += clipText;
            term.write(clipText);
          });
          return false;
        }
        return true;
      });

      // Keystroke handler.
      const disposable = term.onData((data) => {
        // Observers are read-only. Render output, ignore input.
        if (readOnlyRef.current) return;

        const code = data.charCodeAt(0);

        // Enter
        if (code === 13) {
          const cmd = bufferRef.current.trim();
          bufferRef.current = "";

          if (cmd === "clear") {
            handleClear();
            return;
          }

          if (cmd) {
            term.write("\r\n");
            if (onCommandRef.current) {
              onCommandRef.current(cmd);
            } else {
              term.writeln(`\x1b[33m${cmd}\x1b[0m`);
            }
            printPrompt();
          } else {
            printPrompt();
          }
        }
        // Backspace
        else if (code === 127) {
          if (bufferRef.current.length > 0) {
            bufferRef.current = bufferRef.current.slice(0, -1);
            term.write("\b \b");
          }
        }
        // Ctrl+C
        else if (code === 3) {
          bufferRef.current = "";
          term.write("^C");
          printPrompt();
        }
        // Printable
        else if (code >= 32 && code <= 126) {
          bufferRef.current += data;
          term.write(data);
        }
      });

      return () => {
        disposable.dispose();
        term.dispose();
        termRef.current = null;
        fitAddonRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refit when the panel is resized.
    useEffect(() => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {
          /* layout race */
        }
      }
    }, [height]);

    // Imperative API for the page.
    useImperativeHandle(ref, () => ({
      write: (msg) => termRef.current?.write(msg),
      writeln: (msg) => termRef.current?.writeln(msg),
      clear: handleClear,
      prompt: printPrompt,
    }));

    // ---------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------
    return (
      <div
        style={{
          height: `${height}px`,
          minHeight: `${height}px`,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-main)",
          borderTop: "1px solid var(--border-color)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          transition:
            "background-color 0.15s ease, border-color 0.15s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: "28px",
            backgroundColor: "var(--bg-panel)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            fontSize: "11px",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--text-muted)",
            }}
          >
            <TermIcon size={12} color="var(--info)" />
            <span style={{ fontWeight: 600 }}>TERMINAL</span>

            {isRunning && (
              <span
                style={{
                  color: "var(--online)",
                  fontWeight: 700,
                  fontSize: "9px",
                  marginLeft: "6px",
                }}
              >
                ● RUNNING
              </span>
            )}

            {readOnly && (
              <span
                style={{
                  color: "var(--warning)",
                  fontWeight: 700,
                  fontSize: "9px",
                  marginLeft: "6px",
                }}
                title="Only the active driver can type in this terminal"
              >
                READ ONLY
              </span>
            )}
          </div>

          <button
            onClick={handleClear}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "2px 6px",
              fontSize: "10px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Clear console"
          >
            <Trash2 size={11} /> Clear
          </button>
        </div>

        {/* Xterm container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            width: "100%",
            backgroundColor: "var(--bg-main)",
            padding: "4px 8px",
            overflow: "hidden",
          }}
        />
      </div>
    );
  }
);

TerminalPanel.displayName = "TerminalPanel";

export default TerminalPanel;