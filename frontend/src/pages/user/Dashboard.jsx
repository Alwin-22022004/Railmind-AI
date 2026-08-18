import { FiActivity, FiCpu, FiShield, FiTarget, FiTool, FiTrendingUp } from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";

const steps = [
  [FiCpu, "Telemetry Collection", "The compressor simulator continuously produces operational readings such as pressure, temperature, vibration, current, voltage and RPM."],
  [FiActivity, "Condition Monitoring", "RailMind AI organizes telemetry into a single operational view so teams can understand the compressor's current condition."],
  [FiTrendingUp, "Analytics", "Historical trends reveal changes in operating behavior and help maintenance teams identify abnormal patterns early."],
  [FiTool, "Predictive Maintenance", "The platform is designed to support early maintenance decisions before a major compressor failure occurs."],
];

function Dashboard() {
  return (
    <DashboardLayout>
      <section className="space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Railway Intelligence</span>
          <h2 className="text-4xl font-black mt-2 text-slate-900 dark:text-white">What is RailMind AI?</h2>
          <p className="mt-3 max-w-4xl text-slate-600 dark:text-slate-300 leading-7">
            RailMind AI is a railway air-compressor monitoring platform designed to turn machine telemetry into clear operational information and, in later phases, predictive maintenance intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map(([Icon, title, text]) => (
            <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4"><Icon size={20}/></div>
              <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-6">{text}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-slate-900 rounded-2xl p-6 text-white">
            <FiShield className="text-cyan-400 mb-4" size={22}/>
            <h3 className="font-bold">Why it matters</h3>
            <p className="text-sm text-slate-300 mt-2 leading-6">Unexpected compressor problems can affect critical railway pneumatic systems. RailMind AI is designed to make machine condition easier to understand before maintenance action is required.</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <FiTarget className="text-emerald-500 mb-4" size={22}/>
            <h3 className="font-bold text-slate-900 dark:text-white">Project Purpose</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-6">Create a cost-effective digital environment where compressor behavior can be simulated, monitored, analyzed and eventually connected to AI-based predictive maintenance.</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <FiTool className="text-amber-500 mb-4" size={22}/>
            <h3 className="font-bold text-slate-900 dark:text-white">Your Access</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-6">This account is read-only. Operational controls, maintenance actions and administration are available only to authorized roles.</p>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
export default Dashboard;
