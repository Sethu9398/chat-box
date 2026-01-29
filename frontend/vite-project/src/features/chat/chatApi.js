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
    leaveGroup: builder.mutation({
      query: (groupId) => ({
        url: `/groups/${groupId}/leave`,
        method: "POST",
      }),
      invalidatesTags: ["Groups"],
    }),
    deleteGroup: builder.mutation({
      query: (groupId) => ({
        url: `/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups"],
    }),
    updateGroup: builder.mutation({
      query: ({ groupId, name, avatar }) => {
        const formData = new FormData();
        if (name) {
          formData.append("name", name);
        }
        if (avatar instanceof File) {
          formData.append("avatar", avatar);
        }
        return {
          url: `/groups/${groupId}`,
          method: "PUT",
          body: formData,
        };
      },
      invalidatesTags: ["Groups"],
    }),
    addMembers: builder.mutation({
      query: ({ groupId, memberIds }) => ({
        url: `/groups/${groupId}/members/add`,
        method: "POST",
        body: { memberIds },
      }),
      invalidatesTags: ["Groups"],
    }),
    removeMember: builder.mutation({
      query: ({ groupId, memberId }) => ({
        url: `/groups/${groupId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetOrCreateChatMutation,
  useCreateGroupMutation,
  useGetMyGroupsQuery,
  useLeaveGroupMutation,
  useDeleteGroupMutation,
  useUpdateGroupMutation,
  useAddMembersMutation,
  useRemoveMemberMutation,
} = chatApi;
