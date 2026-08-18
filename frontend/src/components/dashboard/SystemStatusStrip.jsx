import { useState, useEffect } from "react";
import { FiCheckCircle, FiDatabase, FiServer, FiRadio, FiCpu } from "react-icons/fi";

function SystemStatusStrip() {
  const [syncTime, setSyncTime] = useState("");

  useEffect(() => {
    const updateTime = () => setSyncTime(new Date().toLocaleTimeString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
      <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>System Operational</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] font-medium">
        <div className="flex items-center gap-1.5">
          <FiServer className="text-slate-400" size={13} />
          <span>API:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Operational</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FiDatabase className="text-slate-400" size={13} />
          <span>Database:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Operational</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FiRadio className="text-slate-400" size={13} />
          <span>Telemetry:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Connected</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FiCpu className="text-slate-400" size={13} />
          <span>AI Model:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Connected</span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-400">
        Last Sync: <span className="font-bold text-[#172033] dark:text-slate-200">{syncTime}</span>
      </div>
    </div>
  );
}

export default SystemStatusStrip;
