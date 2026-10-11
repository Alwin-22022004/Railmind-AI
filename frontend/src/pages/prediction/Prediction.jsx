import { FiCpu, FiCheckCircle, FiAlertCircle, FiBarChart2, FiLayers, FiActivity, FiTag } from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";

function Prediction() {
  const modelMetrics = [
    { label: "Model Architecture", value: "Random Forest Classifier", icon: FiCpu },
    { label: "Task Type", value: "Compressor Fault Classification", icon: FiLayers },
    { label: "Target Feature", value: "faultType", icon: FiTag },
    { label: "Class Count", value: "6 Classes", icon: FiActivity },
    { label: "Offline Accuracy", value: "99.80%", icon: FiCheckCircle, highlight: true },
    { label: "Macro F1-Score", value: "99.45%", icon: FiBarChart2, highlight: true },
  ];

  const faultClasses = [
    { name: "NONE", desc: "Normal operational state (No fault detected)" },
    { name: "AIR_LEAKAGE", desc: "Compressed air leakage in pneumatic delivery lines" },
    { name: "BEARING_FAULT", desc: "Mechanical wear or degradation in main bearings" },
    { name: "FILTER_CLOGGING", desc: "Air/oil filter flow obstruction or particulate buildup" },
    { name: "MOTOR_OVERHEATING", desc: "Elevated motor temperature during high load cycles" },
    { name: "OIL_DEGRADATION", desc: "Reduced oil lubrication efficacy or thermal degradation" },
  ];

  const featureList = [
    "ambientTemperature", "airPressure", "airflowRate", "buildUpTime", "vibration",
    "motorCurrent", "motorVoltage", "motorTemperature", "compressorSpeed",
    "oilPressure", "oilTemperature", "compressorLoad", "startStopCycles"
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Baseline Fault Classifier — Trained
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              TRAINED — OFFLINE PROTOTYPE
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Offline prototype. Live prediction integration is not connected yet.
          </p>
        </div>
      </div>

      {/* Banner / Status Alert */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-sm mb-6 flex items-start gap-3">
        <FiAlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-200">
            Offline Model Status Notice
          </h4>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
            The baseline Random Forest fault-classification model has been trained and evaluated offline.
            The metrics below represent <strong>out-of-sample offline test set results</strong>.
            Live telemetry inference service is currently <strong>not connected</strong> to real-time streams.
          </p>
        </div>
      </div>

      {/* Model Overview Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {modelMetrics.map((m, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                {m.label}
              </span>
              <span className={`text-lg font-bold ${m.highlight ? 'text-emerald-600 dark:text-emerald-400 font-tabular' : 'text-slate-800 dark:text-slate-100'}`}>
                {m.value}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#08A9E6] flex items-center justify-center">
              <m.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Target Classes & Feature Schema Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Card 1: 6 Target Fault Classes */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FiActivity className="text-[#08A9E6]" />
            <span>Target Fault Classes (6)</span>
          </h3>
          <div className="space-y-2.5">
            {faultClasses.map((fc, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between gap-3">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                  {fc.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-right">
                  {fc.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: 13 Telemetry Features */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FiTag className="text-[#08A9E6]" />
            <span>Input Sensor Features (13)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            The model evaluates instantaneous physical telemetry features, intentionally excluding asset ID, timestamp, and derived health metrics to prevent identity/target leakage.
          </p>
          <div className="flex flex-wrap gap-2">
            {featureList.map((f, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Roadmap Notice */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
          Future Inference Roadmap
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          In upcoming development phases, an ML inference service will connect the trained model checkpoint (<code className="font-mono text-slate-700 dark:text-slate-300">fault_classifier.joblib</code>) to incoming compressor telemetry streams to produce real-time fault classifications and early warning notifications.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default Prediction;
