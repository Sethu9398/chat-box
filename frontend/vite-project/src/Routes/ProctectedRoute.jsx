// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // ❌ Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in
  return <Outlet />;
};

export default ProtectedRoute;

