import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    plan: 'free',
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setPlan: (state, action) => {
      state.plan = action.payload;
    },
  },
});

export const { setUser, setPlan } = authSlice.actions;
export default authSlice.reducer;