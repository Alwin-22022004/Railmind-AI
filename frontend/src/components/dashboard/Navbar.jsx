import { useState, useEffect, useCallback, useRef } from "react";
import { FiBell, FiMenu, FiSearch, FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { getAlerts } from "../../services/alertService";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, hasPermission } = useAuth();
  const user = authUser || JSON.parse(localStorage.getItem("user") || "null");

  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const storageKey = user?.id ? `railmind_dismissed_alerts_${user.id}` : "railmind_dismissed_alerts";
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const dropdownRef = useRef(null);

  // Sync dismissed IDs when storage key / user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setDismissedIds(saved ? JSON.parse(saved) : []);
    } catch {
      setDismissedIds([]);
    }
  }, [storageKey]);

  // Click outside listener for notification dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = useCallback(async () => {
    if (isFetchingRef.current) return;
    const token = localStorage.getItem("token");
    if (!isAuthenticated && !token) {
      setLoading(false);
      return;
    }

    if (hasPermission && !hasPermission("alerts.view")) {
      setAlerts([]);
      setError(null);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    try {
      const res = await getAlerts({ status: "ACTIVE", limit: 20 });
      if (!isMountedRef.current) return;
      if (res?.success && Array.isArray(res.data)) {
        setAlerts(res.data);
        setError(null);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Failed to load notifications:", err);
      if (err?.response?.status === 403) {
        setAlerts([]);
        setError(null);
      } else {
        setError(err?.response?.data?.message || "Failed to load notifications");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, hasPermission]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 12000); // 12-second lightweight polling

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchNotifications]);

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      fetchNotifications();
    }
  };

  const handleClearAll = () => {
    const currentAlertIds = alerts.map((a) => String(a.id));
    const nextDismissed = Array.from(new Set([...dismissedIds, ...currentAlertIds]));
    setDismissedIds(nextDismissed);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextDismissed));
    } catch (err) {
      console.error("Failed to persist dismissed notifications:", err);
    }
  };

  const handleDismissOne = (e, alertId) => {
    e.stopPropagation();
    const nextDismissed = Array.from(new Set([...dismissedIds, String(alertId)]));
    setDismissedIds(nextDismissed);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextDismissed));
    } catch (err) {
      console.error("Failed to persist dismissed notification:", err);
    }
  };

  const handleNotificationClick = (alert) => {
    setShowNotifications(false);
    navigate(`/alerts?assetCode=${encodeURIComponent(alert.asset_code || "")}`);
  };

  const visibleNotifications = alerts.filter(
    (alert) => !dismissedIds.includes(String(alert.id))
  );

  const badgeCount = visibleNotifications.length;

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
          <label htmlFor="navbar-search-input" className="sr-only">Search compressors</label>
          <FiSearch className="absolute left-3 text-slate-400" size={14} />
          <input
            id="navbar-search-input"
            name="navbarSearch"
            aria-label="Search compressors, telemetry"
            type="text"
            placeholder="Search compressors, telemetry..."
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08A9E6] w-48 lg:w-64 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <FiBell size={18} />
            {badgeCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#172033] dark:text-slate-100">
                    System Alerts & Notifications
                  </span>
                  {badgeCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#08A9E6]/10 text-[#08A9E6]">
                      {badgeCount} active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  aria-label="Close notifications"
                >
                  <FiX size={14} />
                </button>
              </div>

              <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                {loading && visibleNotifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading notifications...</p>
                ) : error ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>
                  </div>
                ) : visibleNotifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No new notifications</p>
                ) : (
                  visibleNotifications.map((alert) => {
                    const level = (alert.level || "info").toLowerCase();
                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleNotificationClick(alert)}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group relative"
                      >
                        {level === "critical" ? (
                          <FiAlertCircle className="text-rose-500 mt-0.5 shrink-0" size={15} />
                        ) : level === "warning" ? (
                          <FiAlertCircle className="text-amber-500 mt-0.5 shrink-0" size={15} />
                        ) : (
                          <FiCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={15} />
                        )}
                        <div className="flex-1 text-xs min-w-0 pr-4">
                          <div className="flex items-baseline justify-between gap-1">
                            <p className="font-semibold text-[#172033] dark:text-slate-200 truncate">
                              {alert.asset_code ? `${alert.asset_code} · ` : ""}{alert.title}
                            </p>
                            <span
                              className="text-[10px] text-slate-400 shrink-0"
                              title={new Date(alert.created_at).toLocaleString()}
                            >
                              {formatRelativeTime(alert.created_at)}
                            </span>
                          </div>
                          {alert.message && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {alert.message}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                level === "critical"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : level === "warning"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              }`}
                            >
                              {alert.level}
                            </span>
                            {alert.is_acknowledged && (
                              <span className="text-[9px] font-semibold text-slate-400">
                                Acknowledged
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDismissOne(e, alert.id)}
                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                          title="Dismiss notification"
                          aria-label="Dismiss notification"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {visibleNotifications.length > 0 && (
                <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-[#08A9E6] hover:underline"
                  >
                    Clear all
                  </button>
                  <Link
                    to="/alerts"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#08A9E6] dark:hover:text-[#08A9E6] transition-colors"
                  >
                    View all alerts &rarr;
                  </Link>
                </div>
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
