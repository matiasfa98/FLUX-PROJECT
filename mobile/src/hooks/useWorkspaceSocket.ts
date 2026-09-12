// mobile/src/hooks/useWorkspaceSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { connectSocket, getSocket } from "../lib/socket";

const CHAT_HISTORY_LIMIT = 200;

export interface FileNode {
  _id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  parent: string | null;
  language?: string;
  size?: number;
}

export interface RoomDriver {
  _id: string;
  username: string;
  avatar?: string;
}

export interface RoomMember {
  user: { _id: string; username: string; avatar?: string };
  role: string;
}

export const useWorkspaceSocket = (roomId: string | null) => {
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");

  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [driver, setDriver] = useState<RoomDriver | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [files, setFiles] = useState<Record<string, any>>({});
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [terminalBuffer, setTerminalBuffer] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [dmMessages, setDmMessages] = useState<Record<string, any[]>>({});

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      let socket = getSocket();
      if (!socket || !socket.connected) {
        try {
          socket = await connectSocket();
        } catch (err) {
          console.error("[workspace] socket connect failed:", err);
          return;
        }
      }
      if (cancelled) return;

      setConnected(socket.connected);

      const onConnect = () => {
        setConnected(true);
        socket.emit("room:join", { roomId });
        socket.emit("terminal:init", { roomId });
        socket.emit("chat:history", { roomId, limit: CHAT_HISTORY_LIMIT });
      };

      const onDisconnect = () => setConnected(false);

      const onRoomState = (state: any) => {
        if (!state) return;
        setRoom(state.room || null);
        setMembers(state.members || []);
        setFileTree(Array.isArray(state.fileTree) ? state.fileTree : []);
        setFiles(state.files || {});
        setActiveFileId(state.activeFileId || null);

        const raw = state.driver?._id || state.driver?.id || state.driver;
        if (raw && String(raw) !== "null") {
          if (typeof state.driver === "object") {
            setDriver({
              _id: state.driver._id || state.driver.id,
              username: state.driver.username || "Driver",
              avatar: state.driver.avatar,
            });
          } else {
            setDriver({
              _id: String(raw),
              username: state.driverName || "Driver",
            });
          }
        } else {
          setDriver(null);
        }
      };

      const onFsTree = (payload: any) => {
        if (!Array.isArray(payload?.fileTree)) return;
        setFileTree(payload.fileTree);
        setFiles((prev) => {
          const next = { ...prev };
          const seen = new Set<string>();
          for (const n of payload.fileTree) {
            const id = String(n._id);
            seen.add(id);
            if (n.type === "folder") {
              next[id] = { ...(prev[id] || {}), ...n };
            } else if (next[id]) {
              next[id] = { ...next[id], ...n };
            } else {
              next[id] = { ...n, content: "" };
            }
          }
          for (const id of Object.keys(next)) {
            if (!seen.has(id)) delete next[id];
          }
          return next;
        });
      };

      const onCodeSync = ({ fileId, code, version, language }: any) => {
        if (!fileId) return;
        setFiles((prev) => ({
          ...prev,
          [fileId]: {
            ...(prev[fileId] || { _id: fileId }),
            content: code,
            version:
              typeof version === "number" ? version : prev[fileId]?.version,
            language: language || prev[fileId]?.language,
          },
        }));
      };

      const onFileSaved = ({ fileId, content, version, language }: any) => {
        if (!fileId) return;
        setFiles((prev) => ({
          ...prev,
          [fileId]: {
            ...(prev[fileId] || { _id: fileId }),
            content,
            version: version ?? prev[fileId]?.version,
            language: language || prev[fileId]?.language,
          },
        }));
      };

      const onDriverHandoff = (payload: any) => {
        const raw =
          payload?.nextDriverId ||
          payload?._id ||
          payload?.id ||
          (typeof payload === "string" ? payload : "");
        const id = String(raw || "");
        if (id && id !== "null" && id !== "undefined") {
          setDriver({
            _id: id,
            username: payload.nextDriverName || payload.username || "Driver",
            avatar: payload.avatar,
          });
        } else {
          setDriver(null);
        }
      };

      const onMembers = (updated: any[]) => setMembers(updated || []);

      const onTerminalData = (chunk: string) => {
        setTerminalBuffer((prev) => {
          const next = prev + chunk;
          return next.length > 200_000 ? next.slice(-200_000) : next;
        });
      };

      const onChatMessage = (msg: any) => {
        if (!msg) return;
        if (msg.kind && msg.kind !== "room") return;
        setMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      };

      const onChatPrivate = (payload: any) => {
        if (!payload) return;
        const uid = currentUserIdRef.current;
        const peerId =
          String(payload.senderId) === uid
            ? String(payload.recipientId)
            : String(payload.senderId);
        setDmMessages((prev) => {
          const list = prev[peerId] || [];
          if (payload.id && list.some((m) => m.id === payload.id)) return prev;
          return { ...prev, [peerId]: [...list, { ...payload, mine: false }] };
        });
      };

      const onChatPrivateSent = ({
        recipientId,
        delivered,
        message,
      }: any) => {
        const peerId = String(recipientId);
        setDmMessages((prev) => {
          const list = prev[peerId] || [];
          let reconciled = false;
          const next = list.map((m) => {
            if (!reconciled && m.pending && m.text === message?.text) {
              reconciled = true;
              return {
                ...(message || m),
                mine: true,
                pending: false,
                delivered,
              };
            }
            return m;
          });
          if (!reconciled && message) {
            next.push({ ...message, mine: true, pending: false, delivered });
          }
          return { ...prev, [peerId]: next };
        });
      };

      const onChatHistory = (payload: any) => {
        if (Array.isArray(payload?.messages)) {
          setMessages((prev) => {
            const seen = new Set(
              payload.messages.map((m: any) => m.id).filter(Boolean)
            );
            const extra = prev.filter((m) => m.id && !seen.has(m.id));
            return [...payload.messages, ...extra];
          });
        }
        if (payload?.dmMessages && typeof payload.dmMessages === "object") {
          setDmMessages(payload.dmMessages);
        }
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("room:state", onRoomState);
      socket.on("fs:tree", onFsTree);
      socket.on("code:sync", onCodeSync);
      socket.on("fs:file-saved", onFileSaved);
      socket.on("driver:handoff", onDriverHandoff);
      socket.on("room:members", onMembers);
      socket.on("file:focus", (payload: any) => {
  console.log("[workspace] file:focus received:", payload);
  if (payload?.fileId) {
    setActiveFileId(String(payload.fileId));
  }
});
      socket.on("terminal:data", onTerminalData);
      socket.on("chat:message", onChatMessage);
      socket.on("chat:private", onChatPrivate);
      socket.on("chat:private_sent", onChatPrivateSent);
      socket.on("chat:history", onChatHistory);

      if (socket.connected) onConnect();

      cleanup = () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("room:state", onRoomState);
        socket.off("fs:tree", onFsTree);
        socket.off("code:sync", onCodeSync);
        socket.off("fs:file-saved", onFileSaved);
        socket.off("driver:handoff", onDriverHandoff);
        socket.off("room:members", onMembers);
        socket.off("terminal:data", onTerminalData);
        socket.off("chat:message", onChatMessage);
        socket.off("chat:private", onChatPrivate);
        socket.off("chat:private_sent", onChatPrivateSent);
        socket.off("chat:history", onChatHistory);
      };
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [roomId]);

  const sendChatMessage = useCallback(
    (text: string) => {
      const trimmed = (text || "").trim();
      if (!trimmed || !roomId) return;
      const socket = getSocket();
      if (!socket?.connected) return;
      socket.emit("chat:send", { roomId, text: trimmed });
    },
    [roomId]
  );

  const sendDirectMessage = useCallback(
    (recipientId: string, text: string) => {
      const trimmed = (text || "").trim();
      if (!recipientId || !trimmed || !roomId) return;
      const socket = getSocket();
      if (!socket?.connected) return;
      socket.emit("chat:private_send", {
        roomId,
        recipientId: String(recipientId),
        text: trimmed,
      });
    },
    [roomId]
  );

  const activeFile = activeFileId ? files[activeFileId] : null;
  const activeContent = activeFile?.content ?? "";
  const activeLanguage =
    activeFile?.language || room?.language || "javascript";
  const isDriver = Boolean(driver && driver._id === currentUserId);

  return {
    connected,
    room,
    driver,
    members,
    fileTree,
    files,
    activeFileId,
    activeContent,
    activeLanguage,
    terminalBuffer,
    messages,
    dmMessages,
    isDriver,
    currentUserId,
    sendChatMessage,
    sendDirectMessage,
  };
};

export default useWorkspaceSocket;