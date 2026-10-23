// Turns one row from GET /api/telemetry/latest (a DB row + the
// simulator's raw_payload JSON) into the flat shape every page uses.
export function mapRowToAsset(row) {
  const health = row.raw_payload?.health || {};
  const healthStatus = row.raw_payload?.health?.healthStatus || (row.telemetry_id ? "Unknown" : (row.asset_status === "Active" ? "WAITING_FOR_TELEMETRY" : "INACTIVE"));
  return {
    id: row.asset_code,
    assetDbId: row.asset_id,
    name: row.asset_name,
    zone: row.zone,
    healthScore: typeof health.healthScore === "number" ? health.healthScore : null,
    healthStatus,
    failureProbability: health.failureProbability ?? null,
    assetState: row.asset_state || "Unknown",
    airPressure: row.air_pressure !== null ? Number(row.air_pressure) : null,
    airflowRate: row.airflow_rate !== null ? Number(row.airflow_rate) : null,
    vibration: row.vibration !== null ? Number(row.vibration) : null,
    motorCurrent: row.motor_current !== null ? Number(row.motor_current) : null,
    motorVoltage: row.motor_voltage !== null ? Number(row.motor_voltage) : null,
    motorTemperature: row.motor_temperature !== null ? Number(row.motor_temperature) : null,
    compressorSpeed: row.compressor_speed !== null ? Number(row.compressor_speed) : null,
    oilPressure: row.oil_pressure !== null ? Number(row.oil_pressure) : null,
    oilTemperature: row.oil_temperature !== null ? Number(row.oil_temperature) : null,
    runningHours: row.running_hours !== null ? Number(row.running_hours) : null,
    compressorLoad: row.compressor_load !== null ? Number(row.compressor_load) : null,
    ambientTemperature: row.ambient_temperature !== null ? Number(row.ambient_temperature) : null,
    registeredStatus: row.asset_status || null,
    hasTelemetry: Boolean(row.telemetry_id),
    recordedAt: row.recorded_at,
  };
}

// Flattens one telemetry history row (from GET /telemetry/:code/history)
// for charting, with a readable time label and preserved timestamp.
export function mapHistoryRow(row) {
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

export const TIME_RANGE_DURATIONS = {
  "1H": 1 * 60 * 60 * 1000,
  "6H": 6 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "30D": 30 * 24 * 60 * 60 * 1000,
};

/**
 * Filters telemetry history readings to the chosen time range.
 * Calculates cutoff from the selected range and discards out-of-range,
 * missing, or future-dated timestamps safely.
 *
 * @param {Array} history - Array of mapped telemetry history points
 * @param {string} timeRange - "1H" | "6H" | "24H" | "7D" | "30D"
 * @param {number|Date} [referenceTime] - Optional reference timestamp (defaults to Date.now())
 * @returns {Array} Filtered history points within [cutoff, maxAllowedTime]
 */
export function filterHistoryByTimeRange(history, timeRange = "1H", referenceTime = null) {
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

  // 1-minute grace period for slight network or local clock skew
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

    // Invalid or missing timestamp: reject
    if (ts === null || isNaN(ts)) return false;

    // Future-dated reading: reject
    if (ts > maxAllowedTime) return false;

    // Out of range before cutoff: reject
    return ts >= cutoff;
  });
}

export const STATUS_STYLES = {
  HEALTHY: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  GOOD: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  WARNING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  MAINTENANCE_REQUIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  Unknown: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  WAITING_FOR_TELEMETRY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  INACTIVE: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

// Every field the simulator sends per tick — label + unit + icon key
// (icon components are attached where used, to keep this file icon-free).
export const TELEMETRY_FIELDS = [
  { key: "airPressure", label: "Air Pressure", unit: "bar" },
  { key: "airflowRate", label: "Airflow Rate", unit: "L/min" },
  { key: "vibration", label: "Vibration", unit: "mm/s" },
  { key: "motorCurrent", label: "Motor Current", unit: "A" },
  { key: "motorVoltage", label: "Motor Voltage", unit: "V" },
  { key: "motorTemperature", label: "Motor Temp", unit: "°C" },
  { key: "compressorSpeed", label: "Compressor Speed", unit: "RPM" },
  { key: "oilPressure", label: "Oil Pressure", unit: "bar" },
  { key: "oilTemperature", label: "Oil Temp", unit: "°C" },
  { key: "runningHours", label: "Running Hours", unit: "h" },
  { key: "compressorLoad", label: "Compressor Load", unit: "%" },
  { key: "ambientTemperature", label: "Ambient Temp", unit: "°C" },
];
