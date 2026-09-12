// mobile/src/store/slices/roomSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RoomState {
  activeRoomId: string | null;
  room: any | null;
  members: any[];
  driver: any | null;
  fileTree: any[];
  files: Record<string, any>;
  activeFileId: string | null;
  messages: any[];
}

const initialState: RoomState = {
  activeRoomId: null,
  room: null,
  members: [],
  driver: null,
  fileTree: [],
  files: {},
  activeFileId: null,
  messages: [],
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setActiveRoom(state, action: PayloadAction<string | null>) {
      state.activeRoomId = action.payload;
      if (!action.payload) {
        // Reset everything when leaving a room.
        state.room = null;
        state.members = [];
        state.driver = null;
        state.fileTree = [];
        state.files = {};
        state.activeFileId = null;
        state.messages = [];
      }
    },
    setRoomState(state, action: PayloadAction<any>) {
      const s = action.payload;
      state.room = s.room || null;
      state.members = s.members || [];
      state.driver = s.driver || null;
      state.fileTree = s.fileTree || [];
      state.files = s.files || {};
      state.activeFileId = s.activeFileId || null;
    },
    setFileTree(state, action: PayloadAction<any[]>) {
      state.fileTree = action.payload || [];
    },
    setFiles(state, action: PayloadAction<Record<string, any>>) {
      state.files = action.payload || {};
    },
    updateFileContent(
      state,
      action: PayloadAction<{ fileId: string; content: string; version?: number; language?: string }>
    ) {
      const { fileId, content, version, language } = action.payload;
      if (!state.files[fileId]) state.files[fileId] = { _id: fileId };
      state.files[fileId].content = content;
      if (typeof version === "number") state.files[fileId].version = version;
      if (language) state.files[fileId].language = language;
    },
    setActiveFileId(state, action: PayloadAction<string | null>) {
      state.activeFileId = action.payload;
    },
    setDriver(state, action: PayloadAction<any>) {
      state.driver = action.payload;
    },
    setMembers(state, action: PayloadAction<any[]>) {
      state.members = action.payload || [];
    },
    appendMessage(state, action: PayloadAction<any>) {
      const msg = action.payload;
      if (!msg) return;
      if (msg.id && state.messages.some((m) => m.id === msg.id)) return;
      state.messages.push(msg);
    },
    setMessages(state, action: PayloadAction<any[]>) {
      state.messages = action.payload || [];
    },
  },
});

export const {
  setActiveRoom,
  setRoomState,
  setFileTree,
  setFiles,
  updateFileContent,
  setActiveFileId,
  setDriver,
  setMembers,
  appendMessage,
  setMessages,
} = roomSlice.actions;

export default roomSlice.reducer;