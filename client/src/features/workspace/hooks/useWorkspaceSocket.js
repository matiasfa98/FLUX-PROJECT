// client/src/features/workspace/hooks/useWorkspaceSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAuthToken, apiRequest } from "../../../lib/api";
import { connectSocket, getSocket } from "../../../lib/socket";

const SAVE_DEBOUNCE_MS = 250;
const CHAT_HISTORY_LIMIT = 200;

export const useWorkspaceSocket = (options) => {
  const roomId = typeof options === "string" ? options : options?.roomId;
  const onTerminalData =
    typeof options === "object" ? options?.onTerminalData : null;

  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  // ── Refs ──────────────────────────────────────────────
  const onTerminalDataRef = useRef(onTerminalData);
  const currentUserIdRef = useRef(currentUserId);
  const isDriverRef = useRef(false);
  const activeFileIdRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);

  // ── State ─────────────────────────────────────────────
  const [socketInstance, setSocketInstance] = useState(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [dmMessages, setDmMessages] = useState({});
  const [fileTree, setFileTree] = useState([]);
  const [files, setFiles] = useState({});
  const [activeFileId, setActiveFileId] = useState(null);
  const [focusedBy, setFocusedBy] = useState(null);
  const [terminalWritable, setTerminalWritable] = useState(false);
  const [pendingControlRequest, setPendingControlRequest] = useState(null);

  // ── Sync refs ─────────────────────────────────────────
  useEffect(() => {
    onTerminalDataRef.current = onTerminalData;
  }, [onTerminalData]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  useEffect(() => {
    isDriverRef.current = isDriver;
  }, [isDriver]);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);
  useEffect(() => {
    setTerminalWritable(isDriver);
  }, [isDriver]);

  // ── Socket lifecycle: REUSE the global socket ─────────
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const setup = async () => {
      // Get (or create) the single global socket.
      let socket = getSocket();
      if (!socket || !socket.connected) {
        try {
          socket = await connectSocket();
        } catch (err) {
          console.error("[workspace] failed to connect global socket:", err);
          return;
        }
      }

      if (cancelled) return;

      setSocketInstance(socket);
      setConnected(socket.connected);

      // Attach listeners (they're specific to the workspace lifecycle).
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("room:state", onRoomState);
      socket.on("fs:tree", onFsTree);
      socket.on("fs:file-saved", onFsFileSaved);
      socket.on("fs:error", onFsError);
      socket.on("code:sync", onCodeSync);
      socket.on("editor:saved", onEditorSaved);
      socket.on("editor:error", onEditorError);
      socket.on("editor:conflict", onEditorConflict);
      socket.on("driver:handoff", onDriverHandoff);
      socket.on("control:requested", onControlRequested);
      socket.on("control:changed", onControlChanged);
      socket.on("control:rejected", onControlRejected);
      socket.on("file:focus", onFileFocus);
      socket.on("chat:message", onChatMessage);
      socket.on("chat:private", onChatPrivate);
      socket.on("chat:private_sent", onChatPrivateSent);
      socket.on("chat:history", onChatHistory);
      socket.on("chat:error", onChatError);
      socket.on("terminal:ready", onTerminalReady);
      socket.on("terminal:data", onTerminalDataEvent);
      socket.on("room:members", onRoomMembers);
      socket.on("room:user-joined", onUserJoined);

      // If already connected, manually fire onConnect.
      if (socket.connected) onConnect();

      return () => {
        // Detach only the workspace listeners — do NOT disconnect the
        // global socket, because the chat hub and other pages need it.
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("room:state", onRoomState);
        socket.off("fs:tree", onFsTree);
        socket.off("fs:file-saved", onFsFileSaved);
        socket.off("fs:error", onFsError);
        socket.off("code:sync", onCodeSync);
        socket.off("editor:saved", onEditorSaved);
        socket.off("editor:error", onEditorError);
        socket.off("editor:conflict", onEditorConflict);
        socket.off("driver:handoff", onDriverHandoff);
        socket.off("control:requested", onControlRequested);
        socket.off("control:changed", onControlChanged);
        socket.off("control:rejected", onControlRejected);
        socket.off("file:focus", onFileFocus);
        socket.off("chat:message", onChatMessage);
        socket.off("chat:private", onChatPrivate);
        socket.off("chat:private_sent", onChatPrivateSent);
        socket.off("chat:history", onChatHistory);
        socket.off("chat:error", onChatError);
        socket.off("terminal:ready", onTerminalReady);
        socket.off("terminal:data", onTerminalDataEvent);
        socket.off("room:members", onRoomMembers);
        socket.off("room:user-joined", onUserJoined);
      };
    };

    let cleanup;
    setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Handlers (defined once, referenced by the effect above) ──
  const onConnect = () => {
    const socket = getSocket();
    if (!socket) return;

    console.log("[workspace] CONNECTED via global socket:", socket.id);
    setConnected(true);

    socket.emit("room:join", { roomId, user });
    socket.emit("terminal:init", { roomId });
    socket.emit("chat:history", { roomId, limit: CHAT_HISTORY_LIMIT });
  };

  const onDisconnect = (reason) => {
    console.warn("[workspace] socket disconnected:", reason);
    setConnected(false);
  };

  const onRoomState = (state) => {
    if (!state) return;

    setRoom(state.room || null);
    setMembers(state.members || []);
    setFileTree(Array.isArray(state.fileTree) ? state.fileTree : []);
    setFiles(state.files && typeof state.files === "object" ? state.files : {});

    const nextActiveId = state.activeFileId ? String(state.activeFileId) : null;
    setActiveFileId(nextActiveId);
    activeFileIdRef.current = nextActiveId;

    pendingSaveRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const rawDriverId =
      state.driver?._id || state.driver?.id || state.driverId || state.driver;
    const activeDriverId = String(rawDriverId || "");
    const activeDriverName = state.driver?.username || state.driverName || "Driver";

    if (
      activeDriverId &&
      activeDriverId !== "null" &&
      activeDriverId !== "undefined"
    ) {
      const userHoldsSeat = Boolean(
        currentUserIdRef.current && activeDriverId === currentUserIdRef.current
      );
      setIsDriver(userHoldsSeat);
      isDriverRef.current = userHoldsSeat;
      setDriver(
        state.driver && typeof state.driver === "object"
          ? state.driver
          : { _id: activeDriverId, username: activeDriverName }
      );
    } else {
      setIsDriver(false);
      isDriverRef.current = false;
      setDriver(null);
    }
  };

  const onFsTree = ({ fileTree: nextTree }) => {
    if (!Array.isArray(nextTree)) return;
    setFileTree(nextTree);
    setFiles((prev) => {
      const next = { ...prev };
      const seen = new Set();
      for (const node of nextTree) {
        const id = String(node._id);
        seen.add(id);
        if (node.type === "folder") {
          next[id] = { ...(prev[id] || {}), ...node };
        } else if (next[id]) {
          next[id] = { ...next[id], ...node };
        } else {
          next[id] = { ...node, content: "" };
        }
      }
      for (const id of Object.keys(next)) {
        if (!seen.has(id)) delete next[id];
      }
      return next;
    });
  };

  const onFsFileSaved = (payload) => {
    if (!payload?.fileId) return;
    if (String(payload.updatedBy) === currentUserIdRef.current) return;
    setFiles((prev) => ({
      ...prev,
      [payload.fileId]: {
        ...(prev[payload.fileId] || {}),
        content: payload.content,
        version: payload.version ?? prev[payload.fileId]?.version,
        language: payload.language || prev[payload.fileId]?.language,
      },
    }));
  };

  const onFsError = ({ message }) => {
    console.error("[fs] error:", message);
    onTerminalDataRef.current?.(`\r\n\x1b[31m[fs] ${message}\x1b[0m\r\n`);
  };

  const onCodeSync = ({ fileId, code, version, language, senderId }) => {
    if (!fileId) return;
    if (String(senderId) === currentUserIdRef.current) return;
    setFiles((prev) => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || {}),
        content: code,
        version: typeof version === "number" ? version : prev[fileId]?.version,
        language: language || prev[fileId]?.language,
      },
    }));
  };

  const onEditorSaved = ({ fileId, version }) => {
    if (!fileId) return;
    setFiles((prev) => {
      if (!prev[fileId]) return prev;
      return { ...prev, [fileId]: { ...prev[fileId], version } };
    });
  };

  const onEditorError = ({ message }) => {
    console.error("[editor] error:", message);
    onTerminalDataRef.current?.(`\r\n\x1b[31m[editor] ${message}\x1b[0m\r\n`);
  };

  const onEditorConflict = ({ fileId, currentVersion }) => {
    console.warn("[editor] conflict:", { fileId, currentVersion });
  };

  const onDriverHandoff = (payload) => {
    if (!payload) return;
    const rawNextId =
      payload.nextDriverId ||
      payload._id ||
      payload.id ||
      (typeof payload === "string" ? payload : "");
    const nextDriverId = String(rawNextId || "");
    const nextDriverName = payload.nextDriverName || payload.username || "Operator";

    const userHoldsSeat = Boolean(
      currentUserIdRef.current &&
        nextDriverId &&
        nextDriverId !== "null" &&
        nextDriverId === currentUserIdRef.current
    );

    setDriver(
      nextDriverId && nextDriverId !== "null"
        ? { _id: nextDriverId, username: nextDriverName }
        : null
    );
    setIsDriver(userHoldsSeat);
    isDriverRef.current = userHoldsSeat;
    if (!userHoldsSeat) setPendingControlRequest(null);
  };

  const onControlRequested = (payload) => {
    if (!payload) return;
    if (!isDriverRef.current) return;
    setPendingControlRequest({
      requester: payload.requester,
      currentDriver: payload.currentDriver,
    });
  };

  const onControlChanged = () => setPendingControlRequest(null);

  const onControlRejected = ({ userId }) => {
    if (String(userId) === currentUserIdRef.current) {
      onTerminalDataRef.current?.(
        `\r\n\x1b[33m[control] Your seat request was rejected.\x1b[0m\r\n`
      );
    }
  };

  const onFileFocus = ({ fileId, fromUserId, fromUsername }) => {
    if (String(fromUserId) === currentUserIdRef.current) return;
    const nextId = fileId ? String(fileId) : null;
    setActiveFileId(nextId);
    activeFileIdRef.current = nextId;
    setFocusedBy({ id: fromUserId, username: fromUsername });
  };

  const onChatMessage = (msg) => {
    if (!msg) return;

    // Ignore DM/group messages here — those live on the /chat page.
    if (msg.kind && msg.kind !== "room") return;

    setMessages((prev) => {
      if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const onChatPrivate = (payload) => {
    if (!payload) return;
    const peerId =
      String(payload.senderId) === currentUserIdRef.current
        ? String(payload.recipientId)
        : String(payload.senderId);
    setDmMessages((prev) => {
      const list = prev[peerId] || [];
      if (payload.id && list.some((m) => m.id === payload.id)) return prev;
      return { ...prev, [peerId]: [...list, { ...payload, mine: false }] };
    });
  };

  const onChatPrivateSent = ({ id, recipientId, delivered, message }) => {
    const peerId = String(recipientId);
    setDmMessages((prev) => {
      const list = prev[peerId] || [];
      let reconciled = false;
      const next = list.map((m) => {
        if (!reconciled && m.pending && m.text === message?.text) {
          reconciled = true;
          return { ...(message || m), mine: true, pending: false, delivered };
        }
        return m;
      });
      if (!reconciled && message) {
        next.push({ ...message, mine: true, pending: false, delivered });
      }
      return { ...prev, [peerId]: next };
    });
  };

  const onChatHistory = (payload) => {
    const histRoom = payload?.messages;
    const histDm = payload?.dmMessages;

    if (Array.isArray(histRoom)) {
      setMessages((prev) => {
        const seen = new Set(histRoom.map((m) => m.id).filter(Boolean));
        const extra = prev.filter((m) => m.id && !seen.has(m.id));
        return [...histRoom, ...extra];
      });
    }

    if (histDm && typeof histDm === "object") {
      setDmMessages((prev) => {
        const merged = { ...histDm };
        for (const peerId of Object.keys(prev)) {
          if (!merged[peerId]) merged[peerId] = prev[peerId];
          else {
            const seen = new Set(merged[peerId].map((m) => m.id));
            for (const m of prev[peerId]) {
              if (!seen.has(m.id)) merged[peerId].push(m);
            }
          }
        }
        return merged;
      });
    }
  };

  const onChatError = ({ message }) => {
    console.error("[chat] error:", message);
  };

  const onTerminalReady = ({ writable }) => {
    setTerminalWritable(Boolean(writable));
  };

  const onTerminalDataEvent = (data) => {
    onTerminalDataRef.current?.(data);
  };

  const onRoomMembers = (updatedMembers) => {
    setMembers(updatedMembers || []);
  };

  const onUserJoined = () => {
    const socket = getSocket();
    if (isDriverRef.current && socket?.connected && activeFileIdRef.current) {
      socket.emit("file:focus", {
        roomId,
        fileId: activeFileIdRef.current,
      });
    }
  };

  // ── Actions ───────────────────────────────────────────
  const selectFile = useCallback(
    (fileId, opts = {}) => {
      const id = fileId ? String(fileId) : null;
      setActiveFileId(id);
      activeFileIdRef.current = id;

      const socket = getSocket();
      const shouldBroadcast = opts.broadcast !== false;
      if (shouldBroadcast && isDriverRef.current && socket?.connected) {
        socket.emit("file:focus", { roomId, fileId: id });
      }
    },
    [roomId]
  );

  const saveFileContent = useCallback(
    (newContent) => {
      const fileId = activeFileIdRef.current;
      if (!fileId) return;

      setFiles((prev) => ({
        ...prev,
        [fileId]: { ...(prev[fileId] || {}), content: newContent },
      }));

      const socket = getSocket();
      if (!isDriverRef.current || !socket) return;

      pendingSaveRef.current = { fileId, content: newContent };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (!pending || !socket.connected) return;
        if (!isDriverRef.current) return;

        socket.emit("code:update", {
          roomId,
          fileId: pending.fileId,
          code: pending.content,
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [roomId]
  );

  const requestControl = useCallback(() => {
    const socket = getSocket();
    socket?.emit("driver:request_seat", { roomId, user });
  }, [roomId, user]);

  const releaseControl = useCallback(() => {
    const socket = getSocket();
    socket?.emit("driver:release_seat", { roomId });
  }, [roomId]);

  const approveControlRequest = useCallback(
    (requesterId) => {
      const socket = getSocket();
      if (!socket?.connected) return;
      socket.emit("control:approve", {
        roomId,
        userId: String(requesterId),
      });
      setPendingControlRequest(null);
    },
    [roomId]
  );

  const rejectControlRequest = useCallback(
    (requesterId) => {
      const socket = getSocket();
      if (!socket?.connected) return;
      socket.emit("control:reject", {
        roomId,
        userId: String(requesterId),
      });
      setPendingControlRequest(null);
    },
    [roomId]
  );

  const sendChatMessage = useCallback(
    (text, attachmentIds = []) => {
      const trimmed = (text || "").trim();
      const hasAttachments =
        Array.isArray(attachmentIds) && attachmentIds.length > 0;

      if (!trimmed && !hasAttachments) return;

      const socket = getSocket();
      if (!socket?.connected) return;

      socket.emit("chat:send", {
        roomId,
        text: trimmed || "(attachment)",
        attachmentIds,
      });
    },
    [roomId]
  );

  const sendDirectMessage = useCallback(
    (recipientId, recipientName, text, attachmentIds = []) => {
      const trimmed = (text || "").trim();
      const hasAttachments =
        Array.isArray(attachmentIds) && attachmentIds.length > 0;

      if (!recipientId) return;
      if (!trimmed && !hasAttachments) return;

      const socket = getSocket();
      if (!socket?.connected) return;

      const msgId = `pending-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const optimistic = {
        id: msgId,
        roomId,
        senderId: currentUserIdRef.current,
        senderName: user?.username || "Operator",
        recipientId: String(recipientId),
        recipientName,
        text: trimmed || "(attachment)",
        attachmentIds,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        mine: true,
        pending: true,
      };

      setDmMessages((prev) => ({
        ...prev,
        [String(recipientId)]: [
          ...(prev[String(recipientId)] || []),
          optimistic,
        ],
      }));

      socket.emit("chat:private_send", {
        roomId,
        recipientId: String(recipientId),
        text: trimmed || "(attachment)",
        attachmentIds,
      });
    },
    [roomId, user]
  );

  const uploadAttachment = useCallback(
    async (file) => {
      if (!file) throw new Error("No file selected");

      const MAX = 10 * 1024 * 1024;
      if (file.size > MAX) {
        throw new Error(`File too large. Max ${MAX / 1024 / 1024} MB.`);
      }

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          const commaIdx = result.indexOf(",");
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const res = await apiRequest(`/attachments/rooms/${roomId}`, {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          data: base64,
        }),
      });

      return res.attachment;
    },
    [roomId]
  );

  const writeTerminal = useCallback((input) => {
    if (!isDriverRef.current) return;
    const socket = getSocket();
    socket?.emit("terminal:write", input);
  }, []);

  const resizeTerminal = useCallback((cols, rows) => {
    if (!cols || !rows) return;
    const socket = getSocket();
    socket?.emit("terminal:resize", { cols, rows });
  }, []);

  // ── Derived ───────────────────────────────────────────
  const activeRecord = activeFileId ? files[activeFileId] : null;
  const activeContent = activeRecord?.content ?? "";
  const activeLanguage =
    activeRecord?.language || room?.language || "javascript";

  return {
    socket: socketInstance,
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
    uploadAttachment,
    writeTerminal,
    resizeTerminal,
  };
};

export default useWorkspaceSocket;