const pool = require("../config/db");

// Save one sensor reading. assetId here is the internal numeric DB id
// (already resolved from the asset_code), not the string code.
const insertTelemetry = async (assetId, reading, rawPayload) => {
  const {
    recordedAt,
    airPressure,
    airflowRate,
    vibration,
    motorCurrent,
    motorVoltage,
    motorTemperature,
    compressorSpeed,
    oilPressure,
    oilTemperature,
    runningHours,
    compressorLoad,
    startStopCycles,
    ambientTemperature,
    assetState,
  } = reading;

  const result = await pool.query(
    `INSERT INTO telemetry
      (asset_id, recorded_at, air_pressure, airflow_rate, vibration,
       motor_current, motor_voltage, motor_temperature, compressor_speed,
       oil_pressure, oil_temperature, running_hours, compressor_load,
       start_stop_cycles, ambient_temperature, asset_state, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      assetId,
      recordedAt || new Date(),
      airPressure,
      airflowRate,
      vibration,
      motorCurrent,
      motorVoltage,
      motorTemperature,
      compressorSpeed,
      oilPressure,
      oilTemperature,
      runningHours,
      compressorLoad,
      startStopCycles,
      ambientTemperature,
      assetState,
      rawPayload,
    ]
  );

  return result.rows[0];
};

// One newest reading per asset — this is what the dashboard's
// "overview" cards and asset table use.
const getLatestPerAsset = async () => {
  const result = await pool.query(
    `SELECT
        a.id AS asset_id,
        a.asset_code,
        a.name AS asset_name,
        a.zone,
        a.status AS asset_status,
        t.id AS telemetry_id,
        t.recorded_at,
        t.air_pressure,
        t.airflow_rate,
        t.vibration,
        t.motor_current,
        t.motor_voltage,
        t.motor_temperature,
        t.compressor_speed,
        t.oil_pressure,
        t.oil_temperature,
        t.running_hours,
        t.compressor_load,
        t.start_stop_cycles,
        t.ambient_temperature,
        t.asset_state,
        t.raw_payload
     FROM assets a
     LEFT JOIN LATERAL (
        SELECT t.*
        FROM telemetry t
        WHERE t.asset_id = a.id
        ORDER BY t.recorded_at DESC, t.id DESC
        LIMIT 1
     ) t ON TRUE
     WHERE a.asset_type = 'AIR_COMPRESSOR'
     ORDER BY a.id ASC`
  );
  return result.rows;
};

// Recent history for one asset (for charts / trend lines).
const getHistoryForAsset = async (assetId, limit = 100) => {
  const result = await pool.query(
    `SELECT * FROM telemetry
     WHERE asset_id = $1
     ORDER BY recorded_at DESC
     LIMIT $2`,
    [assetId, limit]
  );
  return result.rows;
};

module.exports = {
  insertTelemetry,
  getLatestPerAsset,
  getHistoryForAsset,
};
