// mobile/src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./slices/chatSlice";
import roomReducer from "./slices/roomSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    room: roomReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;