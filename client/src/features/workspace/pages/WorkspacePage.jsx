// client/src/features/workspace/pages/WorkspacePage.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Files,
  Search,
  GitBranch,
  FileCode,
  FilePlus,
  FolderPlus,
  X,
  Settings,
  Crown,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
  Send,
  StopCircle,
  MessageSquare,
  Folder as FolderIcon,
  Lock,
  Share2,
  Check,
  Paperclip,
} from "lucide-react";

import { PlaygroundEditor } from "../../playground/components/PlaygroundEditor";
import { TerminalPanel } from "../components/TerminalPanel";
import { RoomSettingsModal } from "../components/RoomSettingsModal";
import { FileTreeNode } from "../components/FileTreeNode";
import { AttachmentPreview } from "../components/AttachmentPreview";
import { UserAvatar } from "../../../components/common/Avatar/UserAvatar";
import { useWorkspaceSocket } from "../hooks/useWorkspaceSocket";
import { useRoomMedia } from "../hooks/useRoomMedia";
import { apiRequest } from "../../../lib/api";
import { usePersistentWorkspaceUi } from "../hooks/usePersistentWorkspaceUi";

export default function WorkspacePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // PERSISTENT UI STATE (survives navigation)
  // -------------------------------------------------------------
  const [ui, setUi] = usePersistentWorkspaceUi(roomId);

  const {
    leftWidth,
    rightWidth,
    terminalHeight,
    videoPanelHeight,
    activeRailTab,
    openTabs,
    searchFilter,
    activeDmPeer,
  } = ui;

  const setLeftWidth = (v) => setUi({ leftWidth: v });
  const setRightWidth = (v) => setUi({ rightWidth: v });
  const setTerminalHeight = (v) => setUi({ terminalHeight: v });
  const setVideoPanelHeight = (v) => setUi({ videoPanelHeight: v });
  const setActiveRailTab = (v) => setUi({ activeRailTab: v });
  const setOpenTabs = (v) =>
    setUi({ openTabs: typeof v === "function" ? v(openTabs) : v });
  const setSearchFilter = (v) => setUi({ searchFilter: v });
  const setActiveDmPeer = (v) => setUi({ activeDmPeer: v });

  // -------------------------------------------------------------
  // EPHEMERAL UI STATE
  // -------------------------------------------------------------
  const [isExecutingDocker, setIsExecutingDocker] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [pendingParentId, setPendingParentId] = useState(null);
  const [pendingCreateType, setPendingCreateType] = useState(null);
  const [newItemName, setNewItemName] = useState("");

  const [renamingId, setRenamingId] = useState(null);

  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // -------------------------------------------------------------
  // REFS
  // -------------------------------------------------------------
  const terminalRef = useRef(null);
  const isDraggingRef = useRef(null);
  const startPosRef = useRef(0);
  const startDimRef = useRef(0);
  const localVideoRef = useRef(null);
  const chatScrollRef = useRef(null);
  const pendingSelectRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleTerminalData = useCallback((data) => {
    terminalRef.current?.write(data);
  }, []);

  // -------------------------------------------------------------
  // WORKSPACE SOCKET
  // -------------------------------------------------------------
  const {
    socket: workspaceSocket,
    connected,
    room,
    fileTree,
    files,
    activeFileId,
    activeContent,
    activeLanguage,
    focusedBy,
    driver,
    members,
    isDriver,
    currentUserId,
    pendingControlRequest,
    messages,
    dmMessages,
    terminalWritable,
    selectFile,
    saveFileContent,
    requestControl,
    releaseControl,
    approveControlRequest,
    rejectControlRequest,
    sendChatMessage,
    sendDirectMessage,
    writeTerminal,
    resizeTerminal,
    uploadAttachment,
  } = useWorkspaceSocket({ roomId, onTerminalData: handleTerminalData });

  // -------------------------------------------------------------
  // MEDIA HOOK
  // -------------------------------------------------------------
  const mediaHook =
    useRoomMedia({
      roomId,
      socket: workspaceSocket,
    }) || {};

  const {
    localStream = null,
    remoteStream = null,
    isCameraOn = false,
    isMicOn = false,
    broadcasting = false,
    startMedia = () => {},
    stopMedia = () => {},
    toggleCamera = () => {},
    toggleMic = () => {},
  } = mediaHook;

  // -------------------------------------------------------------
  // PERMISSIONS
  // -------------------------------------------------------------
  const isOwner = Boolean(
    room?.owner &&
      String(room.owner._id || room.owner) === String(currentUserId)
  );

  const isAdmin = Boolean(
    room?.members?.some((m) => {
      const uid = m.user?._id || m.user;
      return String(uid) === String(currentUserId) && m.role === "admin";
    })
  );

  const isOwnerOrAdmin = isOwner || isAdmin;
  const canWrite = isDriver;
  const canDelete = isOwnerOrAdmin;

  // -------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------
  useEffect(() => {
    if (isDriver || !remoteStream) return;

    const tryPlay = () => {
      const videos = document.querySelectorAll("video:not([muted])");
      for (const v of videos) {
        v.play().catch(() => {});
      }
    };

    tryPlay();
    window.addEventListener("click", tryPlay, { once: true });
    return () => window.removeEventListener("click", tryPlay);
  }, [isDriver, remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (activeFileId && !openTabs.includes(activeFileId)) {
      setOpenTabs((prev) => [...prev, activeFileId]);
    }
  }, [activeFileId, openTabs]);

  useEffect(() => {
    const pending = pendingSelectRef.current;
    if (!pending) return;

    const match = fileTree.find((n) => {
      if (n.name !== pending.name) return false;
      const nodeParent = n.parent ? String(n.parent) : "";
      const wantParent = pending.parent ? String(pending.parent) : "";
      return nodeParent === wantParent;
    });

    if (match) {
      const id = String(match._id);
      if (match.type === "file") {
        selectFile(id);
        if (!openTabs.includes(id)) {
          setOpenTabs((prev) => [...prev, id]);
        }
      }
      pendingSelectRef.current = null;
    }
  }, [fileTree, selectFile, openTabs]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages, activeDmPeer]);

  // -------------------------------------------------------------
  // TABS
  // -------------------------------------------------------------
  const handleCloseTab = (e, fileId) => {
    e.stopPropagation();
    const nextTabs = openTabs.filter((t) => t !== fileId);
    setOpenTabs(nextTabs);

    if (activeFileId === fileId) {
      if (nextTabs.length > 0) {
        selectFile(nextTabs[nextTabs.length - 1]);
      } else {
        selectFile(null);
      }
    }
  };

  const handleSelectFile = (fileId) => {
    selectFile(fileId);
    if (fileId && !openTabs.includes(fileId)) {
      setOpenTabs((prev) => [...prev, fileId]);
    }
  };

  // -------------------------------------------------------------
  // DRAG RESIZE
  // -------------------------------------------------------------
  const startResize = (type, e) => {
    e.preventDefault();
    isDraggingRef.current = type;
    startPosRef.current =
      type === "terminal" || type === "video" ? e.clientY : e.clientX;
    startDimRef.current =
      type === "left"
        ? leftWidth
        : type === "right"
        ? rightWidth
        : type === "video"
        ? videoPanelHeight
        : terminalHeight;

    document.body.style.userSelect = "none";
    document.body.style.cursor =
      type === "terminal" || type === "video" ? "row-resize" : "col-resize";

    const onMouseMove = (ev) => {
      if (!isDraggingRef.current) return;
      if (isDraggingRef.current === "left") {
        const delta = ev.clientX - startPosRef.current;
        setLeftWidth(Math.max(160, Math.min(460, startDimRef.current + delta)));
      } else if (isDraggingRef.current === "right") {
        const delta = startPosRef.current - ev.clientX;
        setRightWidth(
          Math.max(240, Math.min(520, startDimRef.current + delta))
        );
      } else if (isDraggingRef.current === "terminal") {
        const delta = startPosRef.current - ev.clientY;
        setTerminalHeight(
          Math.max(
            80,
            Math.min(window.innerHeight - 180, startDimRef.current + delta)
          )
        );
      } else if (isDraggingRef.current === "video") {
        const delta = ev.clientY - startPosRef.current;
        setVideoPanelHeight(
          Math.max(80, Math.min(380, startDimRef.current + delta))
        );
      }
      window.dispatchEvent(new Event("resize"));
    };

    const onMouseUp = () => {
      isDraggingRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.dispatchEvent(new Event("resize"));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // -------------------------------------------------------------
  // DOCKER RUN
  // -------------------------------------------------------------
  const handleRunDocker = async () => {
    if (isExecutingDocker) return;

    if (!activeFileId) {
      terminalRef.current?.writeln(
        "\r\n\x1b[33m[Flux] No file open. Create or select a file before running.\x1b[0m\r\n"
      );
      return;
    }

    if (!isDriver) {
      terminalRef.current?.writeln(
        "\r\n\x1b[33m[Flux] Only the active driver can run code.\x1b[0m\r\n"
      );
      return;
    }

    setIsExecutingDocker(true);

    try {
      await apiRequest(`/execution/rooms/${roomId}/run`, {
        method: "POST",
        body: JSON.stringify({
          fileId: activeFileId,
          language: activeLanguage,
        }),
      });
    } catch (err) {
      terminalRef.current?.writeln(
        `\r\n\x1b[31mContainer Execution Error: ${err.message}\x1b[0m\r\n`
      );
    } finally {
      setIsExecutingDocker(false);
    }
  };

  // -------------------------------------------------------------
  // CREATE / RENAME / DELETE
  // -------------------------------------------------------------
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name || !pendingCreateType) return;

    if (!canWrite) {
      alert("Only the active driver can create files and folders.");
      return;
    }

    pendingSelectRef.current = {
      name,
      parent: pendingParentId || null,
    };

    if (pendingCreateType === "file") {
      workspaceSocket?.emit("fs:create-file", {
        roomId,
        name,
        parent: pendingParentId || null,
        content: "",
      });
    } else if (pendingCreateType === "folder") {
      workspaceSocket?.emit("fs:create-folder", {
        roomId,
        name,
        parent: pendingParentId || null,
      });
    }

    setNewItemName("");
    setPendingParentId(null);
    setPendingCreateType(null);
  };

  const handleCancelCreate = () => {
    setNewItemName("");
    setPendingParentId(null);
    setPendingCreateType(null);
    pendingSelectRef.current = null;
  };

  const handleRenameSubmit = (fileId, newName) => {
    if (!canWrite) {
      alert("Only the active driver can rename entries.");
      setRenamingId(null);
      return;
    }
    workspaceSocket?.emit("fs:rename", { roomId, fileId, name: newName });
    setRenamingId(null);
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
  };

  const handleDelete = (node) => {
    if (!node?._id) return;

    if (!canDelete) {
      alert("Only the owner or admin can delete files and folders.");
      return;
    }

    const label =
      node.type === "folder" ? "folder and all its contents" : "file";
    if (!window.confirm(`Delete ${label} "${node.name}"?`)) return;

    workspaceSocket?.emit("fs:delete", { roomId, fileId: node._id });

    const id = String(node._id);
    setOpenTabs((prev) => prev.filter((t) => t !== id));
    if (String(activeFileId) === id) {
      selectFile(null);
    }
  };

  // -------------------------------------------------------------
  // CHAT
  // -------------------------------------------------------------
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() && !pendingAttachment) return;

    const attachmentIds = pendingAttachment ? [pendingAttachment.id] : [];

    if (activeDmPeer) {
      sendDirectMessage(
        activeDmPeer.id,
        activeDmPeer.username,
        chatInput.trim(),
        attachmentIds
      );
    } else {
      sendChatMessage(chatInput.trim(), attachmentIds);
    }

    setChatInput("");
    setPendingAttachment(null);
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploadingAttachment(true);

    try {
      const attachment = await uploadAttachment(file);
      setPendingAttachment(attachment);
    } catch (err) {
      console.error("[attachment] upload failed:", err);
      alert(err.message || "Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  };

  // -------------------------------------------------------------
  // DERIVED
  // -------------------------------------------------------------
  const rootNodes = fileTree.filter((n) => !n.parent);
  const visibleRoots = searchFilter
    ? fileTree.filter((n) =>
        n.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : rootNodes;

  const activeFeed = activeDmPeer
    ? dmMessages[activeDmPeer.id] || []
    : messages || [];

  // Active DM peer's user (for the header avatar)
  const activeDmPeerUser = activeDmPeer
    ? members?.find((m) => {
        const uid = m.user?._id || m.user;
        return String(uid) === String(activeDmPeer.id);
      })?.user || null
    : null;

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        overflow: "hidden",
        fontFamily: "monospace",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          height: "40px",
          backgroundColor: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => navigate("/rooms")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              borderRadius: "4px",
            }}
            title="Return to Rooms Lobby"
          >
            <ArrowLeft size={14} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <span>cockpit:</span>
              <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {room?.name || roomId}
              </span>
              {!connected && (
                <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                  · offline
                </span>
              )}
            </div>

            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${roomId}`;
                navigator.clipboard.writeText(url).then(
                  () => {
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 1500);
                  },
                  () => {
                    window.prompt("Copy this invite link:", url);
                  }
                );
              }}
              title="Copy invite link"
              style={{
                background: "var(--bg-subpanel)",
                border: `1px solid ${
                  copiedLink ? "var(--online)" : "var(--border-color)"
                }`,
                color: copiedLink ? "var(--online)" : "var(--text-muted)",
                padding: "3px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                transition: "all 0.15s ease",
              }}
            >
              {copiedLink ? <Check size={11} /> : <Share2 size={11} />}
              <span>{copiedLink ? "Copied" : "Invite"}</span>
            </button>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              backgroundColor: "var(--bg-subpanel)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              padding: "3px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
            }}
            title="Configure Room Settings"
          >
            <Settings size={12} />
            <span>Config</span>
          </button>
        </div>

        {/* Driver badge — with avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--bg-subpanel)",
            border: "1px solid var(--border-color)",
            padding: "3px 10px 3px 4px",
            borderRadius: "16px",
            fontSize: "10px",
          }}
        >
          <UserAvatar
            user={driver || { username: "?" }}
            size={20}
            radius="50%"
          />
          <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
            DRIVER:
          </span>
          <span
            style={{
              color: driver ? "var(--online)" : "var(--warning)",
              fontWeight: 800,
            }}
          >
            {driver?.username || "Unclaimed"}
          </span>
          <span style={{ color: "var(--border-color)" }}>|</span>
          <span
            style={{ color: isDriver ? "var(--online)" : "var(--text-dim)" }}
          >
            {isDriver ? "WRITE ACCESS GRANTED" : "READ ONLY (MUTEX LOCKED)"}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isDriver && !broadcasting && (
            <button
              onClick={startMedia}
              style={{
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                color: "var(--info)",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Start broadcasting your camera and microphone"
            >
              <Video size={12} />
              <span>Start Broadcast</span>
            </button>
          )}

          {isDriver && broadcasting && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={toggleCamera}
                style={{
                  backgroundColor: isCameraOn
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${
                    isCameraOn ? "var(--online)" : "var(--danger)"
                  }`,
                  color: isCameraOn ? "var(--online)" : "var(--danger)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title={isCameraOn ? "Turn camera off" : "Turn camera on"}
              >
                {isCameraOn ? <Video size={12} /> : <VideoOff size={12} />}
              </button>

              <button
                onClick={toggleMic}
                style={{
                  backgroundColor: isMicOn
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${
                    isMicOn ? "var(--online)" : "var(--danger)"
                  }`,
                  color: isMicOn ? "var(--online)" : "var(--danger)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title={isMicOn ? "Mute microphone" : "Unmute microphone"}
              >
                {isMicOn ? <Mic size={12} /> : <MicOff size={12} />}
              </button>

              <button
                onClick={stopMedia}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "var(--danger)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Stop broadcasting"
              >
                <StopCircle size={12} />
                <span>Stop</span>
              </button>
            </div>
          )}

          {!isDriver && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                color: remoteStream ? "var(--online)" : "var(--text-dim)",
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--bg-subpanel)",
                border: `1px solid ${
                  remoteStream ? "var(--online)" : "var(--border-color)"
                }`,
              }}
              title={
                remoteStream
                  ? "Receiving driver broadcast"
                  : "Waiting for the driver to start a broadcast"
              }
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: remoteStream
                    ? "var(--online)"
                    : "var(--text-dim)",
                }}
              />
              <span>{remoteStream ? "Driver is live" : "No broadcast"}</span>
            </div>
          )}

          <button
            onClick={handleRunDocker}
            disabled={isExecutingDocker || !activeFileId || !isDriver}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor:
                isExecutingDocker || !activeFileId || !isDriver
                  ? "var(--bg-subpanel)"
                  : "var(--online)",
              color:
                isExecutingDocker || !activeFileId || !isDriver
                  ? "var(--text-dim)"
                  : "#ffffff",
              border: "none",
              padding: "5px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 700,
              cursor:
                isExecutingDocker || !activeFileId || !isDriver
                  ? "not-allowed"
                  : "pointer",
              letterSpacing: "0.04em",
              boxShadow:
                isExecutingDocker || !activeFileId || !isDriver
                  ? "none"
                  : "0 0 12px rgba(16, 185, 129, 0.3)",
            }}
            title={
              !isDriver
                ? "Only the driver can run code"
                : !activeFileId
                ? "Open or create a file to run"
                : "Execute the active file in an isolated Docker sandbox"
            }
          >
            {isExecutingDocker ? (
              <Loader2
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Play size={12} fill="#ffffff" />
            )}
            <span>{isExecutingDocker ? "EXECUTING..." : "RUN (DOCKER)"}</span>
          </button>
        </div>
      </header>

      {/* BODY — three panes */}
      <div
        style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
      >
        {/* LEFT RAIL */}
        <div
          style={{
            width: "42px",
            backgroundColor: "var(--bg-panel)",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 0",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setActiveRailTab("files")}
            style={{
              background: "none",
              border: "none",
              color:
                activeRailTab === "files"
                  ? "var(--accent)"
                  : "var(--text-dim)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
              position: "relative",
            }}
            title="File Explorer"
          >
            <Files size={16} />
            {activeRailTab === "files" && (
              <span
                style={{
                  position: "absolute",
                  left: "-8px",
                  top: "8px",
                  width: "2px",
                  height: "16px",
                  backgroundColor: "var(--accent)",
                }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveRailTab("search")}
            style={{
              background: "none",
              border: "none",
              color:
                activeRailTab === "search"
                  ? "var(--accent)"
                  : "var(--text-dim)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
            }}
            title="Search Files"
          >
            <Search size={16} />
          </button>

          <button
            onClick={() => setActiveRailTab("git")}
            style={{
              background: "none",
              border: "none",
              color:
                activeRailTab === "git" ? "var(--accent)" : "var(--text-dim)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
            }}
            title="Version Control"
          >
            <GitBranch size={16} />
          </button>
        </div>

        {/* FILE EXPLORER */}
        <div
          style={{
            width: `${leftWidth}px`,
            backgroundColor: "var(--bg-panel)",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: "32px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--text-dim)",
            }}
          >
            <span>WORKSPACE</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => {
                  if (!canWrite) return;
                  setPendingCreateType("file");
                  setPendingParentId(null);
                  setNewItemName("");
                }}
                disabled={!canWrite}
                style={{
                  background: "none",
                  border: "none",
                  color: canWrite ? "var(--text-dim)" : "var(--border-color)",
                  cursor: canWrite ? "pointer" : "not-allowed",
                  padding: "2px",
                  display: "flex",
                  opacity: canWrite ? 1 : 0.4,
                }}
                title={
                  canWrite
                    ? "New File (root)"
                    : "Only the active driver can create files"
                }
              >
                <FilePlus size={13} />
              </button>
              <button
                onClick={() => {
                  if (!canWrite) return;
                  setPendingCreateType("folder");
                  setPendingParentId(null);
                  setNewItemName("");
                }}
                disabled={!canWrite}
                style={{
                  background: "none",
                  border: "none",
                  color: canWrite ? "var(--text-dim)" : "var(--border-color)",
                  cursor: canWrite ? "pointer" : "not-allowed",
                  padding: "2px",
                  display: "flex",
                  opacity: canWrite ? 1 : 0.4,
                }}
                title={
                  canWrite
                    ? "New Folder (root)"
                    : "Only the active driver can create folders"
                }
              >
                <FolderPlus size={13} />
              </button>
            </div>
          </div>

          {!canWrite && (
            <div
              style={{
                padding: "6px 10px",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                borderBottom: "1px solid var(--border-color)",
                color: "var(--warning)",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Lock size={11} />
              <span>Read-only. Request the driver seat to edit.</span>
            </div>
          )}

          {activeRailTab === "search" && (
            <div
              style={{
                padding: "8px",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <input
                type="text"
                placeholder="Filter files..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-subpanel)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  color: "var(--text-main)",
                  outline: "none",
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {pendingCreateType && (
            <form
              onSubmit={handleCreateSubmit}
              style={{
                padding: "6px 8px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                gap: "4px",
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder={
                  pendingCreateType === "file" ? "filename.js" : "folder-name"
                }
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onBlur={(e) => {
                  if (!e.relatedTarget) handleCancelCreate();
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: "var(--bg-subpanel)",
                  border: "1px solid var(--accent)",
                  borderRadius: "3px",
                  padding: "3px 6px",
                  fontSize: "11px",
                  color: "var(--text-main)",
                  outline: "none",
                  fontFamily: "monospace",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "3px 6px",
                  fontSize: "10px",
                  backgroundColor: "var(--accent)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                style={{
                  padding: "3px 6px",
                  fontSize: "10px",
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  borderRadius: "3px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={10} />
              </button>
            </form>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            {visibleRoots.length === 0 && !pendingCreateType ? (
              <div
                style={{
                  padding: "28px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "10px",
                  color: "var(--text-dim)",
                }}
              >
                <FolderIcon size={28} style={{ opacity: 0.35 }} />
                <div style={{ fontSize: "11px", lineHeight: 1.5 }}>
                  {searchFilter
                    ? "No files match your filter."
                    : "Workspace is empty."}
                </div>
                {!searchFilter && canWrite && (
                  <button
                    onClick={() => {
                      setPendingCreateType("file");
                      setPendingParentId(null);
                      setNewItemName("");
                    }}
                    style={{
                      backgroundColor: "var(--bg-subpanel)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-main)",
                      fontSize: "10px",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FilePlus size={11} />
                    <span>Create first file</span>
                  </button>
                )}
                {!searchFilter && !canWrite && (
                  <div style={{ fontSize: "10px", opacity: 0.7 }}>
                    Waiting for the driver to add files…
                  </div>
                )}
              </div>
            ) : (
              visibleRoots.map((node) => (
                <FileTreeNode
                  key={node._id}
                  node={node}
                  depth={0}
                  fileTree={fileTree}
                  activeFileId={activeFileId}
                  onSelectFile={handleSelectFile}
                  onCreateFile={(parentId) => {
                    if (!canWrite) return;
                    setPendingCreateType("file");
                    setPendingParentId(parentId);
                    setNewItemName("");
                  }}
                  onCreateFolder={(parentId) => {
                    if (!canWrite) return;
                    setPendingCreateType("folder");
                    setPendingParentId(parentId);
                    setNewItemName("");
                  }}
                  onRequestRename={(fileId) => {
                    if (!canWrite) return;
                    setRenamingId(fileId);
                  }}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={handleRenameCancel}
                  renamingId={renamingId}
                  onDelete={handleDelete}
                  canWrite={canWrite}
                  canDelete={canDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* LEFT RESIZER */}
        <div
          onMouseDown={(e) => startResize("left", e)}
          style={{
            width: "3px",
            backgroundColor: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--border-color)")
          }
        />

        {/* EDITOR + TERMINAL */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--bg-main)",
          }}
        >
          <div
            style={{
              height: "32px",
              backgroundColor: "var(--bg-panel)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {openTabs.map((fileId) => {
              const meta = files[fileId];
              const name = meta?.name || "unknown";
              const isActive = activeFileId === fileId;

              return (
                <div
                  key={fileId}
                  onClick={() => selectFile(fileId)}
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 10px",
                    fontSize: "11px",
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? "var(--bg-main)"
                      : "var(--bg-panel)",
                    color: isActive ? "var(--text-main)" : "var(--text-dim)",
                    borderRight: "1px solid var(--border-color)",
                    borderTop: isActive
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                  }}
                >
                  <FileCode size={12} color="var(--info)" />
                  <span>{name}</span>
                  <button
                    onClick={(e) => handleCloseTab(e, fileId)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-dim)",
                      padding: "2px",
                      cursor: "pointer",
                      borderRadius: "3px",
                      display: "flex",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--danger)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-dim)")
                    }
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}

            {!isDriver && driver && activeFileId && focusedBy && (
              <div
                style={{
                  marginLeft: "auto",
                  padding: "0 12px",
                  fontSize: "9px",
                  color: "var(--text-dim)",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  flexShrink: 0,
                  height: "100%",
                }}
                title={`Following ${driver.username}'s active file`}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: "var(--online)",
                  }}
                />
                FOLLOWING @{driver.username}
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {!activeFileId ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  color: "var(--text-dim)",
                  fontSize: "12px",
                }}
              >
                <FileCode size={32} style={{ opacity: 0.3 }} />
                <div>No file open</div>
                <div
                  style={{
                    fontSize: "10px",
                    maxWidth: 320,
                    textAlign: "center",
                  }}
                >
                  {canWrite
                    ? "Create a file in the explorer, or select an existing one to open it."
                    : "Select a file to view it, or wait for the driver to open one."}
                </div>
              </div>
            ) : (
              <PlaygroundEditor
                language={activeLanguage}
                code={activeContent}
                onChange={saveFileContent}
                onExecute={isDriver ? handleRunDocker : undefined}
                options={{ readOnly: !isDriver }}
              />
            )}
          </div>

          <div
            onMouseDown={(e) => startResize("terminal", e)}
            style={{
              height: "4px",
              backgroundColor: "var(--border-color)",
              cursor: "row-resize",
              flexShrink: 0,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--border-color)")
            }
          />

          <TerminalPanel
            ref={terminalRef}
            height={terminalHeight}
            isRunning={isExecutingDocker}
            onCommand={(cmd) => writeTerminal(`${cmd}\r`)}
            onResize={resizeTerminal}
            readOnly={!terminalWritable}
          />
        </div>

        {/* RIGHT RESIZER */}
        <div
          onMouseDown={(e) => startResize("right", e)}
          style={{
            width: "3px",
            backgroundColor: "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--border-color)")
          }
        />

        {/* RIGHT PANEL */}
        <div
          style={{
            width: `${rightWidth}px`,
            backgroundColor: "var(--bg-panel)",
            borderLeft: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* AV — DRIVER BROADCASTS, OBSERVERS WATCH */}

          {isDriver && broadcasting && localStream && (
            <>
              <div
                style={{
                  height: `${videoPanelHeight}px`,
                  minHeight: `${videoPanelHeight}px`,
                  padding: "8px",
                  backgroundColor: "var(--bg-main)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      color: "var(--text-dim)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    YOUR BROADCAST
                  </span>
                  <span
                    style={{
                      fontSize: "8px",
                      color: "var(--online)",
                      fontWeight: 700,
                    }}
                  >
                    ● LIVE
                  </span>
                </div>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    flex: 1,
                    objectFit: "cover",
                    borderRadius: "4px",
                    backgroundColor: "#000",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </div>

              <div
                onMouseDown={(e) => startResize("video", e)}
                style={{
                  height: "5px",
                  backgroundColor: "var(--border-color)",
                  cursor: "row-resize",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--accent)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--border-color)")
                }
              >
                <div
                  style={{
                    width: "24px",
                    height: "2px",
                    backgroundColor: "var(--text-dim)",
                    borderRadius: "1px",
                  }}
                />
              </div>
            </>
          )}

          {!isDriver && remoteStream && (
            <div
              style={{
                height: `${videoPanelHeight}px`,
                minHeight: `${videoPanelHeight}px`,
                padding: "8px",
                backgroundColor: "var(--bg-main)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "var(--text-dim)",
                    letterSpacing: "0.04em",
                  }}
                >
                  DRIVER BROADCAST
                </span>
                <span
                  style={{
                    fontSize: "8px",
                    color: "var(--online)",
                    fontWeight: 700,
                  }}
                >
                  ● LIVE
                </span>
              </div>
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && el.srcObject !== remoteStream) {
                    el.srcObject = remoteStream;
                  }
                }}
                style={{
                  width: "100%",
                  flex: 1,
                  objectFit: "cover",
                  borderRadius: "4px",
                  backgroundColor: "#000",
                  border: "1px solid var(--border-color)",
                }}
              />
            </div>
          )}

          {/* DRIVER PROTOCOL — with driver avatar */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "var(--text-dim)",
                }}
              >
                DRIVER PROTOCOL
              </span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  backgroundColor: isDriver
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                  color: isDriver ? "var(--online)" : "var(--warning)",
                  fontWeight: 700,
                }}
              >
                {isDriver ? "DRIVER" : "OBSERVER"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "6px",
                backgroundColor: "var(--bg-subpanel)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                padding: "6px 8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  overflow: "hidden",
                }}
              >
                <UserAvatar
                  user={driver || { username: "?" }}
                  size={28}
                  radius="6px"
                />
                <div
                  style={{
                    fontSize: "11px",
                    lineHeight: 1.2,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--text-main)",
                      display: "block",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {driver?.username || "Unclaimed"}
                  </span>
                  <span style={{ color: "var(--text-dim)", fontSize: "9px" }}>
                    {isDriver
                      ? "You hold the write-lock"
                      : "Buffer write-locked"}
                  </span>
                </div>
              </div>

              {isDriver ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    releaseControl();
                  }}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "var(--danger)",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Release
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    requestControl();
                  }}
                  style={{
                    backgroundColor: "var(--accent)",
                    border: "none",
                    color: "#ffffff",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 10px var(--accent-glow)",
                  }}
                >
                  Request Seat
                </button>
              )}
            </div>

            {pendingControlRequest && isDriver && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid var(--accent)",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <UserAvatar
                    user={{
                      username: pendingControlRequest.requester.username,
                    }}
                    size={16}
                    radius="4px"
                  />
                  <span>
                    <strong>
                      @{pendingControlRequest.requester.username}
                    </strong>{" "}
                    wants the driver seat.
                  </span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() =>
                      approveControlRequest(pendingControlRequest.requester.id)
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "var(--online)",
                      border: "none",
                      color: "#ffffff",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      rejectControlRequest(pendingControlRequest.requester.id)
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-muted)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MEMBERS ROSTER — with avatars */}
          <div
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid var(--border-color)",
              maxHeight: "140px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--text-dim)",
                marginBottom: "4px",
              }}
            >
              ROOM OPERATORS ({(members || []).length})
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "3px" }}
            >
              {(members || []).map((m, idx) => {
                const memberUser = m.user;
                const isMe =
                  memberUser?._id === currentUserId ||
                  memberUser?.id === currentUserId;
                const isMemberDriver =
                  driver &&
                  (driver._id === memberUser?._id ||
                    driver.id === memberUser?._id);
                const isActiveDm =
                  activeDmPeer?.id === (memberUser?._id || memberUser?.id);

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      fontSize: "11px",
                      padding: "3px 4px",
                      borderRadius: "4px",
                      backgroundColor: isActiveDm
                        ? "var(--bg-active)"
                        : "transparent",
                      cursor: !isMe ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (!isMe) {
                        setActiveDmPeer({
                          id: memberUser?._id || memberUser?.id,
                          username: memberUser?.username || "Operator",
                        });
                      }
                    }}
                    title={
                      !isMe
                        ? `Direct message @${memberUser?.username}`
                        : "This is you"
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <UserAvatar
                          user={memberUser}
                          size={22}
                          radius="5px"
                        />
                        {isMemberDriver && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: "-3px",
                              right: "-3px",
                              width: "11px",
                              height: "11px",
                              borderRadius: "3px",
                              backgroundColor: "var(--online)",
                              border: "1px solid var(--bg-panel)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Crown size={7} color="#fff" />
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          color: "var(--text-main)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          fontWeight: isMe ? 700 : 500,
                        }}
                      >
                        {memberUser?.username || "Operator"}
                        {isMe && (
                          <span style={{ color: "var(--text-dim)", fontSize: "9px", marginLeft: "4px" }}>
                            (you)
                          </span>
                        )}
                      </span>
                    </div>

                    {!isMe && (
                      <MessageSquare
                        size={11}
                        color={isActiveDm ? "var(--accent)" : "var(--text-dim)"}
                        style={{ flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHAT */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "28px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                backgroundColor: "var(--bg-subpanel)",
                fontSize: "10px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <button
                  onClick={() => setActiveDmPeer(null)}
                  style={{
                    background: !activeDmPeer
                      ? "var(--bg-active)"
                      : "transparent",
                    border: "none",
                    color: !activeDmPeer
                      ? "var(--text-main)"
                      : "var(--text-dim)",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: !activeDmPeer ? 800 : 500,
                  }}
                >
                  #ROOM
                </button>

                {activeDmPeer && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <UserAvatar
                      user={activeDmPeerUser || { username: activeDmPeer.username }}
                      size={14}
                      radius="3px"
                      bordered={false}
                    />
                    <span style={{ color: "var(--accent)", fontWeight: 800 }}>
                      @ {activeDmPeer.username}
                    </span>
                  </div>
                )}
              </div>
              {activeDmPeer && (
                <button
                  onClick={() => setActiveDmPeer(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    display: "flex",
                  }}
                  title="Return to public stream"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {activeFeed.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    textAlign: "center",
                  }}
                >
                  {activeDmPeer
                    ? `No direct messages with @${activeDmPeer.username}`
                    : "No chat messages yet."}
                </div>
              ) : (
                activeFeed.map((msg, i) => {
                  const isMe =
                    msg.mine ||
                    msg.sender?._id === currentUserId ||
                    msg.senderId === currentUserId;
                  const senderName =
                    msg.sender?.username || msg.senderName || "Operator";
                  const senderAvatar = msg.sender?.avatar;
                  const hasAttachments =
                    Array.isArray(msg.attachments) && msg.attachments.length > 0;

                  return (
                    <div
                      key={msg.id || msg._id || i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: isMe ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                      }}
                    >
                      {/* Sender row with avatar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginBottom: "2px",
                          flexDirection: isMe ? "row-reverse" : "row",
                        }}
                      >
                        <UserAvatar
                          user={{ username: senderName, avatar: senderAvatar }}
                          size={16}
                          radius="4px"
                          bordered={false}
                        />
                        <span
                          style={{
                            fontSize: "9px",
                            color: "var(--text-dim)",
                          }}
                        >
                          {senderName}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div
                        style={{
                          backgroundColor: isMe
                            ? "var(--accent)"
                            : "var(--bg-subpanel)",
                          color: isMe ? "#ffffff" : "var(--text-main)",
                          border: isMe
                            ? "none"
                            : "1px solid var(--border-color)",
                          padding: "5px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {msg.text && msg.text !== "(attachment)" && (
                          <span>{msg.text}</span>
                        )}

                        {hasAttachments && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              marginTop:
                                msg.text && msg.text !== "(attachment)"
                                  ? "2px"
                                  : "0",
                            }}
                          >
                            {msg.attachments.map((att) => (
                              <AttachmentPreview
                                key={att.id || att._id}
                                attachment={att}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatScrollRef} />
            </div>

            <form
              onSubmit={handleSendChat}
              style={{
                padding: "8px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {/* Pending attachment chip */}
              {pendingAttachment && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "6px 10px",
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      minWidth: 0,
                    }}
                  >
                    <Paperclip size={12} color="var(--accent)" />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--text-main)",
                      }}
                    >
                      {pendingAttachment.originalName}
                    </span>
                    <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>
                      ({(pendingAttachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--danger)",
                      cursor: "pointer",
                      padding: "2px 4px",
                      fontSize: "12px",
                    }}
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Input row */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder={
                    activeDmPeer
                      ? `Message @${activeDmPeer.username}...`
                      : "Broadcast to room..."
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: "var(--bg-subpanel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    color: "var(--text-main)",
                    outline: "none",
                    fontFamily: "monospace",
                  }}
                />

                {/* Paperclip button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  title="Attach a file"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-color)",
                    color: uploadingAttachment
                      ? "var(--text-dim)"
                      : "var(--text-muted)",
                    borderRadius: "4px",
                    padding: "5px 8px",
                    cursor: uploadingAttachment ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {uploadingAttachment ? (
                    <Loader2
                      size={12}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Paperclip size={12} />
                  )}
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFileSelect(file);
                    e.target.value = "";
                  }}
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim() && !pendingAttachment}
                  style={{
                    backgroundColor: "var(--accent)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "4px",
                    padding: "0 8px",
                    cursor:
                      !chatInput.trim() && !pendingAttachment
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      !chatInput.trim() && !pendingAttachment ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Send size={11} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        room={room}
        onUpdated={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}