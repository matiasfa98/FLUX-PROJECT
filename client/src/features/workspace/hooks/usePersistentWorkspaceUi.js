// client/src/features/workspace/hooks/usePersistentWorkspaceUi.js
import { useState, useCallback } from "react";

/*
|--------------------------------------------------------------------------
| MODULE-SCOPE UI STORE
|--------------------------------------------------------------------------
| Lives outside React. Survives component unmounts, route changes
| (playground, chat, home), and React StrictMode double-mounts.
|
| Cleared only when the browser tab closes or the user opens a
| different room.
|--------------------------------------------------------------------------
*/
const uiStore = {
  roomId: null,
  leftWidth: 250,
  rightWidth: 320,
  terminalHeight: 220,
  videoPanelHeight: 150,
  activeRailTab: "files",
  openTabs: [],
  searchFilter: "",
  activeDmPeer: null,
};

function resetForRoom(roomId) {
  if (uiStore.roomId === roomId) return;
  uiStore.roomId = roomId;
  uiStore.leftWidth = 250;
  uiStore.rightWidth = 320;
  uiStore.terminalHeight = 220;
  uiStore.videoPanelHeight = 150;
  uiStore.activeRailTab = "files";
  uiStore.openTabs = [];
  uiStore.searchFilter = "";
  uiStore.activeDmPeer = null;
}

export const usePersistentWorkspaceUi = (roomId) => {
  // Ensure the store is scoped to this room.
  resetForRoom(roomId);

  // We use one state object so a single setState triggers one re-render
  // and the persistence is trivially correct.
  const [state, setState] = useState(() => ({ ...uiStore }));

  const update = useCallback((patch) => {
    // Merge into store.
    Object.assign(uiStore, patch);
    // Merge into component state.
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return [state, update];
};