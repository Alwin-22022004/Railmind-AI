/**
 * CompressorPhysics
 *
 * Physics-informed digital twin model of a railway air compressor.
 *
 * Telemetry channels (matches the project abstract):
 *   airPressure        (bar)   - discharge / reservoir pressure
 *   airflowRate        (L/min) - delivered air volume
 *   buildUpTime        (s)     - time to build from cut-in to cut-out pressure
 *   vibration           (mm/s RMS) - overall vibration severity
 *   motorCurrent        (A)
 *   motorVoltage        (V)
 *   motorTemperature    (°C)
 *   compressorSpeed     (RPM)
 *   oilPressure         (bar)
 *   oilTemperature      (°C)
 *   runningHours        (h)     - cumulative
 *   compressorLoad      (%)     - duty cycle / loading
 *   startStopCycles     (count) - cumulative
 *   ambientTemperature  (°C)    - passthrough from environment
 *
 * Internal, non-published wear states (0 = new, 1 = failed) drive the
 * telemetry degradation and give each unit a distinct, physically
 * plausible failure signature:
 *
 *   leakWear    -> valve / piping air leakage      -> AIR_LEAKAGE
 *   bearingWear -> bearing / mechanical wear        -> BEARING_FAULT
 *   oilWear     -> oil degradation / low oil        -> OIL_DEGRADATION
 *   motorWear   -> motor winding / insulation wear  -> MOTOR_OVERHEATING
 *   filterWear  -> intake filter clogging           -> FILTER_CLOGGING
 */

const FAULT_TYPES = {
    NONE: "NONE",
    AIR_LEAKAGE: "AIR_LEAKAGE",
    BEARING_FAULT: "BEARING_FAULT",
    OIL_DEGRADATION: "OIL_DEGRADATION",
    MOTOR_OVERHEATING: "MOTOR_OVERHEATING",
    FILTER_CLOGGING: "FILTER_CLOGGING"
};

class CompressorPhysics {

    constructor(options = {}) {

        this.constants = {
            RATED_PRESSURE: 8.5,        // bar (cut-out)
            CUT_IN_PRESSURE: 7.0,       // bar
            RATED_AIRFLOW: 600,         // L/min free air delivery
            BASE_BUILDUP: 20,           // s
            RATED_RPM: 1450,            // 4-pole induction motor @ 50Hz
            RATED_VIBRATION: 2.0,       // mm/s RMS (new machine baseline)
            RATED_OIL_PRESSURE: 3.2,    // bar
            RATED_CURRENT: 20,          // A
            RATED_VOLTAGE: 415,         // V (3-phase)
            BASE_MOTOR_TEMP_RISE: 35,   // °C above ambient at rated load
            BASE_OIL_TEMP_RISE: 30      // °C above ambient at rated load
        };

        // Internal wear states (0 = new, 1 = failed)
        this.wear = {
            leakWear: options.initialWear ?? Math.random() * 0.03,
            bearingWear: options.initialWear ?? Math.random() * 0.03,
            oilWear: options.initialWear ?? Math.random() * 0.03,
            motorWear: options.initialWear ?? Math.random() * 0.03,
            filterWear: options.initialWear ?? Math.random() * 0.03
        };

        // Which wear channel (if any) this unit is fated to fail from,
        // and how much faster that channel degrades relative to baseline.
        this.faultProfile = options.faultProfile || FAULT_TYPES.NONE;
        this.faultAccelerator = options.faultAccelerator ?? 25;

        this.runningHours = options.runningHours ?? 0;
        this.startStopCycles = options.startStopCycles ?? 0;

        this._lastLoadBand = "LOW";

        this.telemetry = {
            airPressure: this.constants.RATED_PRESSURE,
            airflowRate: this.constants.RATED_AIRFLOW,
            buildUpTime: this.constants.BASE_BUILDUP,
            vibration: this.constants.RATED_VIBRATION,
            motorCurrent: this.constants.RATED_CURRENT,
            motorVoltage: this.constants.RATED_VOLTAGE,
            motorTemperature: 55,
            compressorSpeed: this.constants.RATED_RPM,
            oilPressure: this.constants.RATED_OIL_PRESSURE,
            oilTemperature: 55,
            runningHours: this.runningHours,
            compressorLoad: 45,
            startStopCycles: this.startStopCycles,
            ambientTemperature: 30
        };
    }

    round(value, decimals = 2) {
        const f = Math.pow(10, decimals);
        return Math.round(value * f) / f;
    }

    noise(magnitude) {
        return (Math.random() - 0.5) * 2 * magnitude;
    }

    /**
     * Base (non-faulted) wear accrual rate per hour, accelerated by
     * ambient heat and duty load. Every unit accrues some baseline
     * wear on every channel so "healthy" units still age realistically.
     */
    baseWearRate(channel, load, ambient) {
        const loadFactor = 0.6 + (load / 100) * 0.8;
        const thermalFactor = 1 + Math.max(0, (ambient - 30) * 0.015);

        const BASE_RATES = {
            leakWear: 0.0000045,
            bearingWear: 0.0000040,
            oilWear: 0.0000060,
            motorWear: 0.0000035,
            filterWear: 0.0000110
        };

        return BASE_RATES[channel] * loadFactor * thermalFactor;
    }

    updateWear(load, ambient, deltaHours) {

        for (const channel of Object.keys(this.wear)) {

            let rate = this.baseWearRate(channel, load, ambient);

            if (this._channelMatchesFault(channel)) {
                rate *= this.faultAccelerator;
            }

            // small stochastic component so no two units age identically
            rate *= (0.7 + Math.random() * 0.6);

            this.wear[channel] = Math.min(
                1,
                this.wear[channel] + rate * deltaHours
            );
        }
    }

    _channelMatchesFault(channel) {
        const map = {
            [FAULT_TYPES.AIR_LEAKAGE]: "leakWear",
            [FAULT_TYPES.BEARING_FAULT]: "bearingWear",
            [FAULT_TYPES.OIL_DEGRADATION]: "oilWear",
            [FAULT_TYPES.MOTOR_OVERHEATING]: "motorWear",
            [FAULT_TYPES.FILTER_CLOGGING]: "filterWear"
        };
        return map[this.faultProfile] === channel;
    }

    /**
     * Duty-cycle / load model: driven by the train's brake air demand.
     */
    calculateLoad(environment) {
        const demand = environment.brakeDemandLevel ?? 0.5;
        const load = 25 + demand * 75; // 25% idle-ish floor .. 100% peak
        return Math.max(15, Math.min(100, load + this.noise(4)));
    }

    updateStartStopCycles(load) {
        const band = load > 55 ? "HIGH" : "LOW";
        if (band === "HIGH" && this._lastLoadBand === "LOW") {
            this.startStopCycles += 1;
        }
        this._lastLoadBand = band;
    }

    update(environment, deltaHours = 1 / 3600) {

        const ambient = environment.ambientTemperature ?? 30;
        const voltageSupply = environment.supplyVoltage ?? this.constants.RATED_VOLTAGE;

        const load = this.calculateLoad(environment);
        this.updateStartStopCycles(load);
        this.updateWear(load, ambient, deltaHours);

        this.runningHours += deltaHours;

        const { leakWear, bearingWear, oilWear, motorWear, filterWear } = this.wear;

        // --- Air pressure & delivery ---
        let airPressure =
            this.constants.RATED_PRESSURE -
            leakWear * 3.6 +
            this.noise(0.08);

        airPressure = Math.max(1.5, Math.min(10.5, airPressure));

        let buildUpTime =
            this.constants.BASE_BUILDUP +
            leakWear * 70 +
            filterWear * 12 +
            this.noise(1.5);

        buildUpTime = Math.max(10, buildUpTime);

        let airflowRate =
            this.constants.RATED_AIRFLOW *
            (1 - leakWear * 0.55) *
            (1 - filterWear * 0.78) +
            this.noise(8);

        airflowRate = Math.max(40, Math.min(this.constants.RATED_AIRFLOW * 1.05, airflowRate));

        // --- Mechanical / vibration ---
        let compressorSpeed =
            this.constants.RATED_RPM *
            (1 - bearingWear * 0.07 - motorWear * 0.04) +
            this.noise(6);

        let vibration =
            this.constants.RATED_VIBRATION +
            bearingWear * 10.5 +
            (load / 100) * 1.2 +
            this.noise(0.2);

        vibration = Math.max(0.4, vibration);

        // --- Oil system ---
        let oilPressure =
            this.constants.RATED_OIL_PRESSURE -
            oilWear * 2.6 -
            bearingWear * 0.3 +
            this.noise(0.06);

        oilPressure = Math.max(0.1, oilPressure);

        let oilTemperature =
            ambient +
            this.constants.BASE_OIL_TEMP_RISE * (0.5 + load / 200) +
            oilWear * 48 +
            this.noise(1.0);

        // --- Electrical / motor ---
        let motorCurrent =
            this.constants.RATED_CURRENT *
            (0.45 + (load / 100) * 0.75) *
            (1 + motorWear * 0.55 + bearingWear * 0.25 + filterWear * 0.45) +
            this.noise(0.4);

        motorCurrent = Math.max(2, motorCurrent);

        let motorVoltage =
            voltageSupply -
            motorWear * 9 +
            this.noise(1.2);

        let motorTemperature =
            ambient +
            this.constants.BASE_MOTOR_TEMP_RISE * (0.5 + load / 200) +
            motorWear * 55 +
            (motorCurrent - this.constants.RATED_CURRENT) * 1.1 +
            this.noise(1.2);

        // --- publish ---
        this.telemetry.airPressure = this.round(airPressure);
        this.telemetry.airflowRate = this.round(airflowRate, 1);
        this.telemetry.buildUpTime = this.round(buildUpTime, 1);
        this.telemetry.vibration = this.round(vibration);
        this.telemetry.compressorSpeed = this.round(compressorSpeed, 0);
        this.telemetry.oilPressure = this.round(oilPressure);
        this.telemetry.oilTemperature = this.round(oilTemperature);
        this.telemetry.motorCurrent = this.round(motorCurrent);
        this.telemetry.motorVoltage = this.round(motorVoltage, 1);
        this.telemetry.motorTemperature = this.round(motorTemperature);
        this.telemetry.runningHours = this.round(this.runningHours, 2);
        this.telemetry.compressorLoad = this.round(load);
        this.telemetry.startStopCycles = this.startStopCycles;
        this.telemetry.ambientTemperature = this.round(ambient);

        return this.telemetry;
    }

    getTelemetry() {
        return { ...this.telemetry };
    }

    getWearState() {
        return { ...this.wear };
    }
}

CompressorPhysics.FAULT_TYPES = FAULT_TYPES;

module.exports = CompressorPhysics;
