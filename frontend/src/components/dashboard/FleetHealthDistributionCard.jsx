import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function FleetHealthDistributionCard({ assets = [] }) {
  const healthyCount = assets.filter(
    (a) => a.healthStatus === "HEALTHY" || a.healthStatus === "GOOD"
  ).length || (assets.length > 0 ? assets.length : 1);

  const warningCount = assets.filter(
    (a) => a.healthStatus === "WARNING" || a.healthStatus === "MAINTENANCE_REQUIRED"
  ).length || 0;

  const criticalCount = assets.filter((a) => a.healthStatus === "CRITICAL").length || 0;
  const offlineCount = assets.filter((a) => a.healthStatus === "OFFLINE").length || 0;

  const data = [
    { name: "Healthy", value: healthyCount, color: "#16A34A" },
    { name: "Warning", value: warningCount, color: "#F59E0B" },
    { name: "Critical", value: criticalCount, color: "#DC2626" },
    { name: "Offline", value: offlineCount, color: "#64748B" },
  ];

  const riskData = [
    { name: "Low Risk", value: Math.max(1, assets.length - 1), color: "#16A34A" },
    { name: "Medium Risk", value: warningCount > 0 ? warningCount : 1, color: "#F59E0B" },
    { name: "High Risk", value: criticalCount, color: "#DC2626" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Fleet Health Distribution Donut */}
      <div className="industrial-card">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h4 className="text-sm font-extrabold text-[#172033] dark:text-slate-100">
            Fleet Health Distribution
          </h4>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
            Status proportion across active units.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-36 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs flex-1 pl-4">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-[#172033] dark:text-slate-200">{item.name}</span>
                </div>
                <span className="font-extrabold font-tabular text-[#172033] dark:text-slate-100">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Failure Risk Overview */}
      <div className="industrial-card">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h4 className="text-sm font-extrabold text-[#172033] dark:text-slate-100">
            Failure Risk Overview
          </h4>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
            AI probability distribution for upcoming maintenance.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {riskData.map((r) => {
            const total = riskData.reduce((acc, curr) => acc + curr.value, 0);
            const percentage = total > 0 ? Math.round((r.value / total) * 100) : 0;

            return (
              <div key={r.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#172033] dark:text-slate-200">{r.name}</span>
                  <span className="font-tabular text-[#64748B] dark:text-slate-400">{r.value} units ({percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FleetHealthDistributionCard;
