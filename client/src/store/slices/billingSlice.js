import { createSlice } from '@reduxjs/toolkit';

const billingSlice = createSlice({
  name: 'billing',
  initialState: {
    plan: 'free',
    isUpgrading: false,
  },
  reducers: {
    setSubscriptionPlan: (state, action) => {
      state.plan = action.payload;
    },
  },
});

export const { setSubscriptionPlan } = billingSlice.actions;
export default billingSlice.reducer;