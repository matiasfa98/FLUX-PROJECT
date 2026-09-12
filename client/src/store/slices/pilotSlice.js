import { createSlice } from '@reduxjs/toolkit';

const pilotSlice = createSlice({
  name: 'pilot',
  initialState: {
    activePilotId: null,
    queue: [],
    isLocked: false,
  },
  reducers: {
    setPilotState: (state, action) => {
      state.activePilotId = action.payload.activePilotId;
      state.isLocked = action.payload.isLocked ?? false;
    },
    updatePilotQueue: (state, action) => {
      state.queue = action.payload;
    },
  },
});

export const { setPilotState, updatePilotQueue } = pilotSlice.actions;
export default pilotSlice.reducer;