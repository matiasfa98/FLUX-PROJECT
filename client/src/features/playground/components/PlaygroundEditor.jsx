// src/features/playground/components/PlaygroundEditor.jsx
import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../../context/ThemeContext';

export const defineFluxThemes = (monaco) => {
  // 1. Ultra-Dark FLUX Cockpit Theme
  monaco.editor.defineTheme('flux-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
      { token: 'identifier', foreground: 'e2e8f0' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'type', foreground: '38bdf8' },
      { token: 'function', foreground: '60a5fa' },
      { token: 'delimiter', foreground: '94a3b8' },
    ],
    colors: {
      'editor.background': '#07090e',
      'editor.foreground': '#e2e8f0',
      'editorCursor.foreground': '#818cf8',
      'editor.lineHighlightBackground': '#0f141f',
      'editorLineNumber.foreground': '#334155',
      'editorLineNumber.activeForeground': '#818cf8',
      'editorIndentGuide.background1': '#161c28',
      'editorIndentGuide.activeBackground1': '#3b82f6',
      'editor.selectionBackground': '#252f44',
      'editor.inactiveSelectionBackground': '#182030',
    },
  });

  // 2. Crisp High-Contrast FLUX Light Theme
  monaco.editor.defineTheme('flux-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '4f46e5', fontStyle: 'bold' },
      { token: 'identifier', foreground: '0f172a' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'd97706' },
      { token: 'type', foreground: '0284c7' },
      { token: 'function', foreground: '2563eb' },
      { token: 'delimiter', foreground: '475569' },
    ],
    colors: {
      'editor.background': '#f8fafc',
      'editor.foreground': '#0f172a',
      'editorCursor.foreground': '#4f46e5',
      'editor.lineHighlightBackground': '#f1f5f9',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#4f46e5',
      'editorIndentGuide.background1': '#e2e8f0',
      'editorIndentGuide.activeBackground1': '#6366f1',
      'editor.selectionBackground': '#cbd5e1',
      'editor.inactiveSelectionBackground': '#e2e8f0',
    },
  });
};

export const PlaygroundEditor = ({ language, code, onChange, onExecute, options = {} }) => {
  const { isDark } = useTheme();

  const handleEditorWillMount = (monaco) => {
    defineFluxThemes(monaco);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onExecute) onExecute();
    });
  };

  return (
    <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-main)', minWidth: 0 }}>
      <Editor
        height="100%"
        theme={isDark ? 'flux-dark' : 'flux-light'}
        language={language}
        value={code}
        onChange={(val) => onChange(val || '')}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true, side: 'right' },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          lineNumbersMinChars: 3,
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
          tabSize: 2,
          ...options,
        }}
      />
    </div>
  );
};

export default PlaygroundEditor;