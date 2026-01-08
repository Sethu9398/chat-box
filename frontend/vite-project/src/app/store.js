import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { authApi } from "../features/auth/authApi";
import { userApi } from "../features/users/userApi"; // ✅ ADD THIS

export const store = configureStore({
  reducer: {
    auth: authReducer,

    // RTK Query reducers
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer, // ✅ ADD THIS
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      userApi.middleware // ✅ ADD THIS
    ),
});

