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
    const assetCode = body.assetId;
    if (!assetCode) {
      return res.status(400).json({
        success: false,
        message: "Missing assetId in telemetry payload",
      });
    }

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
    // We pull the specific numbers we care about out of those nested
    // objects and flatten them into our simple table columns.
    const sim = body.telemetry || {};
    const env = body.environment || {};

    const reading = {
      recordedAt: body.timestamp,
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
      ambientTemperature: env.ambientTemperature,
      assetState: body.assetState,
    };

    const saved = await telemetryModel.insertTelemetry(asset.id, reading, body);

    await createRuleAlerts(asset.id, assetCode, sim);

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


async function createRuleAlerts(assetId, assetCode, sim) {
  const rules = [];

  if (sim.vibration !== undefined && Number(sim.vibration) > 4.0) {
    rules.push({
      level: "warning",
      alertType: "HIGH_VIBRATION",
      title: "HIGH VIBRATION",
      message: `Vibration on ${assetCode} is ${sim.vibration} mm/s (threshold: 4.0 mm/s).`,
      parameter: "vibration",
      actualValue: Number(sim.vibration),
      thresholdValue: 4.0,
      recommendation: "Inspect bearings, mounting and alignment.",
    });
  }

  if (sim.motorTemperature !== undefined && Number(sim.motorTemperature) > 82.0) {
    rules.push({
      level: "warning",
      alertType: "HIGH_MOTOR_TEMPERATURE",
      title: "HIGH MOTOR TEMPERATURE",
      message: `Motor temperature on ${assetCode} is ${sim.motorTemperature} °C (threshold: 82.0 °C).`,
      parameter: "motorTemperature",
      actualValue: Number(sim.motorTemperature),
      thresholdValue: 82.0,
      recommendation: "Inspect cooling, motor load and ventilation.",
    });
  }

  if (sim.oilPressure !== undefined && Number(sim.oilPressure) < 2.5) {
    rules.push({
      level: "critical",
      alertType: "LOW_OIL_PRESSURE",
      title: "LOW OIL PRESSURE",
      message: `Oil pressure on ${assetCode} is ${sim.oilPressure} bar (threshold: 2.5 bar).`,
      parameter: "oilPressure",
      actualValue: Number(sim.oilPressure),
      thresholdValue: 2.5,
      recommendation: "Inspect lubrication system, oil level and pump.",
    });
  }

  if (sim.airPressure !== undefined && Number(sim.airPressure) < 8.0) {
    rules.push({
      level: "warning",
      alertType: "LOW_AIR_PRESSURE",
      title: "LOW AIR PRESSURE",
      message: `Air pressure on ${assetCode} is ${sim.airPressure} bar (threshold: 8.0 bar).`,
      parameter: "airPressure",
      actualValue: Number(sim.airPressure),
      thresholdValue: 8.0,
      recommendation: "Inspect compressor output, valves and air circuit.",
    });
  }

  if (sim.airLeakageRate !== undefined && Number(sim.airLeakageRate) > 12.0) {
    rules.push({
      level: "warning",
      alertType: "AIR_LEAKAGE",
      title: "AIR LEAKAGE",
      message: `Air leakage rate on ${assetCode} is ${sim.airLeakageRate}% (threshold: 12.0%).`,
      parameter: "airLeakageRate",
      actualValue: Number(sim.airLeakageRate),
      thresholdValue: 12.0,
      recommendation: "Inspect valves, hoses, seals and fittings.",
    });
  }

  for (const rule of rules) {
    // 5-minute deduplication per asset and alert type for active alerts
    const existing = await pool.query(
      `SELECT id FROM alerts
       WHERE asset_id = $1
         AND (alert_type = $2 OR title = $3)
         AND is_resolved = FALSE
         AND created_at > NOW() - INTERVAL '5 minutes'
       LIMIT 1`,
      [assetId, rule.alertType, rule.title]
    );

    if (!existing.rows.length) {
      await pool.query(
        `INSERT INTO alerts (
          asset_id, level, title, message, source, alert_type,
          trigger_parameter, actual_value, threshold_value, recommendation
        ) VALUES ($1, $2, $3, $4, 'rule', $5, $6, $7, $8, $9)`,
        [
          assetId,
          rule.level,
          rule.title,
          rule.message,
          rule.alertType,
          rule.parameter,
          rule.actualValue,
          rule.thresholdValue,
          rule.recommendation,
        ]
      );
    }
  }
}
module.exports = {
  receiveTelemetry,
  getLatest,
  getHistory,
};
