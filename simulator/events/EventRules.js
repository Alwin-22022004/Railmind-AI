class EventRules {

    static evaluate(simulationData) {

        const events = [];

        this.checkAirLeakage(simulationData, events);
        this.checkBearingFault(simulationData, events);
        this.checkOilDegradation(simulationData, events);
        this.checkMotorOverheating(simulationData, events);
        this.checkFilterClogging(simulationData, events);
        this.checkLowOverallHealth(simulationData, events);

        return events;
    }

    static checkAirLeakage(simulationData, events) {

        const { telemetry, health, assetState } = simulationData;

        if (
            telemetry.airPressure < 6.5 &&
            telemetry.buildUpTime > 45 &&
            health.sensorHealth.pressure < 60
        ) {
            events.push({
                eventType: "AIR_LEAKAGE_SUSPECTED",
                severity: "WARNING",
                assetState
            });
        }
    }

    static checkBearingFault(simulationData, events) {

        const { telemetry, health, assetState } = simulationData;

        if (
            telemetry.vibration > 7.0 &&
            health.sensorHealth.vibration < 55
        ) {
            events.push({
                eventType: "BEARING_WEAR_WARNING",
                severity: telemetry.vibration > 9.5 ? "CRITICAL" : "WARNING",
                assetState
            });
        }
    }

    static checkOilDegradation(simulationData, events) {

        const { telemetry, health, assetState } = simulationData;

        if (
            telemetry.oilPressure < 1.8 ||
            telemetry.oilTemperature > 105
        ) {
            events.push({
                eventType: "OIL_DEGRADATION_WARNING",
                severity: health.sensorHealth.oilPressure < 30 ? "CRITICAL" : "WARNING",
                assetState
            });
        }
    }

    static checkMotorOverheating(simulationData, events) {

        const { telemetry, health, assetState } = simulationData;

        if (
            telemetry.motorTemperature > 100 &&
            telemetry.motorCurrent > 26
        ) {
            events.push({
                eventType: "MOTOR_OVERHEATING_WARNING",
                severity: telemetry.motorTemperature > 118 ? "CRITICAL" : "WARNING",
                assetState
            });
        }
    }

    static checkFilterClogging(simulationData, events) {

        const { telemetry, health, assetState } = simulationData;

        if (
            telemetry.airflowRate < 350 &&
            telemetry.motorCurrent > 23 &&
            telemetry.airPressure > 7.0
        ) {
            events.push({
                eventType: "FILTER_CLOGGING_WARNING",
                severity: "WARNING",
                assetState
            });
        }
    }

    static checkLowOverallHealth(simulationData, events) {

        const { health, assetState } = simulationData;

        if (health.healthScore < 40) {
            events.push({
                eventType: "COMPRESSOR_HEALTH_CRITICAL",
                severity: "CRITICAL",
                assetState
            });
        }
    }

}

module.exports = EventRules;
