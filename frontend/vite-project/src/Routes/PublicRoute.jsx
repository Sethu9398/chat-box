import { Navigate, Outlet } from "react-router-dom";

export default function PublicRoute() {
  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "null"
  );

  // ✅ If logged in → Redirect to home
  if (currentUser && currentUser._id) {
    return <Navigate to="/" replace />;
  }

  // ❌ Not logged in → Allow access to login/signup
  return <Outlet />;
}