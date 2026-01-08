import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000",
    credentials: "include", // JWT cookie
  }),
  endpoints: (builder) => ({
    getSidebarUsers: builder.query({
      query: () => "/users/sidebar",
    }),
  }),
});

export const { useGetSidebarUsersQuery } = userApi;
