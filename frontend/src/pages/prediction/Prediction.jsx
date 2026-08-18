import { FiCpu } from "react-icons/fi";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import ComingSoon from "../../components/ComingSoon";

function Prediction() {
  return (
    <DashboardLayout>
      <h2 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100">AI Prediction</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Failure probability, fault classification, and remaining useful life.
      </p>
      <ComingSoon
        icon={FiCpu}
        title="AI model not trained yet"
        description="The predictions table exists in the database, but no model has been trained or connected yet."
        plannedItems={[
          "Health scoring and failure probability from real telemetry",
          "Fault type classification",
          "Remaining Useful Life (RUL) estimation",
          "Explainable AI (XAI) — why a prediction was made",
        ]}
      />
    </DashboardLayout>
  );
}

export default Prediction;
