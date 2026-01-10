import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const messageApi = createApi({
  reducerPath: "messageApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getMessages: builder.query({
      query: (chatId) => `/messages/${chatId}`,
    }),
  }),
});

export const { useGetMessagesQuery } = messageApi;
