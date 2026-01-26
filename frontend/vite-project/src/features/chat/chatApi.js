import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000",
    credentials: "include",
  }),
  tagTypes: ["Groups"],
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
    createGroup: builder.mutation({
      query: ({ name, members, avatar }) => {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("members", JSON.stringify(members));
        if (avatar) {
          formData.append("avatar", avatar);
        }
        return {
          url: "/groups/create",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Groups"],
    }),
    getMyGroups: builder.query({
      query: () => "/groups",
      providesTags: ["Groups"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetOrCreateChatMutation,
  useCreateGroupMutation,
  useGetMyGroupsQuery,
} = chatApi;
