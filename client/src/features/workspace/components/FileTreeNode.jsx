// client/src/features/workspace/components/FileTreeNode.jsx
import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit3,
  Check,
  X,
} from "lucide-react";

/*
 * Small helpers
 */
const isJson = (name) => name.toLowerCase().endsWith(".json");
const isMarkdown = (name) => /\.(md|markdown)$/i.test(name);

const FileIcon = ({ name, size = 12 }) => {
  if (isJson(name)) return <FileJson size={size} color="var(--warning)" />;
  if (isMarkdown(name)) return <FileText size={size} color="var(--text-muted)" />;
  return <FileCode size={size} color="var(--info)" />;
};

export const FileTreeNode = ({
  node,
  depth = 0,
  fileTree,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRequestRename,
  onRenameSubmit,
  onRenameCancel,
  renamingId,
  onDelete,
  canDelete = true,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [draftName, setDraftName] = useState(node.name);

  const isFolder = node.type === "folder";
  const isActive = !isFolder && String(activeFileId) === String(node._id);
  const isRenaming = String(renamingId) === String(node._id);

  const children = isFolder
    ? fileTree.filter((n) => String(n.parent) === String(node._id))
    : [];

  const indent = 10 + depth * 12;

  const handleClick = () => {
    if (isRenaming) return;
    if (isFolder) {
      setExpanded((e) => !e);
    } else {
      onSelectFile?.(String(node._id));
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = draftName.trim();
      if (next && next !== node.name) {
        onRenameSubmit?.(node._id, next);
      } else {
        onRenameCancel?.();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftName(node.name);
      onRenameCancel?.();
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: `4px 8px 4px ${indent}px`,
          fontSize: "11px",
          cursor: isRenaming ? "text" : "pointer",
          backgroundColor: isActive ? "var(--bg-active)" : "transparent",
          color: isActive ? "var(--text-main)" : "var(--text-muted)",
          borderLeft: isActive
            ? "2px solid var(--accent)"
            : "2px solid transparent",
          userSelect: "none",
          minHeight: "24px",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {isFolder ? (
          <>
            {expanded ? (
              <ChevronDown size={12} style={{ flexShrink: 0 }} />
            ) : (
              <ChevronRight size={12} style={{ flexShrink: 0 }} />
            )}
            {expanded ? (
              <FolderOpen size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
            ) : (
              <Folder size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
            )}
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <FileIcon name={node.name} />
          </>
        )}

        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleRenameKeyDown}
            onBlur={() => onRenameCancel?.()}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--accent)",
              borderRadius: "3px",
              padding: "1px 4px",
              fontSize: "11px",
              fontFamily: "monospace",
              color: "var(--text-main)",
              outline: "none",
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={node.name}
          >
            {node.name}
          </span>
        )}

        {!isRenaming && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isFolder && (
              <>
                <button
                  type="button"
                  onClick={() => onCreateFile?.(node._id)}
                  title="New file"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    padding: "1px",
                    display: "flex",
                  }}
                >
                  <FilePlus size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onCreateFolder?.(node._id)}
                  title="New folder"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    padding: "1px",
                    display: "flex",
                  }}
                >
                  <FolderPlus size={11} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setDraftName(node.name);
                onRequestRename?.(node._id);
              }}
              title="Rename"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                padding: "1px",
                display: "flex",
              }}
            >
              <Edit3 size={11} />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(node)}
                title="Delete"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  padding: "1px",
                  display: "flex",
                }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {isFolder &&
        expanded &&
        children.map((child) => (
          <FileTreeNode
            key={child._id}
            node={child}
            depth={depth + 1}
            fileTree={fileTree}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onRequestRename={onRequestRename}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
            renamingId={renamingId}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        ))}
    </>
  );
};

export default FileTreeNode;