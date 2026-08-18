import { useEffect, useState } from "react";
import { FiClipboard, FiTool, FiAlertTriangle } from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import FleetTable from "../../components/telemetry/FleetTable";
import TelemetryStatusBanner from "../../components/telemetry/TelemetryStatusBanner";
import { useLatestTelemetry } from "../../hooks/useTelemetry";
import { getMaintenanceLogs, createMaintenanceLog } from "../../services/maintenanceService";
import { getAlerts } from "../../services/alertService";

function Dashboard() {
  const { assets, loading, loadError } = useLatestTelemetry();
  const [logs, setLogs] = useState([]); const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({assetCode:"",action:"",notes:""}); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  const sorted=[...assets].sort((a,b)=>(a.healthScore??100)-(b.healthScore??100));
  const critical=assets.filter(a=>["CRITICAL","MAINTENANCE_REQUIRED"].includes(a.healthStatus)).length;
  const warning=assets.filter(a=>a.healthStatus==="WARNING").length;
  useEffect(()=>{ getMaintenanceLogs().then(r=>setLogs(r.data||[])).catch(()=>{}); getAlerts().then(r=>setAlerts((r.data||[]).filter(a=>!a.is_resolved))).catch(()=>{}); },[]);
  async function submit(e){e.preventDefault();setSaving(true);setMessage("");try{const r=await createMaintenanceLog(form);setLogs(l=>[r.data,...l]);setForm({assetCode:"",action:"",notes:""});setMessage("Maintenance record saved.");}catch(err){setMessage(err.response?.data?.message||"Failed to save maintenance record");}finally{setSaving(false);}}
  return <DashboardLayout>
    <div className="mb-6"><span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Maintenance Operations</span><h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">Maintenance Engineer Dashboard</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Prioritize inspections, record maintenance work and review machine condition trends.</p></div>
    <TelemetryStatusBanner loadError={loadError} loading={loading} isEmpty={!loading&&assets.length===0}/>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8"><StatCard title="Immediate Attention" value={critical} color="text-red-600" icon={FiAlertTriangle}/><StatCard title="Watch List" value={warning} color="text-amber-500" icon={FiTool}/><StatCard title="Open Alerts" value={alerts.length} color="text-cyan-600 dark:text-cyan-400" icon={FiClipboard}/></div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8"><h3 className="font-bold text-slate-900 dark:text-white mb-4">Maintenance Priority Queue</h3><FleetTable assets={sorted} full/></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"><h3 className="font-bold text-slate-900 dark:text-white mb-4">Log Maintenance</h3><form onSubmit={submit} className="space-y-4"><select value={form.assetCode} onChange={e=>setForm({...form,assetCode:e.target.value})} required className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm"><option value="">Select compressor</option>{assets.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}</select><input value={form.action} onChange={e=>setForm({...form,action:e.target.value})} placeholder="Maintenance action" required className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm"/><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows="4" className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm"/><button disabled={saving} className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 disabled:opacity-60">{saving?"Saving…":"Save Maintenance Record"}</button>{message&&<p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}</form></div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"><h3 className="font-bold text-slate-900 dark:text-white mb-4">Maintenance History</h3>{logs.slice(0,8).map(l=><div key={l.id} className="border-t border-slate-100 dark:border-slate-700 py-3 first:border-0 first:pt-0"><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{l.asset_code} · {l.action}</p><p className="text-xs text-slate-500 mt-1">{l.engineer_name||"Engineer"} · {new Date(l.performed_at).toLocaleString()}</p>{l.notes&&<p className="text-xs text-slate-400 mt-1">{l.notes}</p>}</div>)}{!logs.length&&<p className="text-sm text-slate-400">No maintenance records yet.</p>}</div>
    </div>
  </DashboardLayout>;
}
export default Dashboard;
