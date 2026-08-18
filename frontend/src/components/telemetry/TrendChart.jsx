import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TIME_RANGES = ["1H", "6H", "24H", "7D", "30D"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs space-y-1">
        <p className="font-bold border-b border-slate-700 pb-1 text-slate-300">
          Timestamp: {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <span style={{ color: entry.color }} className="font-semibold">
              {entry.name}:
            </span>
            <span className="font-mono font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function TrendChart({ history = [], selectedId = "COMP-001", height = 300 }) {
  const [timeRange, setTimeRange] = useState("1H");
  const [selectedParam, setSelectedParam] = useState("ALL");

  if (!history || history.length === 0) {
    return (
      <div className="industrial-card text-center py-12 text-slate-400">
        <p className="text-sm font-semibold">Waiting for telemetry history...</p>
        <p className="text-xs mt-1">Make sure the simulation engine is running.</p>
      </div>
    );
  }

  const allMetrics = [
    { key: "airPressure", name: "Air Pressure (bar)", color: "#08A9E6", axis: "left" },
    { key: "vibration", name: "Vibration (mm/s)", color: "#F59E0B", axis: "left" },
    { key: "motorTemperature", name: "Motor Temp (°C)", color: "#DC2626", axis: "right" },
    { key: "motorCurrent", name: "Motor Current (A)", color: "#16A34A", axis: "left" },
  ];

  const visibleMetrics =
    selectedParam === "ALL"
      ? allMetrics
      : allMetrics.filter((m) => m.key.toLowerCase().includes(selectedParam.toLowerCase()));

  return (
    <div className="industrial-card space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#172033] dark:text-slate-100">
              Compressor Performance Trend
            </h3>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#08A9E6]/10 text-[#08A9E6]">
              {selectedId || "COMP-001"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Healthy
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium mt-0.5">
            Real-time parameter correlation over time.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  timeRange === r
                    ? "bg-[#08A9E6] text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Parameter Dropdown */}
          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Parameters</option>
            <option value="airPressure">Pressure</option>
            <option value="motorTemperature">Temperature</option>
            <option value="vibration">Vibration</option>
            <option value="motorCurrent">Current</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#64748B" }}
            minTickGap={30}
            axisLine={{ stroke: "#CBD5E1" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#64748B" }}
            axisLine={{ stroke: "#CBD5E1" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#64748B" }}
            axisLine={{ stroke: "#CBD5E1" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

          {visibleMetrics.map((m) => (
            <Line
              key={m.key}
              yAxisId={m.axis || "left"}
              type="monotone"
              dataKey={m.key}
              name={m.name}
              stroke={m.color}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;
