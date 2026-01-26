import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    selectedUser: null,
    selectedGroup: null,
    typingUsers: {}, // { chatId: [userId1, userId2, ...] }
  },
  reducers: {
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    setSelectedGroup: (state, action) => {
      state.selectedGroup = action.payload;
    },
    clearSelectedGroup: (state) => {
      state.selectedGroup = null;
    },
    setTypingUsers: (state, action) => {
      const { chatId, users } = action.payload;
      state.typingUsers[chatId] = users;
    },
    addTypingUser: (state, action) => {
      const { chatId, userId } = action.payload;
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = [];
      }
      if (!state.typingUsers[chatId].includes(userId)) {
        state.typingUsers[chatId].push(userId);
      }
    },
    removeTypingUser: (state, action) => {
      const { chatId, userId } = action.payload;
      if (state.typingUsers[chatId]) {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter(id => id !== userId);
        if (state.typingUsers[chatId].length === 0) {
          delete state.typingUsers[chatId];
        }
      }
    },
  },
});

export const { setSelectedUser, clearSelectedUser, setSelectedGroup, clearSelectedGroup, addTypingUser, removeTypingUser } = chatSlice.actions;
export default chatSlice.reducer;



