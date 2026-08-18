import React from "react";

function CircularProgress({ value = 100, size = 44, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  let strokeColor = "#16A34A"; // Green
  if (value < 60) strokeColor = "#DC2626"; // Red
  else if (value < 90) strokeColor = "#F59E0B"; // Orange

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-extrabold text-[#172033] dark:text-slate-100 font-tabular">
        {Math.round(value)}%
      </span>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, type, healthScore = 100, badgeText }) {
  return (
    <div className="industrial-card flex flex-col justify-between">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-wider text-[#64748B] dark:text-slate-400">
            {title}
          </p>
        </div>

        {type === "health" ? (
          <CircularProgress value={healthScore} />
        ) : Icon ? (
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#08A9E6] flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <Icon size={18} />
          </div>
        ) : null}
      </div>

      <div className="mb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-extrabold text-[#172033] dark:text-slate-100 tracking-tight font-tabular">
            {value}
          </h2>
          {badgeText && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {badgeText}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-[#64748B] dark:text-slate-400 font-medium flex items-center justify-between">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}

export default StatCard;
