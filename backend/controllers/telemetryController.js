const pool = require("../config/db");
const assetModel = require("../models/assetModel");
const telemetryModel = require("../models/telemetryModel");

// POST /api/telemetry
// This is the "mailbox" the compressor simulator sends each reading to.
const receiveTelemetry = async (req, res) => {
  try {
    const body = req.body;

    // The simulator identifies the asset by its code (e.g. "COMP-001"),
    // not by the database's internal numeric id — so we look it up first.
    const rawAssetCode = body.assetId || body.assetCode;
    if (!rawAssetCode) {
      return res.status(400).json({
        success: false,
        message: "Missing assetId in telemetry payload",
      });
    }
    const assetCode = String(rawAssetCode).trim().toUpperCase();

    const asset = await assetModel.findAssetByCode(assetCode);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `No registered asset found for code '${assetCode}'. Add it to the assets table first.`,
      });
    }

    // Only Active compressors should be simulated and persisted as live telemetry.
    if (asset.status !== "Active") {
      return res.status(409).json({
        success: false,
        message: `Compressor ${assetCode} is not Active; live telemetry is ignored.`,
      });
    }

    // The simulator's packet looks like:
    // { assetId, timestamp, assetState, environment: {...}, telemetry: {...}, health: {...}, events: [] }
    // Telemetry fields may be nested under body.telemetry or provided flat at the top level of body.
    const rawSim = body.telemetry && typeof body.telemetry === "object" ? body.telemetry : {};
    const sim = { ...body, ...rawSim };
    const env = body.environment && typeof body.environment === "object" ? body.environment : {};

    const reading = {
      recordedAt: body.timestamp || new Date(),
      airPressure: sim.airPressure,
      airflowRate: sim.airflowRate,
      vibration: sim.vibration,
      motorCurrent: sim.motorCurrent,
      motorVoltage: sim.motorVoltage,
      motorTemperature: sim.motorTemperature,
      compressorSpeed: sim.compressorSpeed,
      oilPressure: sim.oilPressure,
      oilTemperature: sim.oilTemperature,
      runningHours: sim.runningHours,
      compressorLoad: sim.compressorLoad,
      startStopCycles: sim.startStopCycles,
      ambientTemperature: env.ambientTemperature !== undefined ? env.ambientTemperature : sim.ambientTemperature,
      assetState: body.assetState || sim.assetState,
    };

    const saved = await telemetryModel.insertTelemetry(asset.id, reading, body);

    await evaluateRuleAlerts(asset.id, assetCode, sim);

    res.status(201).json({
      success: true,
      message: "Telemetry saved",
      data: saved,
    });
  } catch (error) {
    console.error("❌ Failed to save telemetry:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save telemetry",
    });
  }
};

// GET /api/telemetry/latest
// One newest reading per asset — for the dashboard overview cards.
const getLatest = async (req, res) => {
  try {
    const rows = await telemetryModel.getLatestPerAsset();
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Failed to fetch latest telemetry:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch telemetry" });
  }
};

// GET /api/telemetry/:assetCode/history
// Recent readings for one asset — for charts.
const getHistory = async (req, res) => {
  try {
    const { assetCode } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    const asset = await assetModel.findAssetByCode(assetCode);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `No asset found for code '${assetCode}'`,
      });
    }

    const rows = await telemetryModel.getHistoryForAsset(asset.id, limit);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Failed to fetch telemetry history:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch telemetry history" });
  }
};

// Helper: validate whether a reading is a valid, finite numeric value.
// Missing, null, boolean, array, object, whitespace, or NaN readings must NEVER
// be treated as proof of condition recovery or as threshold breaches.
function isValidNumericReading(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === "boolean") return false;
  if (typeof val === "object") return false;
  if (typeof val === "string") {
    if (val.trim() === "") return false;
  }
  const num = Number(val);
  return typeof num === "number" && Number.isFinite(num);
}

const RULE_DEFINITIONS = [
  {
    alertType: "HIGH_VIBRATION",
    parameter: "vibration",
    thresholdValue: 4.0,
    unit: "mm/s",
    level: "warning",
    title: "HIGH VIBRATION",
    buildMessage: (assetCode, val) => `Vibration on ${assetCode} is ${val} mm/s (threshold: 4.0 mm/s).`,
    recommendation: "Inspect bearings, mounting and alignment.",
    isBreached: (val) => val > 4.0,
  },
  {
    alertType: "HIGH_MOTOR_TEMPERATURE",
    parameter: "motorTemperature",
    thresholdValue: 82.0,
    unit: "°C",
    level: "warning",
    title: "HIGH MOTOR TEMPERATURE",
    buildMessage: (assetCode, val) => `Motor temperature on ${assetCode} is ${val} °C (threshold: 82.0 °C).`,
    recommendation: "Inspect cooling, motor load and ventilation.",
    isBreached: (val) => val > 82.0,
  },
  {
    alertType: "LOW_OIL_PRESSURE",
    parameter: "oilPressure",
    thresholdValue: 2.5,
    unit: "bar",
    level: "critical",
    title: "LOW OIL PRESSURE",
    buildMessage: (assetCode, val) => `Oil pressure on ${assetCode} is ${val} bar (threshold: 2.5 bar).`,
    recommendation: "Inspect lubrication system, oil level and pump.",
    isBreached: (val) => val < 2.5,
  },
  {
    alertType: "LOW_AIR_PRESSURE",
    parameter: "airPressure",
    thresholdValue: 8.0,
    unit: "bar",
    level: "warning",
    title: "LOW AIR PRESSURE",
    buildMessage: (assetCode, val) => `Air pressure on ${assetCode} is ${val} bar (threshold: 8.0 bar).`,
    recommendation: "Inspect compressor output, valves and air circuit.",
    isBreached: (val) => val < 8.0,
  },
  {
    alertType: "AIR_LEAKAGE",
    parameter: "airLeakageRate",
    thresholdValue: 12.0,
    unit: "%",
    level: "warning",
    title: "AIR LEAKAGE",
    buildMessage: (assetCode, val) => `Air leakage rate on ${assetCode} is ${val}% (threshold: 12.0%).`,
    recommendation: "Inspect valves, hoses, seals and fittings.",
    isBreached: (val) => val > 12.0,
  },
];

async function evaluateRuleAlerts(assetId, assetCode, sim) {
  if (!sim || typeof sim !== "object") return;

  for (const rule of RULE_DEFINITIONS) {
    const rawVal = sim[rule.parameter];
    // If the sensor value is missing, null, empty or non-numeric, skip evaluation entirely.
    // It must NOT be treated as a recovery and must NOT trigger an alert.
    if (!isValidNumericReading(rawVal)) {
      continue;
    }
    const numVal = Number(rawVal);

    const isBreached = rule.isBreached(numVal);

    // Query active (unresolved) rule-generated alert for this asset and rule type
    const existingActive = await pool.query(
      `SELECT id, actual_value, created_at, source
       FROM alerts
       WHERE asset_id = $1
         AND alert_type = $2
         AND source = 'rule'
         AND is_resolved = FALSE
       LIMIT 1`,
      [assetId, rule.alertType]
    );

    const activeAlert = existingActive.rows[0];

    if (isBreached) {
      // Condition is abnormal:
      // ALERT -> ALERT: If an active alert already exists, keep it active without duplicate inserts
      if (!activeAlert) {
        // NORMAL -> ALERT transition: create new active alert record
        await pool.query(
          `INSERT INTO alerts (
            asset_id, level, title, message, source, alert_type,
            trigger_parameter, actual_value, threshold_value, recommendation,
            is_resolved, is_acknowledged
          ) VALUES ($1, $2, $3, $4, 'rule', $5, $6, $7, $8, $9, FALSE, FALSE)`,
          [
            assetId,
            rule.level,
            rule.title,
            rule.buildMessage(assetCode, numVal),
            rule.alertType,
            rule.parameter,
            numVal,
            rule.thresholdValue,
            rule.recommendation,
          ]
        );
      }
    } else {
      // Condition has returned to normal range:
      // ALERT -> NORMAL transition: automatically recover active alert while preserving history
      if (activeAlert) {
        const recoveryNote = `Condition recovered: ${rule.parameter} returned to normal (${numVal} ${rule.unit}).`;
        await pool.query(
          `UPDATE alerts
           SET is_resolved = TRUE,
               resolved_at = NOW(),
               resolved_by = NULL,
               resolution_notes = $1
           WHERE id = $2 AND is_resolved = FALSE`,
          [recoveryNote, activeAlert.id]
        );
      }
      // NORMAL -> NORMAL: condition is normal and no active alert exists, do nothing
    }
  }
}

// Backwards compatibility alias
const createRuleAlerts = evaluateRuleAlerts;

module.exports = {
  receiveTelemetry,
  getLatest,
  getHistory,
  evaluateRuleAlerts,
  createRuleAlerts,
  isValidNumericReading,
  RULE_DEFINITIONS,
};
