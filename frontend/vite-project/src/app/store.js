import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import chatReducer from "../features/chat/chatSlice";

import { authApi } from "../features/auth/authApi";
import { userApi } from "../features/users/userApi";
import { chatApi } from "../features/chat/chatApi";
import { messageApi } from "../features/messages/messageApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,

    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [messageApi.reducerPath]: messageApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      userApi.middleware,
      chatApi.middleware,
      messageApi.middleware
    ),
});
