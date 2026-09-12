import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    isSearchModalOpen: false,
    isUpgradeModalOpen: false,
  },
  reducers: {
    toggleSearchModal: (state) => {
      state.isSearchModalOpen = !state.isSearchModalOpen;
    },
    setSearchModalOpen: (state, action) => {
      state.isSearchModalOpen = action.payload;
    },
    toggleUpgradeModal: (state) => {
      state.isUpgradeModalOpen = !state.isUpgradeModalOpen;
    },
  },
});

export const { toggleSearchModal, setSearchModalOpen, toggleUpgradeModal } = uiSlice.actions;
export default uiSlice.reducer;