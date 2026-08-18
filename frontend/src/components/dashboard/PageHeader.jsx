import { useState, useEffect } from "react";
import { FiRefreshCw, FiDownload, FiRadio } from "react-icons/fi";

function PageHeader({ onRefresh, onExport }) {
  const [lastUpdated, setLastUpdated] = useState("Just now");

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated("Just now");
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLastUpdated("Just now");
    if (onRefresh) onRefresh();
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-slate-100 tracking-tight">
            Fleet Overview
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <FiRadio className="animate-pulse" size={12} />
            Live
          </span>
        </div>
        <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium mt-1">
          Real-time health, telemetry and predictive maintenance status across your compressor fleet.
        </p>
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto">
        <span className="text-xs text-slate-400 font-medium hidden lg:inline">
          Last updated: {lastUpdated}
        </span>

        <button onClick={onExport} className="btn-secondary flex items-center gap-2 text-xs">
          <FiDownload size={14} />
          Export Report
        </button>

        <button onClick={handleRefresh} className="btn-primary flex items-center gap-2 text-xs shadow-sm">
          <FiRefreshCw size={14} />
          Refresh Data
        </button>
      </div>
    </div>
  );
}

export default PageHeader;
