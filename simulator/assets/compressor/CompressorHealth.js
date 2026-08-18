class CompressorHealth {

    normalizeHigherIsWorse(value, normal, failure) {
        if (value <= normal) return 100;
        if (value >= failure) return 0;
        return 100 - ((value - normal) / (failure - normal)) * 100;
    }

    normalizeLowerIsWorse(value, normal, failure) {
        if (value >= normal) return 100;
        if (value <= failure) return 0;
        return ((value - failure) / (normal - failure)) * 100;
    }

    calculateHealth(telemetry) {

        const pressureHealth = this.normalizeLowerIsWorse(
            telemetry.airPressure, 8.0, 5.0
        );

        const airflowHealth = this.normalizeLowerIsWorse(
            telemetry.airflowRate, 480, 130
        );

        const buildUpHealth = this.normalizeHigherIsWorse(
            telemetry.buildUpTime, 30, 90
        );

        const vibrationHealth = this.normalizeHigherIsWorse(
            telemetry.vibration, 4.5, 11.0
        );

        const oilPressureHealth = this.normalizeLowerIsWorse(
            telemetry.oilPressure, 2.4, 0.8
        );

        const oilTemperatureHealth = this.normalizeHigherIsWorse(
            telemetry.oilTemperature, 90, 130
        );

        const motorTempHealth = this.normalizeHigherIsWorse(
            telemetry.motorTemperature, 85, 125
        );

        const motorCurrentHealth = this.normalizeHigherIsWorse(
            telemetry.motorCurrent, 25, 34
        );

        const weightedAverage =
            pressureHealth * 0.16 +
            airflowHealth * 0.10 +
            buildUpHealth * 0.06 +
            vibrationHealth * 0.18 +
            oilPressureHealth * 0.12 +
            oilTemperatureHealth * 0.10 +
            motorTempHealth * 0.16 +
            motorCurrentHealth * 0.12;

        const minSensorScore = Math.min(
            pressureHealth, airflowHealth, buildUpHealth, vibrationHealth,
            oilPressureHealth, oilTemperatureHealth, motorTempHealth, motorCurrentHealth
        );

        // Blend: a single severely degraded channel should be able to
        // drive overall health down on its own, not just get averaged
        // away by seven healthy channels - this mirrors how a real
        // asset-health index treats a dominant fault.
        const healthScore = Math.round(
            weightedAverage * 0.30 + minSensorScore * 0.70
        );

        let healthStatus;

        if (healthScore >= 90) healthStatus = "HEALTHY";
        else if (healthScore >= 75) healthStatus = "GOOD";
        else if (healthScore >= 60) healthStatus = "WARNING";
        else if (healthScore >= 40) healthStatus = "MAINTENANCE_REQUIRED";
        else healthStatus = "CRITICAL";

        // Failure probability: smooth logistic curve centred on healthScore = 50
        const failureProbability = this.round(
            1 / (1 + Math.exp((healthScore - 48) / 9))
        );

        const sensorHealth = {
            pressure: Math.round(pressureHealth),
            airflow: Math.round(airflowHealth),
            buildUp: Math.round(buildUpHealth),
            vibration: Math.round(vibrationHealth),
            oilPressure: Math.round(oilPressureHealth),
            oilTemperature: Math.round(oilTemperatureHealth),
            motorTemperature: Math.round(motorTempHealth),
            motorCurrent: Math.round(motorCurrentHealth)
        };

        return {
            healthScore,
            healthStatus,
            failureProbability,
            sensorHealth,
            maintenanceRecommendation: this.recommend(healthStatus, sensorHealth)
        };
    }

    round(value, decimals = 3) {
        const f = Math.pow(10, decimals);
        return Math.round(value * f) / f;
    }

    /**
     * Rule-based maintenance recommendation, driven by whichever
     * sensor sub-score is currently the weakest.
     */
    recommend(healthStatus, sensorHealth) {

        if (healthStatus === "HEALTHY") {
            return "No action required. Continue routine inspection schedule.";
        }

        const weakest = Object.entries(sensorHealth)
            .sort((a, b) => a[1] - b[1])[0][0];

        const suggestions = {
            pressure: "Inspect discharge valves and piping for leakage; check pressure regulator.",
            airflow: "Check for leaks or intake restriction; verify airflow against rated capacity.",
            buildUp: "Inspect valves and check for internal/external leakage causing slow pressure build-up.",
            vibration: "Inspect bearings, mounts, and shaft alignment; schedule vibration analysis.",
            oilPressure: "Check oil level and quality; inspect oil pump and filter.",
            oilTemperature: "Check oil cooler and oil quality; verify ambient cooling airflow.",
            motorTemperature: "Inspect motor cooling, winding insulation, and ventilation; check for overload.",
            motorCurrent: "Check for mechanical overload, bearing drag, or winding degradation."
        };

        const urgency =
            healthStatus === "CRITICAL" ? "Immediate maintenance required. " :
            healthStatus === "MAINTENANCE_REQUIRED" ? "Schedule maintenance soon. " :
            "Monitor closely. ";

        return urgency + (suggestions[weakest] || "Perform general diagnostic inspection.");
    }
}

module.exports = CompressorHealth;
