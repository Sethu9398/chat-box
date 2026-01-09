import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000",
    credentials: "include", // JWT cookie
  }),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    // ✅ GET sidebar users
    getSidebarUsers: builder.query({
      query: () => "/users/sidebar",
      providesTags: ["User"],
    }),

    // ✅ UPDATE profile
    updateProfile: builder.mutation({
      query: (formData) => ({
        url: "/users/profile",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

// ✅ EXPORT HOOKS
export const {
  useGetSidebarUsersQuery,
  useUpdateProfileMutation,
} = userApi;
