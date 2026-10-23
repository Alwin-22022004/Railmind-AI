import { useEffect, useState, useCallback } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiUserCheck,
  FiUserPlus,
  FiFilter,
  FiTool,
  FiClock,
  FiCornerDownRight,
  FiX,
  FiRefreshCw
} from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAlerts,
  acknowledgeAlert,
  assignAlert,
  resolveAlert
} from "../../services/alertService";
import { getMaintenanceEngineers } from "../../services/userService";

function Alerts() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("alerts.manage") || ["ADMIN", "MAINTENANCE"].includes(user?.role);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);
  const [fetchError, setFetchError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [assetFilter, setAssetFilter] = useState("");

  const hasActiveFilters = statusFilter !== "ALL" || severityFilter !== "ALL" || Boolean(assetFilter.trim());

  // Modals & Active state
  const [assigningAlertId, setAssigningAlertId] = useState(null);
  const [selectedEngineerId, setSelectedEngineerId] = useState("");
  const [resolvingAlertId, setResolvingAlertId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const filters = {};
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (severityFilter !== "ALL") filters.severity = severityFilter;
      if (assetFilter.trim()) filters.assetCode = assetFilter.trim();

      const res = await getAlerts(filters);
      setAlerts(res.data || []);
      setFetchError("");
    } catch (e) {
      console.error("Error loading alerts:", e);
      const msg = e.response?.data?.message || e.message || "Failed to load alerts from server.";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, assetFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (canManage) {
      getMaintenanceEngineers()
        .then((res) => setEngineers(res.data || []))
        .catch(() => {});
    }
  }, [canManage]);

  async function handleAcknowledge(id) {
    setActionError("");
    try {
      await acknowledgeAlert(id);
      await loadData();
    } catch (e) {
      setActionError(e.response?.data?.message || "Failed to acknowledge alert");
    }
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    if (!assigningAlertId || !selectedEngineerId) return;
    setActionError("");
    try {
      await assignAlert(assigningAlertId, selectedEngineerId);
      setAssigningAlertId(null);
      setSelectedEngineerId("");
      await loadData();
    } catch (e) {
      setActionError(e.response?.data?.message || "Failed to assign alert");
    }
  }

  async function handleResolveSubmit(e) {
    e.preventDefault();
    if (!resolvingAlertId) return;
    setActionError("");
    try {
      await resolveAlert(resolvingAlertId, resolutionNotes);
      setResolvingAlertId(null);
      setResolutionNotes("");
      await loadData();
    } catch (e) {
      setActionError(e.response?.data?.message || "Failed to resolve alert");
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">
            Predictive Maintenance Workflow
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            System Alerts & Diagnostics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Rule-based threshold alerts, deterministic recommendations, and engineer assignment.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filter By:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 text-xs font-bold">
              {["ALL", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === st
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <label htmlFor="alert-severity-filter-select" className="sr-only">Filter by severity</label>
            <select
              id="alert-severity-filter-select"
              name="severityFilter"
              aria-label="Filter by severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>

            {/* Asset Filter */}
            <label htmlFor="alert-asset-filter-input" className="sr-only">Search asset by code</label>
            <input
              id="alert-asset-filter-input"
              name="assetFilter"
              aria-label="Search asset by code"
              type="text"
              placeholder="Search Asset (e.g. COMP-001)"
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError("")}>
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Fetch Error Banner with Retry */}
      {fetchError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="shrink-0 text-rose-500" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Failed to load alerts</p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
          >
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Alerts List */}
      {loading && !alerts.length && !fetchError ? (
        <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <FiRefreshCw className="mx-auto text-cyan-500 animate-spin mb-3" size={28} />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading alerts workflow…</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving system diagnostics and fleet telemetry alerts</p>
        </div>
      ) : fetchError && !alerts.length ? null : (
        <div className="space-y-4">
          {alerts.map((a) => {
            const isCritical = a.level === "critical";
            const isAcknowledged = a.is_acknowledged;
            const isResolved = a.is_resolved;

            return (
              <div
                key={a.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-all shadow-sm ${
                  isResolved
                    ? "border-slate-200 dark:border-slate-700 opacity-75"
                    : isCritical
                    ? "border-red-500/40 bg-red-500/[0.02]"
                    : "border-amber-500/40 bg-amber-500/[0.02]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Column: Icon & Content */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isResolved
                          ? "bg-emerald-500/10 text-emerald-500"
                          : isCritical
                          ? "bg-red-500/10 text-red-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {isResolved ? (
                        <FiCheckCircle size={22} />
                      ) : (
                        <FiAlertTriangle size={22} />
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {a.title}
                        </h3>

                        {/* Severity Badge */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
                            isCritical
                              ? "bg-red-500 text-white"
                              : "bg-amber-500 text-slate-950"
                          }`}
                        >
                          {a.level}
                        </span>

                        {/* Status Badge */}
                        {isResolved ? (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            RESOLVED
                          </span>
                        ) : isAcknowledged ? (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider bg-sky-500/10 text-sky-500 border border-sky-500/20">
                            ACKNOWLEDGED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                            ACTIVE
                          </span>
                        )}

                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                          {a.asset_code} ({a.asset_name || "Compressor"})
                        </span>
                      </div>

                      {/* Message & Measured Sensor Values */}
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {a.message}
                      </p>

                      {/* Sensor detail strip if present */}
                      {(a.trigger_parameter || (a.actual_value !== null && a.actual_value !== undefined && a.actual_value !== "")) && (
                        <div className="inline-flex flex-wrap items-center gap-3 text-xs font-mono bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          {a.trigger_parameter && (
                            <span>
                              Parameter: <strong className="text-slate-800 dark:text-slate-200">{a.trigger_parameter}</strong>
                            </span>
                          )}
                          {a.trigger_parameter && (a.actual_value !== null && a.actual_value !== undefined && a.actual_value !== "") && <span>·</span>}
                          {(a.actual_value !== null && a.actual_value !== undefined && a.actual_value !== "") && (
                            <span>
                              Sensor Value: <strong className="text-slate-800 dark:text-slate-200">{a.actual_value}</strong>
                            </span>
                          )}
                          {(a.threshold_value !== null && a.threshold_value !== undefined && a.threshold_value !== "") && (
                            <>
                              <span>·</span>
                              <span>
                                Threshold: <strong className="text-slate-800 dark:text-slate-200">{a.threshold_value}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Recommendation alert box */}
                      {a.recommendation && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <FiTool className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <span className="font-bold text-amber-700 dark:text-amber-300">
                              Rule-Based Recommendation:
                            </span>{" "}
                            {a.recommendation}
                          </div>
                        </div>
                      )}

                      {/* Metadata Row: Timestamps & Assignment */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <FiClock size={12} /> Created: {new Date(a.created_at).toLocaleString()}
                        </span>

                        {a.assigned_engineer_name ? (
                          <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                            <FiUserCheck size={12} /> Assigned: {a.assigned_engineer_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}

                        {isAcknowledged && (
                          <span className="text-sky-500 font-medium">
                            Acknowledged by {a.acknowledged_by_name || "Engineer"}
                          </span>
                        )}

                        {isResolved && (
                          <span className="text-emerald-500 font-medium">
                            Resolved by {a.resolved_by_name || (a.source === "rule" ? "System (Auto-Recovery)" : "Engineer")}
                          </span>
                        )}
                      </div>

                      {/* Resolution Notes display if resolved */}
                      {isResolved && a.resolution_notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                          <FiCornerDownRight className="mt-0.5 shrink-0 text-emerald-500" />
                          <div>
                            <strong className="text-slate-700 dark:text-slate-300">Resolution Notes:</strong>{" "}
                            {a.resolution_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions (RBAC guarded) */}
                  {canManage && !isResolved && (
                    <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                      {/* Acknowledge Button */}
                      {!isAcknowledged && (
                        <button
                          onClick={() => handleAcknowledge(a.id)}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <FiUserCheck size={14} />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {/* Assign Engineer Button */}
                      <button
                        onClick={() => {
                          setAssigningAlertId(a.id);
                          setSelectedEngineerId(a.assigned_to || "");
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FiUserPlus size={14} />
                        <span>{a.assigned_to ? "Reassign" : "Assign"}</span>
                      </button>

                      {/* Resolve Button */}
                      <button
                        onClick={() => {
                          setResolvingAlertId(a.id);
                          setResolutionNotes("");
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <FiCheckCircle size={14} />
                        <span>Resolve</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!alerts.length && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <FiCheckCircle size={36} className="mx-auto text-emerald-500 mb-2" />
              {hasActiveFilters ? (
                <>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No alerts match the selected filters.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting or clearing your status, severity, or compressor filters.
                  </p>
                  <button
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSeverityFilter("ALL");
                      setAssetFilter("");
                    }}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No alerts recorded across the fleet.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    All railway air compressor units are operating within normal configured thresholds.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Assign Engineer */}
      {assigningAlertId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FiUserPlus className="text-cyan-500" /> Assign Maintenance Engineer
              </h3>
              <button onClick={() => setAssigningAlertId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label htmlFor="alert-assign-engineer-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Engineer / User:
                </label>
                <select
                  id="alert-assign-engineer-select"
                  name="selectedEngineerId"
                  value={selectedEngineerId}
                  onChange={(e) => setSelectedEngineerId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose active engineer --</option>
                  {engineers.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.role}) - {e.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningAlertId(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEngineerId}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black disabled:opacity-50"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Alert with Notes */}
      {resolvingAlertId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FiCheckCircle className="text-emerald-500" /> Resolve Alert
              </h3>
              <button onClick={() => setResolvingAlertId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label htmlFor="alert-resolution-notes-textarea" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Resolution Notes & Actions Taken:
                </label>
                <textarea
                  id="alert-resolution-notes-textarea"
                  name="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Replaced oil filter, inspected bearings, reset operating pressure."
                  rows="4"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlertId(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black"
                >
                  Mark Alert Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Alerts;
