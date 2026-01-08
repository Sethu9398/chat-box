import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/auth",
    credentials: "include", // IMPORTANT for cookies
  }),
  
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: (formData) => ({
        url: "/signup",
        method: "POST",
        body: formData,
      }),
    }),

    login: builder.mutation({
      query: (data) => ({
        url: "/login",
        method: "POST",
        body: data,
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
    }),
     // ✅ NEW
    getMe: builder.query({
      query: () => "/me",
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
} = authApi;
