import React from "react";

export function SkeletonCard() {
  return (
    <div className="industrial-card animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="industrial-card animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded w-full"></div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="industrial-card animate-pulse h-72 flex items-end gap-2 p-6">
      {[40, 65, 30, 80, 55, 90, 70, 45, 85].map((h, idx) => (
        <div
          key={idx}
          className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-t"
          style={{ height: `${h}%` }}
        ></div>
      ))}
    </div>
  );
}
