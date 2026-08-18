import { useEffect, useState } from "react";
import { FiCpu, FiList, FiPlus, FiCheckCircle, FiPower } from "react-icons/fi";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import FleetTable from "../../components/telemetry/FleetTable";
import TelemetryGrid from "../../components/telemetry/TelemetryGrid";
import TrendChart from "../../components/telemetry/TrendChart";
import TelemetryStatusBanner from "../../components/telemetry/TelemetryStatusBanner";
import { useLatestTelemetry, useTelemetryHistory } from "../../hooks/useTelemetry";
import { createAsset, updateAsset } from "../../services/assetService";
import { useAuth } from "../../context/AuthContext";

const COMPRESSOR_ID_PATTERN = /^COMP-[0-9]{3,}$/;

function Compressors() {
  const { assets, loading, loadError } = useLatestTelemetry();
  const { hasPermission, user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ assetCode: "", zone: "", startImmediately: true });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const history = useTelemetryHistory(selectedId, 40);

  const canManageAssets = user?.role === "ADMIN" && hasPermission("assets.manage");

  useEffect(() => {
    if (!selectedId && assets[0]) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  const selectedAsset = assets.find((a) => a.id === selectedId) || null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const assetCode = form.assetCode.trim().toUpperCase();
    if (!COMPRESSOR_ID_PATTERN.test(assetCode) || assetCode === "COMP-000") {
      setCreateError("Use a valid compressor ID such as COMP-009. The ID must be unique.");
      return;
    }

    setCreating(true);
    try {
      const response = await createAsset({
        assetCode,
        name: `Railway Air Compressor ${assetCode}`,
        zone: form.zone.trim() || null,
        status: form.startImmediately ? "Active" : "Idle",
      });
      setCreateSuccess(
        form.startImmediately
          ? `${assetCode} created and activated. The simulator will pick it up on its next synchronization.`
          : `${assetCode} created in Idle state. Activate it when you want simulation to begin.`
      );
      setForm({ assetCode: "", zone: "", startImmediately: true });
      if (response?.data?.asset_code) setSelectedId(response.data.asset_code);
    } catch (error) {
      setCreateError(error.response?.data?.message || "Could not create compressor.");
    } finally {
      setCreating(false);
    }
  };


  const handleStatusChange = async () => {
    if (!canManageAssets || !selectedAsset) return;
    const nextStatus = selectedAsset.registeredStatus === "Active" ? "Idle" : "Active";
    try {
      await updateAsset(selectedAsset.assetDbId, { status: nextStatus });
      setCreateError("");
      setCreateSuccess(`${selectedAsset.id} is now ${nextStatus}. ${nextStatus === "Active" ? "The simulator will include it on the next tick." : "Simulation will stop for this compressor after the next synchronization."}`);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setCreateError(error.response?.data?.message || "Could not update compressor status.");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Compressors</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Every registered railway air compressor. Active compressors are automatically included in the simulator and telemetry pipeline.
        </p>
      </div>

      {canManageAssets && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FiPlus className="text-cyan-500" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Add Compressor</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter a unique ID such as COMP-009. Active compressors are simulated automatically.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Compressor ID</span>
              <input
                value={form.assetCode}
                onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value.toUpperCase() }))}
                placeholder="COMP-009"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                required
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Zone (optional)</span>
              <input
                value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                placeholder="Coach A3 / Loco Shed"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              />
            </label>
            <button disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold px-5 py-3">
              {creating ? "Creating…" : "Create Compressor"}
            </button>
          </form>

          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.startImmediately}
              onChange={(e) => setForm((f) => ({ ...f, startImmediately: e.target.checked }))}
              className="accent-cyan-500"
            />
            Activate immediately and include it in simulation
          </label>

          {createError && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{createError}</div>}
          {createSuccess && <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm"><FiCheckCircle />{createSuccess}</div>}
        </div>
      )}

      <TelemetryStatusBanner loadError={loadError} loading={loading} isEmpty={!loading && assets.length === 0} />

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-black/20 p-6 mb-8 transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <FiList className="text-cyan-600 dark:text-cyan-400" size={18} />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Registered Compressors</h3>
        </div>
        <FleetTable assets={assets} selectedId={selectedId} onSelect={setSelectedId} full />
      </div>

      {selectedAsset && (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Live Readings — {selectedAsset.id}
            </h3>
            {canManageAssets && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleStatusChange}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <FiPower />
                  {selectedAsset?.registeredStatus === "Active" ? "Pause Simulation" : "Activate Simulation"}
                </button>
                <span className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300">
                  DB status: {selectedAsset?.registeredStatus || "Unknown"}
                </span>
              </div>
            )}
            {!selectedAsset.hasTelemetry && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">
                Compressor is registered but has not sent telemetry yet. If it is Active, the simulator will begin sending readings shortly.
              </div>
            )}
            <TelemetryGrid asset={selectedAsset} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-black/20 p-6 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <FiCpu className="text-cyan-600 dark:text-cyan-400" size={18} />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Trend</h3>
            </div>
            <TrendChart
              history={history}
              metrics={[
                { key: "airPressure", name: "Air Pressure (bar)", color: "#0891b2", axis: "left" },
                { key: "compressorSpeed", name: "Speed (RPM)", color: "#8b5cf6", axis: "right" },
                { key: "motorTemperature", name: "Motor Temp (°C)", color: "#ef4444", axis: "left" },
              ]}
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default Compressors;
