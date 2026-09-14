import { useCallback, useEffect, useState } from "react";
import {
  FiClipboard,
  FiTool,
  FiAlertTriangle,
  FiUserCheck,
  FiPlusCircle,
  FiClock
} from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import FleetTable from "../../components/telemetry/FleetTable";
import TelemetryStatusBanner from "../../components/telemetry/TelemetryStatusBanner";
import { useLatestTelemetry } from "../../hooks/useTelemetry";
import {
  getMaintenanceLogs,
  createMaintenanceLog
} from "../../services/maintenanceService";
import {
  getAlerts,
  acknowledgeAlert
} from "../../services/alertService";

function Dashboard() {
  const { assets, loading, loadError } = useLatestTelemetry();

  const [logs, setLogs] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);

  const [form, setForm] = useState({
    assetCode: "",
    alertId: "",
    maintenanceType: "CORRECTIVE",
    action: "",
    notes: "",
    resolveAssociatedAlert: true,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const sorted = [...assets].sort(
    (a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100)
  );
  const critical = assets.filter((a) =>
    ["CRITICAL", "MAINTENANCE_REQUIRED"].includes(a.healthStatus)
  ).length;
  const warning = assets.filter((a) => a.healthStatus === "WARNING").length;

  const refreshData = useCallback(async () => {
    try {
      const logsRes = await getMaintenanceLogs();
      setLogs(logsRes.data || []);

      const alertsRes = await getAlerts({ status: "ACTIVE" });
      setActiveAlerts(alertsRes.data || []);
    } catch (e) {
      console.error("Failed to load maintenance data:", e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMaintenanceLogs()
      .then((logsRes) => {
        if (active) setLogs(logsRes.data || []);
      })
      .catch(() => {});

    getAlerts({ status: "ACTIVE" })
      .then((alertsRes) => {
        if (active) setActiveAlerts(alertsRes.data || []);
      })
      .catch(() => {});

    const interval = setInterval(refreshData, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshData]);

  // When selecting an active alert from dropdown, auto-fill assetCode and suggestion action
  function handleAlertSelect(alertId) {
    if (!alertId) {
      setForm((f) => ({ ...f, alertId: "", action: f.action }));
      return;
    }
    const alertObj = activeAlerts.find((a) => String(a.id) === String(alertId));
    if (alertObj) {
      setForm((f) => ({
        ...f,
        alertId: String(alertObj.id),
        assetCode: alertObj.asset_code,
        action: alertObj.recommendation ? `Perform ${alertObj.recommendation.toLowerCase()}` : f.action,
        maintenanceType: alertObj.level === "critical" ? "CORRECTIVE" : "INSPECTION",
      }));
    }
  }

  async function handleQuickAcknowledge(alertId) {
    try {
      await acknowledgeAlert(alertId);
      await refreshData();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to acknowledge alert");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        assetCode: form.assetCode,
        alertId: form.alertId ? Number(form.alertId) : null,
        maintenanceType: form.maintenanceType,
        action: form.action,
        notes: form.notes,
        resolveAssociatedAlert: form.resolveAssociatedAlert,
      };

      await createMaintenanceLog(payload);
      setMessage("Maintenance record saved successfully.");
      setForm({
        assetCode: "",
        alertId: "",
        maintenanceType: "CORRECTIVE",
        action: "",
        notes: "",
        resolveAssociatedAlert: true,
      });

      await refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save maintenance record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
          Maintenance Operations
        </span>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
          Maintenance Engineer Dashboard
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Prioritize inspections, manage assigned alerts, log work records and track component history.
        </p>
      </div>

      <TelemetryStatusBanner loadError={loadError} loading={loading} isEmpty={!loading && assets.length === 0} />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard title="Immediate Attention" value={critical} color="text-red-600" icon={FiAlertTriangle} />
        <StatCard title="Watch List" value={warning} color="text-amber-500" icon={FiTool} />
        <StatCard title="Active Maintenance Alerts" value={activeAlerts.length} color="text-cyan-600 dark:text-cyan-400" icon={FiClipboard} />
      </div>

      {/* Active Alerts & Pending Maintenance Queue */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FiAlertTriangle className="text-amber-500" /> Active System Diagnostic Alerts ({activeAlerts.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">Auto-refreshed live</span>
        </div>

        {activeAlerts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map((al) => {
              return (
                <div
                  key={al.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    al.level === "critical"
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-amber-500/10 border-amber-500/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                        {al.asset_code}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          al.level === "critical"
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {al.level}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {al.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {al.message}
                    </p>

                    {al.recommendation && (
                      <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 mt-2 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        💡 {al.recommendation}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {al.assigned_engineer_name ? `Assigned: ${al.assigned_engineer_name}` : "Unassigned"}
                    </span>

                    <div className="flex items-center gap-2">
                      {!al.is_acknowledged && (
                        <button
                          onClick={() => handleQuickAcknowledge(al.id)}
                          className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                        >
                          <FiUserCheck size={10} /> Ack
                        </button>
                      )}

                      <button
                        onClick={() => handleAlertSelect(al.id)}
                        className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-[10px] font-black text-slate-950 flex items-center gap-1"
                      >
                        <FiPlusCircle size={10} /> Log Work
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-4 text-center">
            No active un-resolved alerts requiring attention.
          </p>
        )}
      </div>

      {/* Compressor Fleet Priority Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">
          Fleet Health Priority Queue
        </h3>
        <FleetTable assets={sorted} full />
      </div>

      {/* Log Maintenance & History Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form: Log Maintenance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FiTool className="text-cyan-500" /> Log Maintenance Work
          </h3>

          <form onSubmit={submit} className="space-y-4">
            {/* Associated Alert Dropdown */}
            <div>
              <label htmlFor="maint-alert-id-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Link Active Alert (Optional):
              </label>
              <select
                id="maint-alert-id-select"
                name="alertId"
                value={form.alertId}
                onChange={(e) => handleAlertSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white"
              >
                <option value="">-- Routine Maintenance / No Alert --</option>
                {activeAlerts.map((al) => (
                  <option key={al.id} value={al.id}>
                    [{al.asset_code}] {al.title} ({al.level})
                  </option>
                ))}
              </select>
            </div>

            {/* Compressor Selection */}
            <div>
              <label htmlFor="maint-asset-code-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Target Compressor Unit:
              </label>
              <select
                id="maint-asset-code-select"
                name="assetCode"
                value={form.assetCode}
                onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white"
              >
                <option value="">-- Select compressor --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.asset_code}>
                    {a.asset_code} ({a.name || "Air Compressor"})
                  </option>
                ))}
              </select>
            </div>

            {/* Maintenance Type */}
            <div>
              <label htmlFor="maint-type-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Maintenance Type:
              </label>
              <select
                id="maint-type-select"
                name="maintenanceType"
                value={form.maintenanceType}
                onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white"
              >
                <option value="CORRECTIVE">CORRECTIVE (Fix reported fault)</option>
                <option value="PREVENTIVE">PREVENTIVE (Scheduled service)</option>
                <option value="INSPECTION">INSPECTION (Routine check)</option>
              </select>
            </div>

            {/* Action Performed */}
            <div>
              <label htmlFor="maint-action-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Action Performed:
              </label>
              <input
                id="maint-action-input"
                name="action"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                placeholder="e.g. Replaced intake filter and adjusted belt tension"
                required
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="maint-notes-textarea" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Technical Notes & Findings:
              </label>
              <textarea
                id="maint-notes-textarea"
                name="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observed minor wear on coupling. Vibration returned to normal 1.8 mm/s after re-aligning."
                rows="3"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* Resolve Checkbox if Alert Linked */}
            {form.alertId && (
              <label htmlFor="maint-resolve-alert-checkbox" className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  id="maint-resolve-alert-checkbox"
                  name="resolveAssociatedAlert"
                  type="checkbox"
                  checked={form.resolveAssociatedAlert}
                  onChange={(e) => setForm({ ...form, resolveAssociatedAlert: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Automatically mark linked alert as RESOLVED</span>
              </label>
            )}

            <button
              disabled={saving}
              className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saving ? "Saving Record…" : "Save Maintenance Log"}
            </button>

            {message && (
              <p className="text-xs font-bold text-emerald-500 text-center">{message}</p>
            )}
          </form>
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FiClock className="text-slate-400" /> Maintenance History
          </h3>

          <div className="space-y-3">
            {logs.slice(0, 10).map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      {l.asset_code}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {l.maintenance_type || "WORK"}
                    </span>
                    {l.alert_title && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate max-w-[150px]">
                        Linked: {l.alert_title}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(l.performed_at).toLocaleString()}
                  </span>
                </div>

                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {l.action}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Logged by: {l.engineer_name || "Maintenance Staff"}</span>
                </div>

                {l.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
                    {l.notes}
                  </p>
                )}
              </div>
            ))}

            {!logs.length && (
              <p className="text-sm text-slate-400 py-8 text-center">
                No maintenance records logged yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
