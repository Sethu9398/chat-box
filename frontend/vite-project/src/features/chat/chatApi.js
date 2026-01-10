import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => "/users/sidebar",
    }),
    getOrCreateChat: builder.mutation({
      query: (userId) => ({
        url: `/messages/chat/${userId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetOrCreateChatMutation,
} = chatApi;


