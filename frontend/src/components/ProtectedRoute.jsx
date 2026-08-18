import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles, allowedPermissions = [] }) {
  const { isAuthenticated, user, permissions, authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">Checking access…</div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.role?.toUpperCase())) {
    return <Navigate to={user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  if (allowedPermissions.length && !allowedPermissions.some((permission) => permissions.includes(permission))) {
    return <Navigate to={user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return children;
}
export default ProtectedRoute;
