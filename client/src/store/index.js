// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import botReducer from './slices/botSlice';
import authReducer from './slices/authSlice';
import pilotReducer from './slices/pilotSlice';
import roomReducer from './slices/roomSlice';
import chatReducer from './slices/chatSlice';
import billingReducer from './slices/billingSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    bot: botReducer,
    auth: authReducer,
    pilot: pilotReducer,
    room: roomReducer,
    chat: chatReducer,
    billing: billingReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;