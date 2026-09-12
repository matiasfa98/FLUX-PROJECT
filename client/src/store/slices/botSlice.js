// src/store/slices/botSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOpen: false,
  messages: [
    {
      id: 1,
      sender: 'bot',
      text: 'Flux Copilot online. How can I assist with your workspace or cluster today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]
};

export const botSlice = createSlice({
  name: 'bot',
  initialState,
  reducers: {
    toggleDrawer: (state) => {
      state.isOpen = !state.isOpen;
    },
    openDrawer: (state) => {
      state.isOpen = true;
    },
    closeDrawer: (state) => {
      state.isOpen = false;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    // Also listen if dispatched via loose action type
    builder.addCase('ui/toggleBotDrawer', (state) => {
      state.isOpen = !state.isOpen;
    });
  }
});

export const { toggleDrawer, openDrawer, closeDrawer, addMessage } = botSlice.actions;
export default botSlice.reducer;