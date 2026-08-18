import { useEffect, useState } from "react";
import { FiTrendingUp } from "react-icons/fi";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import TrendChart from "../../components/telemetry/TrendChart";
import TelemetryStatusBanner from "../../components/telemetry/TelemetryStatusBanner";
import { useLatestTelemetry, useTelemetryHistory } from "../../hooks/useTelemetry";

const CHART_GROUPS = [
  {
    title: "Pressure & Airflow",
    metrics: [
      { key: "airPressure", name: "Air Pressure (bar)", color: "#0891b2", axis: "left" },
      { key: "airflowRate", name: "Airflow (L/min)", color: "#22c55e", axis: "right" },
      { key: "oilPressure", name: "Oil Pressure (bar)", color: "#8b5cf6", axis: "left" },
    ],
  },
  {
    title: "Electrical",
    metrics: [
      { key: "motorCurrent", name: "Motor Current (A)", color: "#f59e0b", axis: "left" },
      { key: "compressorSpeed", name: "Speed (RPM)", color: "#0891b2", axis: "right" },
    ],
  },
  {
    title: "Thermal & Vibration",
    metrics: [
      { key: "motorTemperature", name: "Motor Temp (°C)", color: "#ef4444", axis: "left" },
      { key: "oilTemperature", name: "Oil Temp (°C)", color: "#f97316", axis: "left" },
      { key: "vibration", name: "Vibration (mm/s)", color: "#8b5cf6", axis: "right" },
    ],
  },
];

function Analytics() {
  const { assets, loading, loadError } = useLatestTelemetry();
  const [selectedId, setSelectedId] = useState(null);
  const history = useTelemetryHistory(selectedId, 60);

  useEffect(() => {
    if (!selectedId && assets[0]) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Analytics</h2>

        {assets.length > 0 && (
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-sm rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Historical trend lines across the last 60 readings for the selected compressor.
      </p>

      <TelemetryStatusBanner loadError={loadError} loading={loading} isEmpty={!loading && assets.length === 0} />

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
        {CHART_GROUPS.map((group) => (
          <div
            key={group.title}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-black/20 p-6 transition-colors"
          >
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-cyan-600 dark:text-cyan-400" size={18} />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{group.title}</h3>
            </div>
            <TrendChart history={history} metrics={group.metrics} />
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default Analytics;
