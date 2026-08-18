/**
 * generateDataset.js
 *
 * Simulates a fleet of railway air compressors, each running from
 * "new" through to failure (or long-term healthy operation), sampling
 * telemetry at a fixed interval. Produces a labeled dataset suitable
 * for training the AI fault-prediction module described in the
 * project abstract:
 *
 *   Inputs (features):  the 13 telemetry channels
 *   Labels:              healthScore, healthStatus, faultType,
 *                        failureProbability, RUL_hours,
 *                        maintenanceRecommendation
 *
 * Usage:
 *   node scripts/generateDataset.js [units] [sampleIntervalHours] [maxHours]
 *
 * Output:
 *   output/air_compressor_dataset.csv
 *   output/air_compressor_dataset_sample.json  (first 20 rows, for quick inspection)
 */

const fs = require("fs");
const path = require("path");

const CompressorPhysics = require("../assets/compressor/CompressorPhysics");
const CompressorHealth = require("../assets/compressor/CompressorHealth");
const MonteCarloEngine = require("../montecarlo/MonteCarloEngine");
const EnvironmentModel = require("../environment/EnvironmentModel");

const NUM_UNITS = parseInt(process.argv[2] || "40", 10);
const SAMPLE_INTERVAL_HOURS = parseFloat(process.argv[3] || "2");
const MAX_HOURS = parseFloat(process.argv[4] || "18000");
const FAILURE_HEALTH_THRESHOLD = 25; // simulation stops for a unit once it reaches this (deep CRITICAL)

const monteCarlo = new MonteCarloEngine();
const healthModel = new CompressorHealth();

const COLUMNS = [
    "unitId",
    "timestamp",
    "runningHours",
    "ambientTemperature",
    "airPressure",
    "airflowRate",
    "buildUpTime",
    "vibration",
    "motorCurrent",
    "motorVoltage",
    "motorTemperature",
    "compressorSpeed",
    "oilPressure",
    "oilTemperature",
    "compressorLoad",
    "startStopCycles",
    "healthScore",
    "healthStatus",
    "failureProbability",
    "faultType",
    "RUL_hours",
    "maintenanceRecommendation"
];

function csvEscape(value) {
    const s = String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function simulateUnit(unitIndex) {

    const unitId = `COMP-${String(unitIndex).padStart(3, "0")}`;
    const faultProfile = monteCarlo.sampleFaultProfile();

    const environmentModel = new EnvironmentModel();
    environmentModel.setEnvironment(monteCarlo.generateEnvironment());

    const physics = new CompressorPhysics({
        faultProfile,
        faultAccelerator: 28 + Math.random() * 22,
        initialWear: Math.random() * 0.04,
        runningHours: 0,
        startStopCycles: Math.floor(Math.random() * 50)
    });

    const startDate = new Date(
        Date.now() - Math.floor(Math.random() * 365) * 86400000
    );

    // First pass: run the full lifecycle silently to find the failure hour
    // (or confirm the unit survives to MAX_HOURS), so we can compute RUL.
    const rows = [];
    let hour = 0;
    let failureHour = null;

    while (hour <= MAX_HOURS) {

        environmentModel.update(SAMPLE_INTERVAL_HOURS);
        environmentModel.evolve();
        const environment = environmentModel.getEnvironment();

        const telemetry = physics.update(environment, SAMPLE_INTERVAL_HOURS);
        const health = healthModel.calculateHealth(telemetry);

        const timestamp = new Date(
            startDate.getTime() + hour * 3600 * 1000
        ).toISOString();

        rows.push({ hour, timestamp, telemetry: { ...telemetry }, health });

        if (health.healthScore <= FAILURE_HEALTH_THRESHOLD && failureHour === null) {
            failureHour = hour;
            break; // stop this unit's lifecycle at failure
        }

        hour += SAMPLE_INTERVAL_HOURS;
    }

    const lastHour = rows.length ? rows[rows.length - 1].hour : 0;
    const horizon = failureHour !== null ? failureHour : lastHour;

    const groundTruthFault =
        faultProfile === CompressorPhysics.FAULT_TYPES.NONE
            ? "NONE"
            : faultProfile;

    return rows.map(r => {
        const rul = Math.max(0, Math.round((horizon - r.hour) * 100) / 100);
        return {
            unitId,
            timestamp: r.timestamp,
            runningHours: r.telemetry.runningHours,
            ambientTemperature: r.telemetry.ambientTemperature,
            airPressure: r.telemetry.airPressure,
            airflowRate: r.telemetry.airflowRate,
            buildUpTime: r.telemetry.buildUpTime,
            vibration: r.telemetry.vibration,
            motorCurrent: r.telemetry.motorCurrent,
            motorVoltage: r.telemetry.motorVoltage,
            motorTemperature: r.telemetry.motorTemperature,
            compressorSpeed: r.telemetry.compressorSpeed,
            oilPressure: r.telemetry.oilPressure,
            oilTemperature: r.telemetry.oilTemperature,
            compressorLoad: r.telemetry.compressorLoad,
            startStopCycles: r.telemetry.startStopCycles,
            healthScore: r.health.healthScore,
            healthStatus: r.health.healthStatus,
            failureProbability: r.health.failureProbability,
            // Ground-truth fault label = the wear channel this unit was
            // fated to fail from, once health has degraded enough for it
            // to be diagnostically apparent; otherwise NONE.
            faultType: r.health.healthScore < 80 ? groundTruthFault : "NONE",
            RUL_hours: rul,
            maintenanceRecommendation: r.health.maintenanceRecommendation
        };
    });
}

function main() {

    console.log(`Simulating ${NUM_UNITS} compressor units...`);
    console.log(`Sample interval: ${SAMPLE_INTERVAL_HOURS}h | Max horizon: ${MAX_HOURS}h`);

    const allRows = [];
    const faultCounts = {};

    for (let i = 1; i <= NUM_UNITS; i++) {
        const unitRows = simulateUnit(i);
        allRows.push(...unitRows);

        const finalFault = unitRows[unitRows.length - 1]?.faultType || "NONE";
        faultCounts[finalFault] = (faultCounts[finalFault] || 0) + 1;

        console.log(
            `  ${String(i).padStart(3, "0")}/${NUM_UNITS}  unit=COMP-${String(i).padStart(3, "0")}  ` +
            `rows=${unitRows.length}  finalHealth=${unitRows[unitRows.length - 1]?.healthScore}  ` +
            `fault=${finalFault}`
        );
    }

    const outputDir = path.join(__dirname, "..", "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // --- Write CSV ---
    const csvPath = path.join(outputDir, "air_compressor_dataset.csv");
    const lines = [COLUMNS.join(",")];
    for (const row of allRows) {
        lines.push(COLUMNS.map(c => csvEscape(row[c])).join(","));
    }
    fs.writeFileSync(csvPath, lines.join("\n"), "utf8");

    // --- Write JSON sample (first 20 rows) for quick inspection ---
    const jsonPath = path.join(outputDir, "air_compressor_dataset_sample.json");
    fs.writeFileSync(jsonPath, JSON.stringify(allRows.slice(0, 20), null, 2), "utf8");

    console.log("\n====================================");
    console.log(" Dataset generation complete");
    console.log("====================================");
    console.log(`Total rows        : ${allRows.length}`);
    console.log(`Units simulated    : ${NUM_UNITS}`);
    console.log(`Fault distribution : ${JSON.stringify(faultCounts, null, 2)}`);
    console.log(`CSV written to     : ${csvPath}`);
    console.log(`JSON sample written: ${jsonPath}`);
}

main();
