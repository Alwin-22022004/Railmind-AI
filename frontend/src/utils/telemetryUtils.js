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
// for charting, with a readable time label.
export function mapHistoryRow(row) {
  const t = new Date(row.recorded_at);
  return {
    time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    airPressure: row.air_pressure !== null ? Number(row.air_pressure) : null,
    airflowRate: row.airflow_rate !== null ? Number(row.airflow_rate) : null,
    vibration: row.vibration !== null ? Number(row.vibration) : null,
    motorCurrent: row.motor_current !== null ? Number(row.motor_current) : null,
    motorTemperature: row.motor_temperature !== null ? Number(row.motor_temperature) : null,
    oilPressure: row.oil_pressure !== null ? Number(row.oil_pressure) : null,
    oilTemperature: row.oil_temperature !== null ? Number(row.oil_temperature) : null,
    compressorSpeed: row.compressor_speed !== null ? Number(row.compressor_speed) : null,
  };
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
