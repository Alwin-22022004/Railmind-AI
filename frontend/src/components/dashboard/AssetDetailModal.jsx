import { useNavigate } from "react-router-dom";
import { FiX, FiActivity, FiCpu, FiTrendingUp, FiCheckCircle } from "react-icons/fi";
import StatusBadge from "../telemetry/StatusBadge";

function AssetDetailModal({ asset, onClose }) {
  const navigate = useNavigate();

  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#08A9E6]/10 text-[#08A9E6] border border-[#08A9E6]/20 flex items-center justify-center font-mono font-black text-sm">
              {asset.id}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#172033] dark:text-slate-100">
                Compressor Diagnostic Specs
              </h2>
              <p className="text-xs text-slate-400">
                Real-time operational metrics for {asset.name || asset.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Status & Health Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Health Status
            </span>
            <StatusBadge status={asset.healthStatus} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Composite Health
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-tabular">
              {asset.healthScore}%
            </span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Air Pressure</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.airPressure ?? "—"} <span className="text-xs font-normal text-slate-400">bar</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Airflow Rate</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.airflowRate ?? "—"} <span className="text-xs font-normal text-slate-400">L/min</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Vibration RMS</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.vibration ?? "—"} <span className="text-xs font-normal text-slate-400">mm/s</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Motor Current</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.motorCurrent ?? "—"} <span className="text-xs font-normal text-slate-400">A</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Motor Voltage</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.motorVoltage ?? "—"} <span className="text-xs font-normal text-slate-400">V</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Motor Temp</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.motorTemperature ?? "—"} <span className="text-xs font-normal text-slate-400">°C</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Shaft Speed</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.compressorSpeed ?? "—"} <span className="text-xs font-normal text-slate-400">RPM</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Oil Pressure</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.oilPressure ?? "—"} <span className="text-xs font-normal text-slate-400">bar</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-slate-400 block font-medium">Oil Temp</span>
            <span className="text-base font-bold font-tabular text-[#172033] dark:text-slate-100">
              {asset.oilTemperature ?? "—"} <span className="text-xs font-normal text-slate-400">°C</span>
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-between pt-2">
          <span>Last Received Reading:</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {asset.recordedAt ? new Date(asset.recordedAt).toLocaleTimeString() : "Just now"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              onClose();
              navigate("/analytics");
            }}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <FiTrendingUp size={14} />
            View Analytics
          </button>

          <button
            onClick={() => {
              onClose();
              navigate("/compressors");
            }}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <FiActivity size={14} />
            View Telemetry
          </button>

          <button
            onClick={() => {
              onClose();
              navigate("/prediction");
            }}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            <FiCpu size={14} />
            View Predictions
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssetDetailModal;
