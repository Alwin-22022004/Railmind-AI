import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiArrowRight } from "react-icons/fi";

const MOCK_ALERTS = [
  {
    id: 1,
    level: "CRITICAL",
    title: "High vibration detected",
    asset: "COMP-004",
    time: "2 minutes ago",
  },
  {
    id: 2,
    level: "WARNING",
    title: "Pressure deviation detected",
    asset: "COMP-002",
    time: "15 minutes ago",
  },
  {
    id: 3,
    level: "INFO",
    title: "Maintenance interval approaching",
    asset: "COMP-001",
    time: "1 hour ago",
  },
];

function RecentAlertsCard() {
  const navigate = useNavigate();

  return (
    <div className="industrial-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-sm font-extrabold text-[#172033] dark:text-slate-100">
            Recent System Alerts
          </h4>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Real-Time Events
          </span>
        </div>

        <div className="py-3 space-y-2.5">
          {MOCK_ALERTS.map((alert) => {
            let bgClass = "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300";
            let badgeClass = "bg-slate-200 text-slate-700";
            let Icon = FiInfo;

            if (alert.level === "CRITICAL") {
              bgClass = "bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/30 dark:border-rose-800/40";
              badgeClass = "bg-rose-600 text-white";
              Icon = FiAlertTriangle;
            } else if (alert.level === "WARNING") {
              bgClass = "bg-amber-500/10 border-amber-500/20 dark:bg-amber-950/30 dark:border-amber-800/40";
              badgeClass = "bg-amber-500 text-white";
              Icon = FiAlertCircle;
            }

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs transition-colors ${bgClass}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[9px] font-black rounded uppercase ${badgeClass}`}>
                        {alert.level}
                      </span>
                      <span className="font-mono font-bold text-[#172033] dark:text-slate-100">
                        {alert.asset}
                      </span>
                    </div>
                    <p className="font-semibold text-[#172033] dark:text-slate-200 mt-1 leading-snug">
                      {alert.title}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 shrink-0 font-medium">{alert.time}</span>
              </div>
            );
          })}
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
