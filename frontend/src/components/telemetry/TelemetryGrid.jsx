import {
  FiThermometer,
  FiWind,
  FiActivity,
  FiZap,
  FiDroplet,
  FiClock,
  FiBarChart2,
} from "react-icons/fi";
import { TELEMETRY_FIELDS } from "../../utils/telemetryUtils";

const ICONS = {
  airPressure: FiBarChart2,
  airflowRate: FiWind,
  vibration: FiActivity,
  motorCurrent: FiZap,
  motorVoltage: FiZap,
  motorTemperature: FiThermometer,
  compressorSpeed: FiActivity,
  oilPressure: FiDroplet,
  oilTemperature: FiThermometer,
  runningHours: FiClock,
  compressorLoad: FiBarChart2,
  ambientTemperature: FiThermometer,
};

function TelemetryGrid({ asset }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {TELEMETRY_FIELDS.map(({ key, label, unit }) => {
        const Icon = ICONS[key];
        return (
          <div
            key={key}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-black/20 p-4 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className="text-cyan-600 dark:text-cyan-400" size={18} />
              {asset && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {asset && asset[key] !== null && asset[key] !== undefined ? asset[key] : "—"}
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">
                {unit}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default TelemetryGrid;
