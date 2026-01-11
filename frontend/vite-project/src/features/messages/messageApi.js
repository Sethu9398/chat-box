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
    sendMessage: builder.mutation({
      query: ({ chatId, text }) => ({
        url: "/messages",
        method: "POST",
        body: { chatId, text },
      }),
    }),
     uploadMessage: builder.mutation({
      query: (formData) => ({
        url: "/messages/upload",
        method: "POST",
        body: formData,
      }),
    })
  }),
});

export const { useGetMessagesQuery, useSendMessageMutation, useUploadMessageMutation } = messageApi;
