// src/features/auth/authSlice.js
import { createSlice } from "@reduxjs/toolkit";
import socket from "../../socketClient";

const userFromStorage = localStorage.getItem("user")
  ? JSON.parse(localStorage.getItem("user"))
  : null;

const initialState = {
  user: userFromStorage,
  isAuthenticated: !!userFromStorage,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem("user", JSON.stringify(action.payload));
      // Emit user-online to join user room for targeted updates
      socket.emit("user-online", action.payload._id);
    },
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("user");
    },
  },
});

export const { setUser, logoutUser } = authSlice.actions;
export default authSlice.reducer;


