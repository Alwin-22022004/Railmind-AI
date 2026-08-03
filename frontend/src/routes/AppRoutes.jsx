import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import UserDashboard from "../pages/user/Dashboard";
import AdminDashboard from "../pages/admin/Dashboard";
import OperatorDashboard from "../pages/operator/Dashboard";
import MaintenanceDashboard from "../pages/maintenance/Dashboard";

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboards */}
      <Route path="/user/dashboard" element={<UserDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/operator/dashboard" element={<OperatorDashboard />} />
      <Route path="/maintenance/dashboard" element={<MaintenanceDashboard />} />
    </Routes>
  );
}

export default AppRoutes;
