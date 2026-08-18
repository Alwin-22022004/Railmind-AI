import { useEffect, useState } from "react";
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import TelemetryGrid from "../../components/telemetry/TelemetryGrid";
import FleetTable from "../../components/telemetry/FleetTable";
import TelemetryStatusBanner from "../../components/telemetry/TelemetryStatusBanner";
import { useLatestTelemetry } from "../../hooks/useTelemetry";
import { getAlerts } from "../../services/alertService";

function Dashboard() {
  const { assets, loading, loadError } = useLatestTelemetry();
  const [alerts, setAlerts] = useState([]);
  const [alertError, setAlertError] = useState(null);
  useEffect(() => { getAlerts().then((r) => setAlerts(r.data || [])).catch((e) => setAlertError(e.response?.data?.message || "Failed to load alerts")); }, []);
  const featured = assets[0] || null;
  const healthy = assets.filter((a) => ["HEALTHY", "GOOD"].includes(a.healthStatus)).length;
  const attention = assets.filter((a) => ["WARNING", "CRITICAL", "MAINTENANCE_REQUIRED"].includes(a.healthStatus)).length;
  return (
    <DashboardLayout>
      <div className="mb-6"><span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Operations Control</span><h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">Operator Dashboard</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Monitor live compressor operation and respond to active operating alerts.</p></div>
      <TelemetryStatusBanner loadError={loadError} loading={loading} isEmpty={!loading && assets.length === 0} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <StatCard title="Compressors Online" value={assets.length} color="text-cyan-600 dark:text-cyan-400" icon={FiActivity}/>
        <StatCard title="Healthy" value={healthy} color="text-emerald-600 dark:text-emerald-400" icon={FiCheckCircle}/>
        <StatCard title="Needs Attention" value={attention} color="text-amber-500" icon={FiAlertTriangle}/>
        <StatCard title="Open Alerts" value={alerts.filter(a=>!a.is_resolved).length} color="text-rose-600 dark:text-rose-400" icon={FiClock}/>
      </div>
      {featured && <div className="mb-8"><h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Live Telemetry — {featured.id}</h3><TelemetryGrid asset={featured}/></div>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"><h3 className="font-bold text-slate-900 dark:text-white mb-4">Fleet Status</h3><FleetTable assets={assets}/></div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"><h3 className="font-bold text-slate-900 dark:text-white mb-4">Operational Alerts</h3>{alertError && <p className="text-sm text-red-500">{alertError}</p>}{!alertError && alerts.slice(0,6).map(a=><div key={a.id} className="border-t border-slate-100 dark:border-slate-700 py-3 first:border-0 first:pt-0"><div className="flex justify-between gap-3"><span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{a.title}</span><span className={`text-[10px] font-bold uppercase ${a.level==='critical'?'text-red-500':'text-amber-500'}`}>{a.level}</span></div><p className="text-xs text-slate-500 mt-1">{a.asset_code} · {new Date(a.created_at).toLocaleTimeString()}</p></div>)}{!alerts.length && <p className="text-sm text-slate-400">No alerts.</p>}</div>
      </div>
    </DashboardLayout>
  );
}
export default Dashboard;
