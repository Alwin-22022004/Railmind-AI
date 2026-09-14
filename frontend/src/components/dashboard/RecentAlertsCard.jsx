import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { getAlerts } from "../../services/alertService";

function RecentAlertsCard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchAlerts() {
      try {
        const res = await getAlerts({ limit: 5 });
        if (active) {
          setAlerts(res.data || []);
        }
      } catch (e) {
        console.error("Failed to load recent alerts:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="industrial-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-sm font-extrabold text-[#172033] dark:text-slate-100">
            Recent System Diagnostic Alerts
          </h4>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Live Telemetry Rules
          </span>
        </div>

        <div className="py-3 space-y-2.5">
          {loading && !alerts.length ? (
            <p className="text-xs text-slate-400 py-4">Loading real-time alerts...</p>
          ) : (
            alerts.slice(0, 4).map((alert) => {
              const level = (alert.level || "INFO").toUpperCase();
              let bgClass = "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300";
              let badgeClass = "bg-slate-200 text-slate-700";
              let Icon = FiInfo;

              if (alert.is_resolved) {
                bgClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
                badgeClass = "bg-emerald-600 text-white";
                Icon = FiCheckCircle;
              } else if (level === "CRITICAL") {
                bgClass = "bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/30 dark:border-rose-800/40";
                badgeClass = "bg-rose-600 text-white";
                Icon = FiAlertTriangle;
              } else if (level === "WARNING") {
                bgClass = "bg-amber-500/10 border-amber-500/20 dark:bg-amber-950/30 dark:border-amber-800/40";
                badgeClass = "bg-amber-500 text-slate-950";
                Icon = FiAlertCircle;
              }

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition-colors ${bgClass}`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[9px] font-black rounded uppercase ${badgeClass}`}>
                          {alert.is_resolved ? "RESOLVED" : level}
                        </span>
                        <span className="font-mono font-bold text-[#172033] dark:text-slate-100">
                          {alert.asset_code}
                        </span>
                      </div>
                      <p className="font-semibold text-[#172033] dark:text-slate-200 mt-1 leading-snug">
                        {alert.title}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}

          {!loading && !alerts.length && (
            <div className="text-center py-6 text-xs text-slate-400">
              No recent diagnostic alerts recorded.
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate("/alerts")}
          className="w-full text-center text-xs font-bold text-[#08A9E6] hover:underline flex items-center justify-center gap-1"
        >
          <span>View All System Diagnostic Logs</span>
          <FiArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

export default RecentAlertsCard;
