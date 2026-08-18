import { useState, useMemo } from "react";
import StatusBadge from "./StatusBadge";
import { TELEMETRY_FIELDS } from "../../utils/telemetryUtils";
import { FiSearch, FiDownload, FiFilter, FiRefreshCw } from "react-icons/fi";

function FleetTable({ assets, selectedId, onSelect, onRowClick, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const columns = TELEMETRY_FIELDS;

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.name && a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.zone && a.zone.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (a.healthStatus && a.healthStatus.toUpperCase() === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (filteredAssets.length === 0) return;

    const headers = [
      "Asset ID",
      "Status",
      "Health %",
      ...columns.map((c) => `${c.label} (${c.unit})`),
      "Last Updated",
    ];

    const rows = filteredAssets.map((a) => [
      a.id,
      a.healthStatus || "Unknown",
      a.healthScore ?? "",
      ...columns.map((c) => a[c.key] ?? ""),
      a.recordedAt ? new Date(a.recordedAt).toISOString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `railmind_live_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (asset) => {
    if (onSelect) onSelect(asset.id);
    if (onRowClick) onRowClick(asset);
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-sm font-semibold text-[#172033] dark:text-slate-200">
          No compressors registered
        </p>
        <p className="text-xs mt-1">
          Add your first compressor to begin monitoring fleet health.
        </p>
      </div>
    );
  }

  return (
    <div className="industrial-card space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-extrabold text-[#172033] dark:text-slate-100">
            Live Compressor Telemetry
          </h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium mt-0.5">
            Real-time operating conditions across the registered fleet.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08A9E6] w-36 sm:w-44"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08A9E6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="HEALTHY">HEALTHY</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {onRefresh && (
            <button onClick={onRefresh} className="btn-secondary text-xs px-2.5 py-1.5">
              <FiRefreshCw size={14} />
            </button>
          )}

          <button onClick={handleExportCSV} className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
            <FiDownload size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3">Asset</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-center">Health</th>
              <th className="py-3 px-3">Pressure (bar)</th>
              <th className="py-3 px-3">Airflow (L/min)</th>
              <th className="py-3 px-3">Vibration (mm/s)</th>
              <th className="py-3 px-3">Motor Curr (A)</th>
              <th className="py-3 px-3">Motor Volt (V)</th>
              <th className="py-3 px-3">Motor Temp (°C)</th>
              <th className="py-3 px-3">RPM</th>
              <th className="py-3 px-3 text-right">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                  No compressors match your search filters.
                </td>
              </tr>
            ) : (
              filteredAssets.map((a) => {
                const isSelected = a.id === selectedId;

                let healthColor = "text-emerald-600 dark:text-emerald-400";
                if (a.healthScore < 60) healthColor = "text-rose-600 dark:text-rose-400";
                else if (a.healthScore < 90) healthColor = "text-amber-600 dark:text-amber-400";

                return (
                  <tr
                    key={a.id}
                    onClick={() => handleRowClick(a)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-[#08A9E6]/10 dark:bg-[#08A9E6]/20 font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-[#08A9E6]">
                      {a.id}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={a.healthStatus} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-black font-tabular ${healthColor}`}>
                        {a.healthScore ?? "—"}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.airPressure ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.airflowRate ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.vibration ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.motorCurrent ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.motorVoltage ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.motorTemperature ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-tabular text-[#172033] dark:text-slate-200">
                      {a.compressorSpeed ?? "—"}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 font-tabular">
                      {a.recordedAt ? new Date(a.recordedAt).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FleetTable;
