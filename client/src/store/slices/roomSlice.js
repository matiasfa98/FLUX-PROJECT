import { createSlice } from '@reduxjs/toolkit';

const roomSlice = createSlice({
  name: 'room',
  initialState: {
    activeRoomId: null,
    roomName: '',
    members: [],
    userRole: 'viewer',
  },
  reducers: {
    setActiveRoom: (state, action) => {
      state.activeRoomId = action.payload.id;
      state.roomName = action.payload.name;
    },
    setMembers: (state, action) => {
      state.members = action.payload;
    },
    memberJoined: (state, action) => {
      state.members.push(action.payload);
    },
    memberLeft: (state, action) => {
      state.members = state.members.filter((m) => m.id !== action.payload);
    },
  },
});

export const { setActiveRoom, setMembers, memberJoined, memberLeft } = roomSlice.actions;
export default roomSlice.reducer;