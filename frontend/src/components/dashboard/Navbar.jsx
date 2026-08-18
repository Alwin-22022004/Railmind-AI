import { useState } from "react";
import { FiBell, FiMenu, FiSearch, FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "COMP-001 High Pressure Warning", time: "2 min ago", type: "warning" },
  { id: 2, title: "Telemetry Stream Synchronized", time: "10 min ago", type: "info" },
  { id: 3, title: "COMP-003 Filter Maintenance", time: "1 hr ago", type: "error" },
];

function Navbar({ onMenuClick }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  return (
    <header className="h-[64px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-6 transition-colors">
      {/* Left: Mobile hamburger menu + Page title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <FiMenu size={20} />
        </button>

        <div>
          <h1 className="text-base font-extrabold text-[#172033] dark:text-slate-100 leading-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
            Railway Air Compressor Monitoring
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications, Theme toggle, User Profile */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="hidden sm:flex items-center relative">
          <FiSearch className="absolute left-3 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search compressors, telemetry..."
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08A9E6] w-48 lg:w-64 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <FiBell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-xs text-[#172033] dark:text-slate-100">
                  System Alerts & Notifications
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <FiX size={14} />
                </button>
              </div>

              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No unread notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                    >
                      {n.type === "warning" || n.type === "error" ? (
                        <FiAlertCircle className="text-amber-500 mt-0.5 shrink-0" size={14} />
                      ) : (
                        <FiCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={14} />
                      )}
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-[#172033] dark:text-slate-200">{n.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  className="w-full text-center text-xs font-semibold text-[#08A9E6] pt-2 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
          <FaUserCircle size={32} className="text-[#08A9E6]" />

          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold leading-tight text-[#172033] dark:text-slate-100">
              {user?.fullName || user?.full_name || "Alwin"}
            </p>
            <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#08A9E6]/10 text-[#08A9E6]">
              {user?.role || "ADMINISTRATOR"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
