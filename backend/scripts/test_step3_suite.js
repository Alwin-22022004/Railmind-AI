/**
 * test_step3_suite.js
 * Comprehensive Verification Suite for Step 3: Alerts Pipeline & Diagnostics
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const CompressorPhysics = require("../../simulator/assets/compressor/CompressorPhysics");
const AssetManager = require("../../simulator/assets/common/AssetManager");
const CompressorAsset = require("../../simulator/assets/compressor/CompressorAsset");
const EnvironmentModel = require("../../simulator/environment/EnvironmentModel");

const BACKEND_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const adminToken = jwt.sign({ id: 2, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" });
const maintToken = jwt.sign({ id: 1, role: "MAINTENANCE" }, JWT_SECRET, { expiresIn: "1h" });

async function runStep3Suite() {
  console.log("===============================================================");
  console.log("RUNNING RAILMIND AI STEP 3 ALERTS DIAGNOSTICS TEST SUITE");
  console.log("===============================================================");

  const results = [];
  function assert(title, condition, details = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${title} ${details ? "(" + details + ")" : ""}`);
      results.push({ title, pass: true });
    } else {
      console.error(`  ❌ FAIL: ${title} ${details ? "(" + details + ")" : ""}`);
      results.push({ title, pass: false, details });
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Normal telemetry reading does not generate an alert
    // -----------------------------------------------------------------
    console.log("\n--- TEST 1: Baseline Healthy Telemetry Rule Check ---");
    const baselinePacket = {
      assetId: "COMP-001",
      timestamp: new Date().toISOString(),
      assetState: "Running",
      telemetry: {
        airPressure: 8.5,
        airflowRate: 600,
        airLeakageRate: 1.5,
        vibration: 2.1,
        motorCurrent: 20.0,
        motorVoltage: 415.0,
        motorTemperature: 58.0,
        compressorSpeed: 1450,
        oilPressure: 3.2,
        oilTemperature: 55.0,
        runningHours: 120.0,
        compressorLoad: 45.0,
        startStopCycles: 15
      },
      environment: { ambientTemperature: 28.0 }
    };

    const countBefore = parseInt(
      (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id = 1")).rows[0].count,
      10
    );

    const postNormalRes = await fetch(`${BACKEND_URL}/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-simulator-key": process.env.SIMULATOR_KEY || "railmind-local-simulator"
      },
      body: JSON.stringify(baselinePacket)
    });
    const postNormalData = await postNormalRes.json();
    assert("Normal telemetry POST succeeds with HTTP 201", postNormalRes.status === 201 && postNormalData.success);

    const countAfterNormal = parseInt(
      (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id = 1")).rows[0].count,
      10
    );
    assert(
      "1. Normal telemetry reading does NOT generate an alert",
      countBefore === countAfterNormal,
      `before: ${countBefore}, after: ${countAfterNormal}`
    );

    // -----------------------------------------------------------------
    // TEST 2: Threshold-breaching reading triggers the correct rule
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Threshold Breaching & Rule Triggering ---");
    // Ensure test asset COMP-009 has test alerts resolved to test clean trigger
    await pool.query("UPDATE alerts SET is_resolved = TRUE WHERE asset_id = 9 AND is_resolved = FALSE");

    const breachPacket = {
      assetId: "COMP-009",
      timestamp: new Date().toISOString(),
      assetState: "Degraded",
      telemetry: {
        airPressure: 7.2,       // < 8.0 -> LOW_AIR_PRESSURE (warning)
        airflowRate: 500,
        airLeakageRate: 16.5,   // > 12.0 -> AIR_LEAKAGE (warning)
        vibration: 5.4,         // > 4.0 -> HIGH_VIBRATION (warning)
        motorCurrent: 26.0,
        motorVoltage: 410.0,
        motorTemperature: 88.5, // > 82.0 -> HIGH_MOTOR_TEMPERATURE (warning)
        compressorSpeed: 1420,
        oilPressure: 2.1,       // < 2.5 -> LOW_OIL_PRESSURE (critical)
        oilTemperature: 75.0,
        runningHours: 350.0,
        compressorLoad: 80.0,
        startStopCycles: 40
      },
      environment: { ambientTemperature: 35.0 }
    };

    const postBreachRes = await fetch(`${BACKEND_URL}/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-simulator-key": process.env.SIMULATOR_KEY || "railmind-local-simulator"
      },
      body: JSON.stringify(breachPacket)
    });
    const postBreachData = await postBreachRes.json();
    assert("Breaching telemetry POST succeeds with HTTP 201", postBreachRes.status === 201 && postBreachData.success);

    const triggeredAlerts = (
      await pool.query(
        "SELECT alert_type, level, trigger_parameter, actual_value, threshold_value FROM alerts WHERE asset_id = 9 AND is_resolved = FALSE ORDER BY id DESC LIMIT 5"
      )
    ).rows;

    const types = triggeredAlerts.map(a => a.alert_type);
    assert(
      "2. Threshold-breaching readings trigger correct rules",
      types.includes("HIGH_VIBRATION") &&
      types.includes("HIGH_MOTOR_TEMPERATURE") &&
      types.includes("LOW_OIL_PRESSURE") &&
      types.includes("LOW_AIR_PRESSURE") &&
      types.includes("AIR_LEAKAGE"),
      `Triggered: ${types.join(", ")}`
    );

    // -----------------------------------------------------------------
    // TEST 3: Alert saved to PostgreSQL and retrievable via API
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Alert Persistence & Retrieval via API ---");
    const getComp9Res = await fetch(`${BACKEND_URL}/alerts?assetCode=COMP-009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getComp9Data = await getComp9Res.json();
    assert(
      "3. The generated alert is saved to PostgreSQL and retrievable via GET /api/alerts",
      getComp9Res.status === 200 && Array.isArray(getComp9Data.data) && getComp9Data.data.length >= 5 &&
      getComp9Data.data.some(a => a.alert_type === "LOW_OIL_PRESSURE" && a.level === "critical")
    );

    // -----------------------------------------------------------------
    // TEST 4: Default fleet view returns all existing alerts
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Fleet View Query ---");
    const fleetRes = await fetch(`${BACKEND_URL}/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const fleetData = await fleetRes.json();
    assert(
      "4. The API returns existing alerts when frontend requests fleet view",
      fleetRes.status === 200 && Array.isArray(fleetData.data) && fleetData.data.length > 50,
      `Fleet alerts count: ${fleetData.data?.length}`
    );

    // -----------------------------------------------------------------
    // TEST 5 & 6: Asset code filtering and isolation (COMP-002, COMP-003)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5 & 6: Asset Isolation & Filtering ---");
    const comp2Res = await fetch(`${BACKEND_URL}/alerts?assetCode=COMP-002`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const comp2Data = await comp2Res.json();
    const comp2AllMatch = comp2Data.data.every(a => a.asset_code === "COMP-002");
    assert(
      "5. COMP-002 filtering does not return alerts belonging to COMP-001 or another asset",
      comp2Res.status === 200 && comp2Data.data.length > 0 && comp2AllMatch,
      `Count: ${comp2Data.data.length}, all COMP-002: ${comp2AllMatch}`
    );

    const comp3Res = await fetch(`${BACKEND_URL}/alerts?assetCode=COMP-003`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const comp3Data = await comp3Res.json();
    const comp3AllMatch = comp3Data.data.every(a => a.asset_code === "COMP-003");
    assert(
      "6. COMP-003 filtering returns only COMP-003 alerts",
      comp3Res.status === 200 && comp3Data.data.length > 0 && comp3AllMatch,
      `Count: ${comp3Data.data.length}, all COMP-003: ${comp3AllMatch}`
    );

    // Case-insensitivity and whitespace resilience check
    const comp2LowerRes = await fetch(`${BACKEND_URL}/alerts?assetCode=  comp-002  `, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const comp2LowerData = await comp2LowerRes.json();
    assert(
      "Case and whitespace resilience for assetCode parameter ('  comp-002  ')",
      comp2LowerData.data?.length === comp2Data.data?.length,
      `Matches standard COMP-002 count: ${comp2LowerData.data?.length}`
    );

    // -----------------------------------------------------------------
    // TEST 7: Status and severity filters
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Severity & Status Filtering ---");
    const critRes = await fetch(`${BACKEND_URL}/alerts?severity=CRITICAL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const critData = await critRes.json();
    const critAllMatch = critData.data.every(a => a.level === "critical");
    assert("Severity filter (CRITICAL) returns only critical records", critData.data.length > 0 && critAllMatch);

    const warnRes = await fetch(`${BACKEND_URL}/alerts?severity=warning`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const warnData = await warnRes.json();
    const warnAllMatch = warnData.data.every(a => a.level === "warning");
    assert("Severity filter (warning lowercase) returns only warning records", warnData.data.length > 0 && warnAllMatch);

    const actRes = await fetch(`${BACKEND_URL}/alerts?status=ACTIVE`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const actData = await actRes.json();
    const actAllMatch = actData.data.every(a => !a.is_resolved);
    assert("Status filter (ACTIVE) returns only unresolved records", actData.data.length > 0 && actAllMatch);

    const resRes = await fetch(`${BACKEND_URL}/alerts?status=RESOLVED`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const resData = await resRes.json();
    const resAllMatch = resData.data.every(a => a.is_resolved === true);
    assert("Status filter (RESOLVED) returns only resolved records", resData.data.length > 0 && resAllMatch);

    const allRes = await fetch(`${BACKEND_URL}/alerts?severity=ALL&status=ALL&assetCode=ALL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const allData = await allRes.json();
    assert(
      "7. Status and severity filters return correct records ('ALL' parameters ignored)",
      allData.data?.length === fleetData.data?.length,
      `ALL count: ${allData.data?.length} === Fleet count: ${fleetData.data?.length}`
    );

    // -----------------------------------------------------------------
    // TEST 8: Proper empty state handling
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: Empty Result State Handling ---");
    const emptyQueryRes = await fetch(`${BACKEND_URL}/alerts?assetCode=COMP-999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const emptyQueryData = await emptyQueryRes.json();
    assert(
      "8. Filter yielding no alerts returns empty array (status 200) for frontend empty state",
      emptyQueryRes.status === 200 && Array.isArray(emptyQueryData.data) && emptyQueryData.data.length === 0
    );

    // -----------------------------------------------------------------
    // TEST 9: API failures produce visible error / 401 handling
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: API Error & Auth Enforcement ---");
    const unauthorizedRes = await fetch(`${BACKEND_URL}/alerts`);
    assert(
      "9. Unauthenticated request rejected with HTTP 401 (triggers visible fetchError in Alerts.jsx)",
      unauthorizedRes.status === 401
    );

    // -----------------------------------------------------------------
    // TEST 10: Acknowledgement, Assignment, Resolution lifecycle
    // -----------------------------------------------------------------
    console.log("\n--- TEST 10: Lifecycle & Maintenance Workflow Preservation ---");
    // Pick the newest alert on COMP-009
    const testAlertId = getComp9Data.data[0].id;

    // Acknowledge
    const ackRes = await fetch(`${BACKEND_URL}/alerts/${testAlertId}/acknowledge`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${maintToken}` }
    });
    const ackData = await ackRes.json();
    assert("10a. Alert acknowledgement succeeds", ackRes.status === 200 && ackData.data?.is_acknowledged === true);

    // Assign
    const assignRes = await fetch(`${BACKEND_URL}/alerts/${testAlertId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ assignedTo: 1 })
    });
    const assignData = await assignRes.json();
    assert("10b. Alert assignment to maintenance engineer succeeds", assignRes.status === 200 && assignData.data?.assigned_to === 1);

    // Resolve without notes must fail
    const resolveFailRes = await fetch(`${BACKEND_URL}/alerts/${testAlertId}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${maintToken}`
      },
      body: JSON.stringify({ resolutionNotes: "   " })
    });
    assert("10c. Alert resolution without notes rejected with HTTP 400", resolveFailRes.status === 400);

    // Resolve with notes
    const resolveRes = await fetch(`${BACKEND_URL}/alerts/${testAlertId}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${maintToken}`
      },
      body: JSON.stringify({ resolutionNotes: "Test inspection completed and valve seal serviced." })
    });
    const resolveData = await resolveRes.json();
    assert(
      "10d. Alert resolution with notes succeeds and marks is_resolved = true",
      resolveRes.status === 200 && resolveData.data?.is_resolved === true
    );

    // -----------------------------------------------------------------
    // TEST 11: Simulator fault scenarios generate accurate physical values
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: Simulator Fault Scenario Physics Verification ---");
    const assetManager = new AssetManager();
    assetManager.syncCompressorAssets(
      [
        { asset_code: "COMP-001" },
        { asset_code: "COMP-002" },
        { asset_code: "COMP-003" },
        { asset_code: "COMP-004" },
        { asset_code: "COMP-005" }
      ],
      CompressorAsset
    );

    const envModel = new EnvironmentModel();
    envModel.update(1 / 3600);
    const env = envModel.getEnvironment();

    const simPackets = {};
    for (const a of assetManager.getAssets()) {
      simPackets[a.assetId] = a.update(env, new Date().toISOString());
    }

    const c1 = simPackets["COMP-001"].telemetry;
    const c2 = simPackets["COMP-002"].telemetry;
    const c3 = simPackets["COMP-003"].telemetry;
    const c4 = simPackets["COMP-004"].telemetry;
    const c5 = simPackets["COMP-005"].telemetry;

    const c1Healthy = c1.vibration <= 4.0 && c1.motorTemperature <= 82.0 && c1.oilPressure >= 2.5 && c1.airPressure >= 8.0 && c1.airLeakageRate <= 12.0;
    assert("COMP-001 preserves healthy baseline (zero alerts breached)", c1Healthy, `Vib: ${c1.vibration}, Temp: ${c1.motorTemperature}, OilP: ${c1.oilPressure}`);

    const c2Fault = c2.vibration > 4.0;
    assert("COMP-002 bearing wear scenario breaches vibration threshold (> 4.0 mm/s)", c2Fault, `Vib: ${c2.vibration} mm/s`);

    const c3Fault = c3.airLeakageRate > 12.0 && c3.airPressure < 8.0;
    assert("COMP-003 air leakage scenario breaches leakage & pressure thresholds", c3Fault, `Leak: ${c3.airLeakageRate}%, AirP: ${c3.airPressure} bar`);

    const c4Fault = c4.motorTemperature > 82.0;
    assert("COMP-004 motor wear scenario breaches motor temperature (> 82.0 °C)", c4Fault, `Temp: ${c4.motorTemperature} °C`);

    const c5Fault = c5.oilPressure < 2.5;
    assert("COMP-005 oil wear scenario breaches oil pressure (< 2.5 bar)", c5Fault, `OilP: ${c5.oilPressure} bar`);

    console.log("\n===============================================================");
    console.log("FINAL SUMMARY OF STEP 3 SUITE");
    console.log("===============================================================");
    const allPassed = results.every(r => r.pass);
    const passedCount = results.filter(r => r.pass).length;
    console.log(`Passed: ${passedCount}/${results.length}`);

    if (allPassed) {
      console.log("🎉 ALL STEP 3 TESTS PASSED PERFECTLY!");
      process.exitCode = 0;
    } else {
      console.error("❌ SOME TESTS FAILED!");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution exception:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runStep3Suite();
