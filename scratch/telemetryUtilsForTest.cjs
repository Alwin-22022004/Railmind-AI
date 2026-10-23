function mapHistoryRow(row) {
  const rawDate = row?.recorded_at;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());
  const timestamp = isValidDate ? parsedDate.getTime() : null;

  return {
    time: isValidDate
      ? parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "N/A",
    timestamp,
    recordedAt: rawDate || null,
    airPressure: row?.air_pressure !== null && row?.air_pressure !== undefined ? Number(row.air_pressure) : null,
    airflowRate: row?.airflow_rate !== null && row?.airflow_rate !== undefined ? Number(row.airflow_rate) : null,
    vibration: row?.vibration !== null && row?.vibration !== undefined ? Number(row.vibration) : null,
    motorCurrent: row?.motor_current !== null && row?.motor_current !== undefined ? Number(row.motor_current) : null,
    motorVoltage: row?.motor_voltage !== null && row?.motor_voltage !== undefined ? Number(row.motor_voltage) : null,
    motorTemperature: row?.motor_temperature !== null && row?.motor_temperature !== undefined ? Number(row.motor_temperature) : null,
    oilPressure: row?.oil_pressure !== null && row?.oil_pressure !== undefined ? Number(row.oil_pressure) : null,
    oilTemperature: row?.oil_temperature !== null && row?.oil_temperature !== undefined ? Number(row.oil_temperature) : null,
    compressorSpeed: row?.compressor_speed !== null && row?.compressor_speed !== undefined ? Number(row.compressor_speed) : null,
  };
}

const TIME_RANGE_DURATIONS = {
  "1H": 1 * 60 * 60 * 1000,
  "6H": 6 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "30D": 30 * 24 * 60 * 60 * 1000,
};

function filterHistoryByTimeRange(history, timeRange = "1H", referenceTime = null) {
  if (!Array.isArray(history) || history.length === 0) return [];

  const duration = TIME_RANGE_DURATIONS[timeRange] || TIME_RANGE_DURATIONS["1H"];

  let refMs;
  if (referenceTime !== null && referenceTime !== undefined) {
    refMs = typeof referenceTime === "number" ? referenceTime : new Date(referenceTime).getTime();
  } else {
    refMs = Date.now();
  }

  if (isNaN(refMs)) {
    refMs = Date.now();
  }

  const maxAllowedTime = refMs + 60000;
  const cutoff = refMs - duration;

  return history.filter((item) => {
    if (!item) return false;

    let ts = null;
    if (typeof item.timestamp === "number" && !isNaN(item.timestamp)) {
      ts = item.timestamp;
    } else if (item.recordedAt) {
      const parsed = new Date(item.recordedAt).getTime();
      if (!isNaN(parsed)) ts = parsed;
    }

    if (ts === null || isNaN(ts)) return false;
    if (ts > maxAllowedTime) return false;
    return ts >= cutoff;
  });
}

const STATUS_STYLES = {
  HEALTHY: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-500/20",
  GOOD: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-500/20",
  WARNING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-500/20",
  MAINTENANCE_REQUIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-500/20",
  Unknown: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-500/20",
  WAITING_FOR_TELEMETRY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/20",
  INACTIVE: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-500/20",
};

module.exports = {
  mapHistoryRow,
  filterHistoryByTimeRange,
  TIME_RANGE_DURATIONS,
  STATUS_STYLES,
};
