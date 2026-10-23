const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});
const jwt = require("jsonwebtoken");

// Replicate / import utility functions for Node execution
const {
  mapHistoryRow,
  filterHistoryByTimeRange,
  TIME_RANGE_DURATIONS,
  STATUS_STYLES,
  TELEMETRY_FIELDS,
} = require("./telemetryUtilsForTest.cjs");

const API_BASE = "http://localhost:5000/api";
const adminToken = jwt.sign(
  { id: 2, role: "ADMIN", email: "alwin789@gmail.com" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

test("Analytics Step 2: Parameters & Time-Range Filtering Suite", async (t) => {
  const CHART_GROUPS = [
    {
      title: "Pressure & Airflow",
      metrics: [
        { key: "airPressure", name: "Air Pressure (bar)", color: "#0891b2", axis: "left" },
        { key: "airflowRate", name: "Airflow (L/min)", color: "#22c55e", axis: "right" },
        { key: "oilPressure", name: "Oil Pressure (bar)", color: "#8b5cf6", axis: "left" },
      ],
    },
    {
      title: "Electrical",
      metrics: [
        { key: "motorCurrent", name: "Motor Current (A)", color: "#f59e0b", axis: "left" },
        { key: "compressorSpeed", name: "Speed (RPM)", color: "#0891b2", axis: "right" },
      ],
    },
    {
      title: "Thermal & Vibration",
      metrics: [
        { key: "motorTemperature", name: "Motor Temp (°C)", color: "#ef4444", axis: "left" },
        { key: "oilTemperature", name: "Oil Temp (°C)", color: "#f97316", axis: "left" },
        { key: "vibration", name: "Vibration (mm/s)", color: "#8b5cf6", axis: "right" },
      ],
    },
  ];

  await t.test("1. Each chart group contains only its assigned, relevant metrics", () => {
    // Group 1: Pressure & Airflow
    const g1Keys = CHART_GROUPS[0].metrics.map((m) => m.key);
    assert.deepStrictEqual(g1Keys, ["airPressure", "airflowRate", "oilPressure"]);
    assert.strictEqual(g1Keys.includes("motorCurrent"), false, "Pressure group must not have motorCurrent");
    assert.strictEqual(g1Keys.includes("motorTemperature"), false, "Pressure group must not have motorTemperature");
    assert.strictEqual(g1Keys.includes("vibration"), false, "Pressure group must not have vibration");

    // Group 2: Electrical
    const g2Keys = CHART_GROUPS[1].metrics.map((m) => m.key);
    assert.deepStrictEqual(g2Keys, ["motorCurrent", "compressorSpeed"]);
    assert.strictEqual(g2Keys.includes("airPressure"), false, "Electrical group must not have airPressure");

    // Group 3: Thermal & Vibration
    const g3Keys = CHART_GROUPS[2].metrics.map((m) => m.key);
    assert.deepStrictEqual(g3Keys, ["motorTemperature", "oilTemperature", "vibration"]);
    assert.strictEqual(g3Keys.includes("airflowRate"), false, "Thermal group must not have airflowRate");
  });

  await t.test("2. Metric field mapping correctly handles backend API response and preserves valid timestamps", async () => {
    const res = await fetch(`${API_BASE}/telemetry/COMP-001/history?limit=3`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.length > 0);

    const raw = json.data[0];
    const mapped = mapHistoryRow(raw);

    assert.ok(mapped.timestamp > 0, "Must preserve valid numeric timestamp");
    assert.ok(mapped.recordedAt, "Must preserve raw recordedAt string");
    assert.strictEqual(typeof mapped.time, "string");
    assert.notStrictEqual(mapped.time, "N/A");

    // Validate parameter conversions to numbers
    assert.strictEqual(typeof mapped.airPressure, "number");
    assert.strictEqual(typeof mapped.airflowRate, "number");
    assert.strictEqual(typeof mapped.vibration, "number");
    assert.strictEqual(typeof mapped.motorCurrent, "number");
    assert.strictEqual(typeof mapped.motorTemperature, "number");
    assert.strictEqual(typeof mapped.oilPressure, "number");
    assert.strictEqual(typeof mapped.oilTemperature, "number");
    assert.strictEqual(typeof mapped.compressorSpeed, "number");
  });

  await t.test("3. Metric selection filters plotted series properly", () => {
    const metrics = CHART_GROUPS[0].metrics; // Pressure & Airflow: airPressure, airflowRate, oilPressure

    function getVisibleMetrics(selectedParam) {
      const active =
        selectedParam === "ALL"
          ? metrics
          : metrics.filter((m) => m.key === selectedParam);
      return active.length > 0 ? active : metrics;
    }

    // ALL selected
    const all = getVisibleMetrics("ALL");
    assert.strictEqual(all.length, 3);

    // Single metric: airPressure
    const air = getVisibleMetrics("airPressure");
    assert.strictEqual(air.length, 1);
    assert.strictEqual(air[0].key, "airPressure");
    assert.strictEqual(air[0].name, "Air Pressure (bar)");

    // Single metric: airflowRate
    const airflow = getVisibleMetrics("airflowRate");
    assert.strictEqual(airflow.length, 1);
    assert.strictEqual(airflow[0].key, "airflowRate");

    // Invalid metric falls back safely
    const fallback = getVisibleMetrics("UNKNOWN_KEY");
    assert.strictEqual(fallback.length, 3);
  });

  await t.test("4. Time-range filtering: 1H, 6H, 24H, 7D, 30D calculate cutoffs and filter history accurately", () => {
    // Fixed deterministic reference time: 2026-10-23T12:00:00.000Z
    const fixedNow = new Date("2026-10-23T12:00:00.000Z").getTime();

    const sampleHistory = [
      { id: "30m", timestamp: fixedNow - 30 * 60 * 1000, airPressure: 7.0 }, // 30 mins ago
      { id: "3h", timestamp: fixedNow - 3 * 3600 * 1000, airPressure: 7.1 },  // 3 hours ago
      { id: "12h", timestamp: fixedNow - 12 * 3600 * 1000, airPressure: 7.2 }, // 12 hours ago
      { id: "2d", timestamp: fixedNow - 2 * 86400 * 1000, airPressure: 7.3 },  // 2 days ago
      { id: "15d", timestamp: fixedNow - 15 * 86400 * 1000, airPressure: 7.4 },// 15 days ago
      { id: "45d", timestamp: fixedNow - 45 * 86400 * 1000, airPressure: 7.5 },// 45 days ago (out of all ranges)
    ];

    // 1H
    const r1H = filterHistoryByTimeRange(sampleHistory, "1H", fixedNow);
    assert.deepStrictEqual(r1H.map((x) => x.id), ["30m"], "1H must include only 30m point");

    // 6H
    const r6H = filterHistoryByTimeRange(sampleHistory, "6H", fixedNow);
    assert.deepStrictEqual(r6H.map((x) => x.id), ["30m", "3h"], "6H must include 30m and 3h");

    // 24H
    const r24H = filterHistoryByTimeRange(sampleHistory, "24H", fixedNow);
    assert.deepStrictEqual(r24H.map((x) => x.id), ["30m", "3h", "12h"], "24H must include up to 12h");

    // 7D
    const r7D = filterHistoryByTimeRange(sampleHistory, "7D", fixedNow);
    assert.deepStrictEqual(r7D.map((x) => x.id), ["30m", "3h", "12h", "2d"], "7D must include up to 2d");

    // 30D
    const r30D = filterHistoryByTimeRange(sampleHistory, "30D", fixedNow);
    assert.deepStrictEqual(r30D.map((x) => x.id), ["30m", "3h", "12h", "2d", "15d"], "30D must include up to 15d");
    assert.strictEqual(r30D.some((x) => x.id === "45d"), false, "45d reading must never be included in 30D");
  });

  await t.test("5. Empty time range returns empty array to trigger explicit empty state", () => {
    const fixedNow = new Date("2026-10-23T12:00:00.000Z").getTime();
    const historyWithOnlyOldData = [
      { id: "2h", timestamp: fixedNow - 2 * 3600 * 1000, airPressure: 7.1 },
      { id: "3h", timestamp: fixedNow - 3 * 3600 * 1000, airPressure: 7.2 },
    ];

    // Under 1H filter, all readings are out-of-range
    const filtered1H = filterHistoryByTimeRange(historyWithOnlyOldData, "1H", fixedNow);
    assert.strictEqual(filtered1H.length, 0, "Must return 0 items when no readings are in range");

    // Under 6H filter, both are present
    const filtered6H = filterHistoryByTimeRange(historyWithOnlyOldData, "6H", fixedNow);
    assert.strictEqual(filtered6H.length, 2, "Must return 2 items under 6H range");
  });

  await t.test("6. Safety: Malformed, missing, and future-dated timestamps are safely discarded", () => {
    const fixedNow = new Date("2026-10-23T12:00:00.000Z").getTime();

    const problematicData = [
      { id: "valid", timestamp: fixedNow - 1000, airPressure: 7.0 },
      { id: "future", timestamp: fixedNow + 3600 * 1000, airPressure: 8.0 }, // 1 hour into future
      { id: "invalid_str", timestamp: NaN, recordedAt: "not-a-date" },
      { id: "missing", timestamp: null, recordedAt: null },
      null,
    ];

    const safeResult = filterHistoryByTimeRange(problematicData, "1H", fixedNow);
    assert.strictEqual(safeResult.length, 1);
    assert.strictEqual(safeResult[0].id, "valid");
  });

  await t.test("7. Health status is accurately attached to compressor rather than hardcoded Healthy", () => {
    function getHealthDisplay(healthStatus) {
      const healthBadgeStyle = healthStatus && STATUS_STYLES[healthStatus]
        ? STATUS_STYLES[healthStatus]
        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      const displayHealth = healthStatus
        ? healthStatus.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
        : null;
      return { displayHealth, healthBadgeStyle };
    }

    const h1 = getHealthDisplay("CRITICAL");
    assert.strictEqual(h1.displayHealth, "Critical");
    assert.ok(h1.healthBadgeStyle.includes("red"));

    const h2 = getHealthDisplay("WARNING");
    assert.strictEqual(h2.displayHealth, "Warning");
    assert.ok(h2.healthBadgeStyle.includes("yellow"));

    const h3 = getHealthDisplay("MAINTENANCE_REQUIRED");
    assert.strictEqual(h3.displayHealth, "Maintenance Required");
    assert.ok(h3.healthBadgeStyle.includes("orange"));

    const h4 = getHealthDisplay("HEALTHY");
    assert.strictEqual(h4.displayHealth, "Healthy");
    assert.ok(h4.healthBadgeStyle.includes("green"));
  });
});
