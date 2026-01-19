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
      providesTags: ["Messages"],
    }),
    sendMessage: builder.mutation({
      query: ({ chatId, text, replyTo, isForwarded, mediaUrl, fileName, fileSize, type }) => ({
        url: "/messages",
        method: "POST",
        body: { chatId, text, replyTo, isForwarded, mediaUrl, fileName, fileSize, type },
      }),
      invalidatesTags: ["Messages"],
    }),
    uploadMessage: builder.mutation({
      query: (formData) => ({
        url: "/messages/upload",
        method: "POST",
        body: formData,
        formData: true,
      }),
      invalidatesTags: ["Messages"],
    }),
    deleteForMe: builder.mutation({
      query: (id) => ({
        url: `/messages/${id}/delete-for-me`,
        method: "PUT",
      }),
      invalidatesTags: ["Messages"],
    }),
    deleteForEveryone: builder.mutation({
      query: (id) => ({
        url: `/messages/${id}/delete-for-everyone`,
        method: "PUT",
      }),
      invalidatesTags: ["Messages"],
    }),
    markAsRead: builder.mutation({
      query: (chatId) => ({
        url: `/messages/${chatId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Messages"],
    })
  }),
});

export const { useGetMessagesQuery, useSendMessageMutation, useUploadMessageMutation, useDeleteForMeMutation, useDeleteForEveryoneMutation, useMarkAsReadMutation } = messageApi;
