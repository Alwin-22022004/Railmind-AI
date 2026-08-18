import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import UserDashboard from "../pages/user/Dashboard";
import AdminDashboard from "../pages/admin/Dashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import OperatorDashboard from "../pages/operator/Dashboard";
import MaintenanceDashboard from "../pages/maintenance/Dashboard";

import Compressors from "../pages/compressors/Compressors";
import Analytics from "../pages/analytics/Analytics";
import Alerts from "../pages/alerts/Alerts";
import Prediction from "../pages/prediction/Prediction";

import ProtectedRoute from "../components/ProtectedRoute";

const ALL_ROLES = ["ADMIN", "OPERATOR", "MAINTENANCE", "USER"];

function AppRoutes() {
  return (
    <Routes>
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* USER Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["USER"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      {/* ADMIN Dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ADMIN — Manage Users */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ManageUsers />
          </ProtectedRoute>
        }
      />

      {/* OPERATOR Dashboard */}
      <Route
        path="/operator/dashboard"
        element={
          <ProtectedRoute allowedRoles={["OPERATOR"]}>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />

      {/* MAINTENANCE Dashboard */}
      <Route
        path="/maintenance/dashboard"
        element={
          <ProtectedRoute allowedRoles={["MAINTENANCE"]}>
            <MaintenanceDashboard />
          </ProtectedRoute>
        }
      />

      {/* Shared pages — reachable by every logged-in role via the sidebar */}
      <Route
        path="/compressors"
        element={
          <ProtectedRoute allowedRoles={ALL_ROLES} allowedPermissions={["compressors.view"]}>
            <Compressors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={ALL_ROLES} allowedPermissions={["analytics.view"]}>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute allowedRoles={ALL_ROLES} allowedPermissions={["alerts.view"]}>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prediction"
        element={
          <ProtectedRoute allowedRoles={ALL_ROLES} allowedPermissions={["analytics.view"]}>
            <Prediction />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
