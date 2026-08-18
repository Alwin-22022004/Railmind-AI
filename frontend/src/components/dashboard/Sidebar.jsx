import {
  FaTachometerAlt,
  FaCogs,
  FaChartLine,
  FaRobot,
  FaExclamationTriangle,
  FaUsers,
  FaSignOutAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import { FiChevronLeft } from "react-icons/fi";
import { Train } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Sidebar({ open, onClose, collapsed = false, onToggle }) {
  const navigate = useNavigate();
  const { logout, user, hasPermission } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const dashboardPathByRole = {
    ADMIN: "/admin/dashboard",
    OPERATOR: "/operator/dashboard",
    MAINTENANCE: "/maintenance/dashboard",
    USER: "/dashboard",
  };

  const menuItems = [
    { name:"Dashboard", icon:<FaTachometerAlt size={17}/>, path:dashboardPathByRole[user?.role]||"/dashboard", permission:"dashboard.view" },
    { name:"Compressors", icon:<FaCogs size={17}/>, path:"/compressors", permission:"compressors.view" },
    { name:"Analytics", icon:<FaChartLine size={17}/>, path:"/analytics", permission:"analytics.view" },
    { name:"Alerts", icon:<FaExclamationTriangle size={17}/>, path:"/alerts", permission:"alerts.view" },
    { name:"Maintenance", icon:<FaCogs size={17}/>, path:"/maintenance/dashboard", permission:"maintenance.view" },
    { name:"Users", icon:<FaUsers size={17}/>, path:"/admin/users", permission:"users.view" },
  ];

  const visibleItems = menuItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        style={{ backgroundColor: "#0B1328" }}
        className={`fixed md:sticky top-0 left-0 z-50 h-screen text-slate-200 border-r border-slate-800/80 flex flex-col transition-[width,transform] duration-300 ease-in-out shrink-0 select-none overflow-x-hidden ${
          collapsed ? "md:w-[84px]" : "md:w-[300px]"
        } w-[300px] ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header Branding & Collapse Arrow */}
        <div
          className={`h-16 px-4 flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          } border-b border-slate-800/80 relative shrink-0 select-none`}
        >
          {collapsed ? (
            /* Collapsed Header: Centered Clickable RailMind AI Logo with Tooltip (NO ARROW BUTTON) */
            <div
              onClick={onToggle}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle?.()}
              role="button"
              tabIndex={0}
              title="Expand RailMind AI"
              aria-label="Expand sidebar"
              className="flex items-center justify-center cursor-pointer group relative py-1 px-2 rounded-xl hover:bg-slate-800/50 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0 group-hover:border-cyan-400/60 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-200">
                <Train className="w-5 h-5" />
              </div>
              <span className="fixed left-[94px] px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700/80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                Expand RailMind AI
              </span>
            </div>
          ) : (
            /* Expanded Header: Logo + Title on Left, Circular Collapse Arrow Button on Right */
            <>
              <div
                onClick={onToggle}
                className="flex items-center gap-3.5 overflow-hidden cursor-pointer group"
                title="Collapse sidebar"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0 group-hover:border-cyan-400/60 transition-all duration-200">
                  <Train className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h1 className="text-base font-extrabold tracking-tight text-white leading-tight truncate">
                    RailMind <span className="text-cyan-400">AI</span>
                  </h1>
                  <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-400 truncate -mt-0.5">
                    ENTERPRISE PLATFORM
                  </p>
                </div>
              </div>

              {/* Circular Collapse Arrow Button (Visible ONLY when Expanded) */}
              {onToggle && (
                <button
                  onClick={onToggle}
                  className="hidden md:flex w-7 h-7 rounded-full bg-slate-800 hover:bg-[#08A9E6] text-slate-300 hover:text-white items-center justify-center border border-slate-700 shadow-md transition-all duration-150 shrink-0 cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <FiChevronLeft size={14} />
                </button>
              )}
            </>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 ml-auto"
            aria-label="Close menu"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-1.5">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 transition-opacity duration-200">
              MENU NAVIGATION
            </p>
          )}

          {visibleItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center h-11 transition-all duration-200 rounded-lg text-xs font-semibold ${
                  collapsed
                    ? "justify-center px-0 mx-auto w-11"
                    : "gap-3.5 px-3.5 mx-0 w-full"
                } ${
                  isActive
                    ? "bg-[#08A9E6] text-white shadow-[0_0_12px_rgba(8,169,230,0.35)] font-bold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`shrink-0 flex items-center justify-center transition-transform duration-200 ${
                      isActive ? "text-white" : ""
                    }`}
                  >
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <span className="truncate whitespace-nowrap transition-opacity duration-200">
                      {item.name}
                    </span>
                  )}

                  {/* Tooltip on Hover when Collapsed */}
                  {collapsed && (
                    <span className="fixed left-[94px] px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700/80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="px-3">
          <div className="h-[1px] bg-slate-800/80" />
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 space-y-2.5 shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
                  <FaUser size={13} />
                </div>
                <div className="truncate">
                  <p className="font-bold text-slate-100 truncate leading-tight">
                    {user?.fullName || user?.full_name || "Alwin"}
                  </p>
                  <p className="text-[9.5px] text-cyan-400 uppercase font-extrabold tracking-wider mt-0.5">
                    {user?.role || "ADMIN"}
                  </p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" />
            </div>
          ) : (
            <div className="group relative flex justify-center py-1 mx-auto">
              <div className="w-11 h-11 rounded-lg bg-slate-900/70 border border-slate-800/80 flex items-center justify-center text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer">
                <FaUser size={15} />
              </div>
              <span className="fixed left-[94px] px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700/80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                {user?.fullName || user?.full_name || "Alwin"} ({user?.role || "ADMIN"})
              </span>
            </div>
          )}

          {!collapsed ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2.5 w-full py-2.5 px-3.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-800/30 transition-colors cursor-pointer"
            >
              <FaSignOutAlt size={14} />
              <span>Logout</span>
            </button>
          ) : (
            <div className="group relative flex justify-center mx-auto">
              <button
                onClick={handleLogout}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-rose-300 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-800/30 transition-colors cursor-pointer"
                aria-label="Logout"
              >
                <FaSignOutAlt size={15} />
              </button>
              <span className="fixed left-[94px] px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700/80 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                Logout
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
