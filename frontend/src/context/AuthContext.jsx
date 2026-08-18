import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [permissions, setPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("permissions")) || []; } catch { return []; }
  });
  const [authLoading, setAuthLoading] = useState(Boolean(token));

  const persist = (nextUser, nextToken, nextPermissions = []) => {
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.setItem("token", nextToken);
    localStorage.setItem("permissions", JSON.stringify(nextPermissions));
    setUser(nextUser);
    setToken(nextToken);
    setPermissions(nextPermissions);
  };

  const login = (userData, jwtToken, permissionList = userData?.permissions || []) => {
    persist(userData, jwtToken, permissionList);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    setUser(null);
    setToken(null);
    setPermissions([]);
  };

  useEffect(() => {
    let active = true;
    async function refreshAccess() {
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await api.get("/users/me/access");
        if (!active) return;
        const current = response.data?.data;
        if (current) {
          const nextUser = {
            id: current.id,
            fullName: current.full_name,
            email: current.email,
            role: current.role,
          };
          const nextPermissions = current.permissions || [];
          localStorage.setItem("user", JSON.stringify(nextUser));
          localStorage.setItem("permissions", JSON.stringify(nextPermissions));
          setUser(nextUser);
          setPermissions(nextPermissions);
        }
      } catch {
        if (active) logout();
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    refreshAccess();
    return () => { active = false; };
  }, [token]);

  const hasPermission = (permission) => permissions.includes(permission);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      permissions,
      login,
      logout,
      hasPermission,
      authLoading,
      isAuthenticated: Boolean(token),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
