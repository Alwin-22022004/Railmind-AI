import { useNavigate } from "react-router-dom";
import { FiCpu, FiCheckCircle, FiAlertCircle, FiArrowRight } from "react-icons/fi";

function AIInsightsCard({ selectedAssetId = "COMP-001" }) {
  const navigate = useNavigate();

  return (
    <div className="industrial-card relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#08A9E6]">
            <FiCpu size={16} />
            <span>AI / ML Prototype Status</span>
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            MODEL TRAINED
          </span>
        </div>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <FiCheckCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#172033] dark:text-slate-100 leading-snug">
                Fault Classification Model: Trained
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Baseline Random Forest classifier trained offline across 6 fault classes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Offline Accuracy
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-tabular">
                99.80%
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Macro F1-Score
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-tabular">
                99.45%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
            <FiAlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-[11px]">
              Live Inference: <strong>Not Connected</strong> (Offline prototype)
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate("/prediction")}
          className="btn-primary w-full text-xs flex items-center justify-center gap-2 py-2"
        >
          <span>View Detailed Model Information</span>
          <FiArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default AIInsightsCard;
